/**
 * Production API encryption: Oblivious HTTP (RFC 9458), the browser half of the backend
 * `oblivious` middleware. This file is identical in every One product; each product only
 * calls `createApiFetch`.
 *
 * The page fetches the gateway key configuration once (`GET /api/ohttp`,
 * `application/ohttp-keys`). Every API call is then encoded as a Binary HTTP request
 * (RFC 9292), sealed with HPKE (RFC 9180: DHKEM(P-256, HKDF-SHA256), HKDF-SHA256,
 * AES-128-GCM) and posted to `POST /api/ohttp`; the reply is the whole inner response
 * (status, headers, body), sealed to that one request. Each request carries `Date` for
 * the gateway's anti-replay window. A `date` problem corrects the clock offset and an
 * `ohttp-key` problem refetches the key; each is retried once, as neither ran the request.
 */
import {
  Aes128Gcm,
  CipherSuite,
  DhkemP256HkdfSha256,
  HkdfSha256,
} from "@hpke/core"

const GATEWAY = "/api/ohttp"
const KEYS_TYPE = "application/ohttp-keys"
const REQUEST_TYPE = "message/ohttp-req"
const RESPONSE_TYPE = "message/ohttp-res"
const KEY_PROBLEM = "https://iana.org/assignments/http-problem-types#ohttp-key"
const DATE_PROBLEM = "https://iana.org/assignments/http-problem-types#date"
const KEM_P256 = 0x0010
const KDF_SHA256 = 0x0001
const AEAD_AES128GCM = 0x0001
const P256_POINT = 65
const AES128_KEY = 16
const GCM_NONCE = 12
/** max(Nn, Nk), the response nonce and exported secret length (RFC 9458 §4.4). */
const RESPONSE_NONCE = Math.max(AES128_KEY, GCM_NONCE)
const NULL_BODY = new Set([101, 103, 204, 205, 304])
const encoder = new TextEncoder()
const suite = new CipherSuite({
  kem: new DhkemP256HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes128Gcm(),
})

type Key = { header: Uint8Array; publicKey: CryptoKey }
type Field = [name: string, value: string]
type InnerResponse = {
  status: number
  fields: Field[]
  content: Uint8Array<ArrayBuffer>
}

export type ApiFetchOptions = {
  /** Encrypt at all; products pass `import.meta.env.MODE === "production"`. */
  enabled: boolean
  /** Paths that never travel encapsulated; must match the backend `Gateway::plain`. */
  plain: (pathname: string) => boolean
  /** Resolve logical API paths when the API is hosted on another origin. */
  endpoint?: (path: string) => string
  /** Cookie policy for the API origin; defaults to same-origin. */
  credentials?: RequestCredentials
}

export class ObliviousError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Oblivious HTTP ${status}`)
    this.status = status
  }
}

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0))
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}

/** QUIC variable-length integer (RFC 9000 §16), as Binary HTTP uses. */
function varint(n: number) {
  if (n < 0x40) return Uint8Array.of(n)
  if (n < 0x4000) return Uint8Array.of(0x40 | (n >> 8), n & 0xff)
  if (n < 0x40000000)
    return Uint8Array.of(
      0x80 | (n >>> 24),
      (n >> 16) & 0xff,
      (n >> 8) & 0xff,
      n & 0xff,
    )
  throw new RangeError("Binary HTTP length too large")
}

function prefixed(bytes: Uint8Array) {
  return concat(varint(bytes.length), bytes)
}

function text(value: string) {
  return prefixed(encoder.encode(value))
}

/** A known-length Binary HTTP request (RFC 9292 §3). */
export function encodeRequest(
  method: string,
  authority: string,
  path: string,
  fields: Field[],
  content: Uint8Array,
) {
  const section = concat(
    ...fields.flatMap(([name, value]) => [
      text(name.toLowerCase()),
      text(value),
    ]),
  )
  return concat(
    varint(0),
    text(method),
    text("https"),
    text(authority),
    text(path),
    prefixed(section),
    prefixed(content),
    varint(0),
  )
}

class Reader {
  private offset = 0
  private readonly bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  get done() {
    return this.offset >= this.bytes.length
  }
  varint() {
    const first = this.take(1)[0]
    const length = 1 << (first >> 6)
    let value = first & 0x3f
    for (const byte of this.take(length - 1)) value = value * 256 + byte
    return value
  }
  take(length: number) {
    if (this.offset + length > this.bytes.length) throw new ObliviousError(502)
    const out = this.bytes.subarray(this.offset, this.offset + length)
    this.offset += length
    return out
  }
  vector() {
    return this.take(this.varint())
  }
}

/** A known-length Binary HTTP response; informational responses are skipped. */
export function decodeResponse(bytes: Uint8Array): InnerResponse {
  const decoder = new TextDecoder()
  const reader = new Reader(bytes)
  if (reader.varint() !== 1) throw new ObliviousError(502)
  for (;;) {
    const status = reader.varint()
    const fields: Field[] = []
    const section = new Reader(reader.vector())
    while (!section.done)
      fields.push([
        decoder.decode(section.vector()),
        decoder.decode(section.vector()),
      ])
    if (status >= 200) {
      // Binary HTTP allows truncating trailing empty sections.
      const content = reader.done ? new Uint8Array() : reader.vector().slice()
      return { status, fields, content }
    }
  }
}

function u16(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1]
}

/**
 * Picks the first P-256 / HKDF-SHA256 / AES-128-GCM key from `application/ohttp-keys`
 * (RFC 9458 §3); a list with any encoding error is discarded as a whole.
 */
export function selectKey(list: Uint8Array) {
  let found: { keyId: number; publicKey: Uint8Array } | undefined
  for (let offset = 0; offset < list.length;) {
    if (offset + 2 > list.length) throw new ObliviousError(502)
    const end = offset + 2 + u16(list, offset)
    if (end > list.length || end - offset < 5) throw new ObliviousError(502)
    const config = list.subarray(offset + 2, end)
    offset = end
    if (u16(config, 1) !== KEM_P256) continue
    const suites = 3 + P256_POINT
    if (config.length < suites + 2) throw new ObliviousError(502)
    const length = u16(config, suites)
    if (length % 4 || suites + 2 + length !== config.length)
      throw new ObliviousError(502)
    for (let i = suites + 2; i < config.length; i += 4) {
      if (
        !found &&
        u16(config, i) === KDF_SHA256 &&
        u16(config, i + 2) === AEAD_AES128GCM
      )
        found = {
          keyId: config[0],
          publicKey: config.subarray(3, suites),
        }
    }
  }
  if (!found) throw new ObliviousError(502)
  return found
}

async function fetchKey(
  endpoint: (path: string) => string,
  credentials: RequestCredentials,
): Promise<Key> {
  const response = await fetch(endpoint(GATEWAY), {
    credentials,
    headers: { Accept: KEYS_TYPE },
  })
  if (!response.ok) throw new ObliviousError(response.status)
  if (!response.headers.get("Content-Type")?.startsWith(KEYS_TYPE))
    throw new ObliviousError(502)
  const { keyId, publicKey } = selectKey(
    new Uint8Array(await response.arrayBuffer()),
  )
  return {
    header: Uint8Array.of(
      keyId,
      KEM_P256 >> 8,
      KEM_P256 & 0xff,
      KDF_SHA256 >> 8,
      KDF_SHA256 & 0xff,
      AEAD_AES128GCM >> 8,
      AEAD_AES128GCM & 0xff,
    ),
    publicKey: await suite.kem.deserializePublicKey(publicKey),
  }
}

/**
 * Seals one Binary HTTP request (RFC 9458 §4.3) and returns the Encapsulated Request
 * with the function that opens its Encapsulated Response (§4.4).
 */
export async function encapsulate(key: Key, request: Uint8Array) {
  const info = concat(
    encoder.encode("message/bhttp request"),
    Uint8Array.of(0),
    key.header,
  )
  const sender = await suite.createSenderContext({
    recipientPublicKey: key.publicKey,
    info,
  })
  const enc = new Uint8Array(sender.enc)
  const sealed = concat(
    key.header,
    enc,
    new Uint8Array(await sender.seal(request)),
  )
  const secret = await sender.export(
    encoder.encode("message/bhttp response"),
    RESPONSE_NONCE,
  )
  async function open(response: Uint8Array) {
    if (response.length <= RESPONSE_NONCE) throw new ObliviousError(502)
    const salt = concat(enc, response.subarray(0, RESPONSE_NONCE))
    const prk = await crypto.subtle.importKey("raw", secret, "HKDF", false, [
      "deriveBits",
    ])
    const expand = (label: string, length: number) =>
      crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", salt, info: encoder.encode(label) },
        prk,
        length * 8,
      )
    const aead = await crypto.subtle.importKey(
      "raw",
      await expand("key", AES128_KEY),
      "AES-GCM",
      false,
      ["decrypt"],
    )
    const opened = await crypto.subtle
      .decrypt(
        { name: "AES-GCM", iv: await expand("nonce", GCM_NONCE) },
        aead,
        response.slice(RESPONSE_NONCE),
      )
      .catch(() => {
        throw new ObliviousError(502)
      })
    return new Uint8Array(opened)
  }
  return { sealed, open }
}

async function problemType(response: Response) {
  if (
    response.status !== 400 ||
    !response.headers
      .get("Content-Type")
      ?.startsWith("application/problem+json")
  )
    return undefined
  try {
    return ((await response.clone().json()) as { type?: string }).type
  } catch {
    return undefined
  }
}

/**
 * Returns the product's `fetch` for logical `/api/*` paths. Plain paths, Bearer calls,
 * anything outside `/api/`, and every path when disabled use `fetch`; the rest go
 * through the gateway and come back as a plain `Response` with the inner status and
 * headers. Gateway refusals pass through as is.
 */
export function createApiFetch({
  enabled,
  plain,
  endpoint = (path) => path,
  credentials = "same-origin",
}: ApiFetchOptions) {
  let key: Promise<Key> | undefined
  /** Gateway clock minus ours, learnt from a `date` problem. */
  let offset = 0

  /** The shared key; `stale` replaces it only if no other call already did. */
  function current(stale?: Promise<Key>) {
    if (!key || key === stale) {
      const next = fetchKey(endpoint, credentials).catch((error: unknown) => {
        if (key === next) key = undefined
        throw error
      })
      key = next
    }
    return key
  }

  async function obliviousFetch(path: string, init: RequestInit) {
    // `Request` normalises the method, headers and any body type, as `fetch` would.
    const request = new Request(new URL(path, "https://gateway.invalid"), {
      method: init.method,
      headers: init.headers,
      body: init.body,
    })
    const content = new Uint8Array(await request.arrayBuffer())
    const fields: Field[] = [...request.headers]
    const authority = globalThis.location?.host ?? ""
    let keyRetried = false
    let dateRetried = false
    for (;;) {
      const used = current()
      const date = new Date(Date.now() + offset).toUTCString()
      const { sealed, open } = await encapsulate(
        await used,
        encodeRequest(
          request.method,
          authority,
          path,
          [...fields, ["date", date]],
          content,
        ),
      )
      const response = await fetch(endpoint(GATEWAY), {
        method: "POST",
        credentials,
        cache: "no-store",
        signal: init.signal,
        headers: { "Content-Type": REQUEST_TYPE },
        body: sealed,
      })
      if (!response.headers.get("Content-Type")?.startsWith(RESPONSE_TYPE)) {
        if (!keyRetried && (await problemType(response)) === KEY_PROBLEM) {
          keyRetried = true
          current(used)
          continue
        }
        return response
      }
      const inner = decodeResponse(
        await open(new Uint8Array(await response.arrayBuffer())),
      )
      const headers = new Headers(inner.fields)
      if (
        !dateRetried &&
        inner.status === 400 &&
        headers.get("Content-Type")?.startsWith("application/problem+json")
      ) {
        const problem = JSON.parse(new TextDecoder().decode(inner.content)) as {
          type?: string
        }
        const gatewayDate = Date.parse(headers.get("Date") ?? "")
        if (problem.type === DATE_PROBLEM && !Number.isNaN(gatewayDate)) {
          dateRetried = true
          offset = gatewayDate - Date.now()
          continue
        }
      }
      return new Response(NULL_BODY.has(inner.status) ? null : inner.content, {
        status: inner.status,
        headers,
      })
    }
  }

  return async function apiFetch(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    // Bearer calls (desktop sessions, application keys) skip the gateway, as on the backend.
    if (
      !enabled ||
      !path.startsWith("/api/") ||
      plain(path.split("?")[0]) ||
      new Headers(init.headers).has("Authorization")
    )
      return fetch(path.startsWith("/api/") ? endpoint(path) : path, {
        credentials,
        cache: "no-store",
        ...init,
      })
    return obliviousFetch(path, init).catch((error: unknown) => {
      if (!(error instanceof ObliviousError)) throw error
      return new Response(null, { status: error.status })
    })
  }
}
