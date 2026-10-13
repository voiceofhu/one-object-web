/**
 * Production API encryption, the browser half of the backend `sealed` middleware. This
 * file is identical in every One product; each product only calls `createApiFetch`.
 *
 * On first use the page makes an ephemeral P-256 key pair, posts the public point to
 * `/api/sealed/handshake`, and derives AES-256-GCM from ECDH + HKDF-SHA256 (salt =
 * client point ‖ server point, info = the product's `info`), so the key never crosses
 * the wire. Every API call is then a `POST /api/sealed` carrying
 * `nonce ‖ AES-GCM({m, p, t, b})` with the key id as associated data; the reply is
 * sealed with the request nonce as associated data. The key lives only in memory.
 */
const CONTENT_TYPE = "application/vnd.one.sealed"
const encoder = new TextEncoder()
const NONCE_LEN = 12

type Channel = { keyId: string; key: CryptoKey; offset: number }
type Welcome = { key_id: string; public_key: string; server_time: number }

export type ApiFetchOptions = {
  /** Encrypt at all; products pass `import.meta.env.MODE === "production"`. */
  enabled: boolean
  /** HKDF info; must equal the backend `Sealed::info`. */
  info: string
  /** Paths that never carry an envelope; must match the backend `Sealed::plain`. */
  plain: (pathname: string) => boolean
}

export class SealedError extends Error {
  readonly status: number
  constructor(status: number) {
    super(`Sealed API ${status}`)
    this.status = status
  }
}

function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
}

function decode(base64url: string) {
  const text = atob(base64url.replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(text, (c) => c.charCodeAt(0))
}

function concat(a: Uint8Array, b: Uint8Array) {
  const out = new Uint8Array(a.length + b.length)
  out.set(a)
  out.set(b, a.length)
  return out
}

async function handshake(info: string): Promise<Channel> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveBits"],
  )
  const client = new Uint8Array(
    await crypto.subtle.exportKey("raw", pair.publicKey),
  )
  const response = await fetch("/api/sealed/handshake", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ public_key: encode(client) }),
  })
  if (!response.ok) throw new SealedError(response.status)
  const welcome = (await response.json()) as Welcome
  const server = decode(welcome.public_key)
  const serverKey = await crypto.subtle.importKey(
    "raw",
    server,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  )
  const shared = await crypto.subtle.deriveBits(
    { name: "ECDH", public: serverKey },
    pair.privateKey,
    256,
  )
  const hkdf = await crypto.subtle.importKey("raw", shared, "HKDF", false, [
    "deriveKey",
  ])
  const key = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: concat(client, server),
      info: encoder.encode(info),
    },
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  )
  // Envelopes carry server time so a wrong device clock does not break requests.
  return {
    keyId: welcome.key_id,
    key,
    offset: welcome.server_time - Date.now(),
  }
}

async function keyInvalid(response: Response) {
  if (response.status !== 401) return false
  try {
    return (await response.clone().json()).code === "sealed_key_invalid"
  } catch {
    return false
  }
}

/**
 * Returns the product's `fetch` for same-origin `/api/*` paths. Plain paths, Bearer
 * calls, anything outside `/api/`, and every path when disabled use `fetch`; the rest go through the encrypted tunnel and come
 * back as a plain JSON `Response` with the inner status. Gateway refusals pass through
 * as is; an unknown or expired key renews the channel and retries once.
 */
export function createApiFetch({ enabled, info, plain }: ApiFetchOptions) {
  let channel: Promise<Channel> | undefined

  /** The shared channel; `stale` replaces it only if no other call already did. */
  function current(stale?: Promise<Channel>) {
    if (!channel || channel === stale) {
      const next = handshake(info).catch((error: unknown) => {
        if (channel === next) channel = undefined
        throw error
      })
      channel = next
    }
    return channel
  }

  async function sealedFetch(path: string, init: RequestInit) {
    if (init.body != null && typeof init.body !== "string")
      throw new TypeError("Sealed API bodies must be JSON strings")
    for (let attempt = 0; ; attempt++) {
      const used = current()
      const { keyId, key, offset } = await used
      const envelope = {
        m: (init.method ?? "GET").toUpperCase(),
        p: path,
        t: Date.now() + offset,
        b: init.body ?? null,
      }
      const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LEN))
      const sealed = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: nonce, additionalData: encoder.encode(keyId) },
        key,
        encoder.encode(JSON.stringify(envelope)),
      )
      // Caller headers (Accept, Idempotency-Key, …) ride on the outer request; the
      // gateway keeps them for the inner one and sets the JSON content type itself.
      const headers = new Headers(init.headers)
      headers.set("Content-Type", CONTENT_TYPE)
      headers.set("X-Sealed-Key", keyId)
      const response = await fetch("/api/sealed", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        signal: init.signal,
        headers,
        body: concat(nonce, new Uint8Array(sealed)),
      })
      if (attempt === 0 && (await keyInvalid(response))) {
        current(used)
        continue
      }
      if (!response.headers.get("Content-Type")?.startsWith(CONTENT_TYPE))
        return response
      const bytes = new Uint8Array(await response.arrayBuffer())
      const opened = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: bytes.slice(0, NONCE_LEN),
          additionalData: nonce,
        },
        key,
        bytes.slice(NONCE_LEN),
      )
      return new Response(opened, {
        status: response.status,
        statusText: response.statusText,
        headers: { "Content-Type": "application/json" },
      })
    }
  }

  return async function apiFetch(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    // Bearer calls (desktop sessions, application keys) skip the tunnel, as on the backend.
    if (
      !enabled ||
      !path.startsWith("/api/") ||
      plain(path.split("?")[0]) ||
      new Headers(init.headers).has("Authorization")
    )
      return fetch(path, {
        credentials: "same-origin",
        cache: "no-store",
        ...init,
      })
    return sealedFetch(path, init).catch((error: unknown) => {
      if (!(error instanceof SealedError)) throw error
      return new Response(null, { status: error.status })
    })
  }
}
