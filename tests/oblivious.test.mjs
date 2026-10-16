import {
  Aes128Gcm,
  CipherSuite,
  DhkemP256HkdfSha256,
  HkdfSha256,
} from "@hpke/core"
import assert from "node:assert/strict"
import { createApiFetch, selectKey } from "../src/lib/oblivious.ts"

// Runs under both `node --test` and Vitest, whichever the product uses.
const { afterEach, test } = process.env.VITEST
  ? await import("vitest")
  : await import("node:test")

const { subtle } = globalThis.crypto
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const suite = new CipherSuite({
  kem: new DhkemP256HkdfSha256(),
  kdf: new HkdfSha256(),
  aead: new Aes128Gcm(),
})
const DATE_PROBLEM = "https://iana.org/assignments/http-problem-types#date"
const KEY_PROBLEM = "https://iana.org/assignments/http-problem-types#ohttp-key"
const options = {
  enabled: true,
  plain: (pathname) => pathname === "/api/plain",
}

// An independent Binary HTTP codec (RFC 9292) for the gateway side.
function varint(n) {
  if (n < 0x40) return [n]
  if (n < 0x4000) return [0x40 | (n >> 8), n & 0xff]
  return [0x80 | (n >>> 24), (n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}
const vec = (bytes) => [...varint(bytes.length), ...bytes]
function reader(bytes) {
  let at = 0
  const r = {
    done: () => at >= bytes.length,
    int() {
      const len = 1 << (bytes[at] >> 6)
      let v = bytes[at++] & 0x3f
      for (let i = 1; i < len; i++) v = v * 256 + bytes[at++]
      return v
    },
    vec() {
      const len = r.int()
      at += len
      return bytes.subarray(at - len, at)
    },
  }
  return r
}
function decodeRequest(bytes) {
  const r = reader(bytes)
  assert.equal(r.int(), 0)
  const [method, scheme, authority, path] = [0, 1, 2, 3].map(() =>
    decoder.decode(r.vec()),
  )
  const fields = reader(r.vec())
  const headers = new Headers()
  while (!fields.done())
    headers.append(decoder.decode(fields.vec()), decoder.decode(fields.vec()))
  return { method, scheme, authority, path, headers, body: r.vec() }
}
function encodeResponse(status, headers, body) {
  const fields = Object.entries(headers).flatMap(([n, v]) => [
    ...vec(encoder.encode(n)),
    ...vec(encoder.encode(v)),
  ])
  return Uint8Array.from([
    1,
    // An informational response the client must skip.
    ...varint(103),
    ...vec(vec(encoder.encode("link")).concat(vec(encoder.encode("</a>")))),
    ...varint(status),
    ...vec(fields),
    ...vec(body),
    0,
  ])
}

async function keyPair(keyId) {
  const pair = await suite.kem.generateKeyPair()
  const point = new Uint8Array(
    await suite.kem.serializePublicKey(pair.publicKey),
  )
  const config = [
    keyId,
    0x00,
    0x10,
    ...point,
    0x00,
    0x04,
    0x00,
    0x01,
    0x00,
    0x01,
  ]
  return { keyId, pair, list: Uint8Array.from([0, config.length, ...config]) }
}

/** Plays the backend gateway: key configuration, decapsulation and sealed replies. */
async function gateway({ clockSkew = 0, staleFirst = false, reply } = {}) {
  let key = await keyPair(1)
  const seen = { keyFetches: 0, requests: [], direct: [], outer: [] }
  let stale = staleFirst
  globalThis.fetch = async (url, init = {}) => {
    if (url !== "/api/ohttp") {
      seen.direct.push({ url, init })
      return Response.json({ direct: url })
    }
    if (!init.method || init.method === "GET") {
      seen.keyFetches++
      if (stale && seen.keyFetches > 1) key = await keyPair(2)
      return new Response(key.list, {
        headers: { "Content-Type": "application/ohttp-keys" },
      })
    }
    seen.outer.push(init)
    assert.equal(init.method, "POST")
    assert.equal(init.headers["Content-Type"], "message/ohttp-req")
    const body = init.body
    if (stale) {
      stale = false
      return Response.json(
        { type: KEY_PROBLEM, title: "key configuration unknown" },
        {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        },
      )
    }
    assert.equal(body[0], key.keyId)
    const header = body.subarray(0, 7)
    const enc = body.subarray(7, 72)
    const recipient = await suite.createRecipientContext({
      recipientKey: key.pair.privateKey,
      enc,
      info: new Uint8Array([
        ...encoder.encode("message/bhttp request"),
        0,
        ...header,
      ]),
    })
    const request = decodeRequest(
      new Uint8Array(await recipient.open(body.subarray(72))),
    )
    seen.requests.push(request)
    const date = Date.parse(request.headers.get("date"))
    const now = Date.now() + clockSkew
    const [status, headers, payload] =
      Math.abs(date - now) > 120_000
        ? [
            400,
            {
              "content-type": "application/problem+json",
              date: new Date(now).toUTCString(),
            },
            { type: DATE_PROBLEM },
          ]
        : (reply?.(request) ?? [
            200,
            { "content-type": "application/json" },
            { ok: request.path },
          ])
    const plain = encodeResponse(
      status,
      headers,
      payload === null
        ? new Uint8Array()
        : encoder.encode(JSON.stringify(payload)),
    )
    const secret = await recipient.export(
      encoder.encode("message/bhttp response"),
      16,
    )
    const nonce = globalThis.crypto.getRandomValues(new Uint8Array(16))
    const prk = await subtle.importKey("raw", secret, "HKDF", false, [
      "deriveBits",
    ])
    const expand = (label, length) =>
      subtle.deriveBits(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new Uint8Array([...enc, ...nonce]),
          info: encoder.encode(label),
        },
        prk,
        length * 8,
      )
    const aead = await subtle.importKey(
      "raw",
      await expand("key", 16),
      "AES-GCM",
      false,
      ["encrypt"],
    )
    const sealed = await subtle.encrypt(
      { name: "AES-GCM", iv: await expand("nonce", 12) },
      aead,
      plain,
    )
    return new Response(new Uint8Array([...nonce, ...new Uint8Array(sealed)]), {
      headers: { "Content-Type": "message/ohttp-res" },
    })
  }
  return seen
}

afterEach(() => {
  delete globalThis.fetch
})

test("concurrent calls share one key and carry method, path, headers, body and Date", async () => {
  const apiFetch = createApiFetch(options)
  const seen = await gateway()
  const [list, saved] = await Promise.all([
    apiFetch("/api/admin/users?page=1&q=a+b"),
    apiFetch("/api/admin/users/7", {
      method: "put",
      body: JSON.stringify({ name: "x" }),
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "op-1",
      },
    }),
  ])
  assert.equal(seen.keyFetches, 1)
  assert.deepEqual(await list.json(), { ok: "/api/admin/users?page=1&q=a+b" })
  assert.equal(saved.headers.get("Content-Type"), "application/json")
  const get = seen.requests.find((r) => r.method === "GET")
  const put = seen.requests.find((r) => r.method === "PUT")
  assert.equal(get.scheme, "https")
  assert.equal(get.body.length, 0)
  assert.equal(put.path, "/api/admin/users/7")
  assert.equal(decoder.decode(put.body), '{"name":"x"}')
  assert.equal(put.headers.get("content-type"), "application/json")
  assert.equal(put.headers.get("idempotency-key"), "op-1")
  assert.ok(Math.abs(Date.parse(put.headers.get("date")) - Date.now()) < 5_000)
  // Nothing but the encapsulated body travels on the outer request.
  assert.deepEqual(Object.keys(seen.outer[0].headers), ["Content-Type"])
})

test("inner statuses and headers survive and empty replies stay empty", async () => {
  const apiFetch = createApiFetch(options)
  await gateway({
    reply: (request) =>
      request.method === "DELETE"
        ? [204, {}, null]
        : [
            401,
            { "content-type": "application/problem+json" },
            { code: "unauthenticated" },
          ],
  })
  const denied = await apiFetch("/api/auth/me")
  assert.equal(denied.status, 401)
  assert.equal(denied.headers.get("Content-Type"), "application/problem+json")
  assert.deepEqual(await denied.json(), { code: "unauthenticated" })
  const removed = await apiFetch("/api/admin/roles/3", { method: "DELETE" })
  assert.equal(removed.status, 204)
  assert.equal(await removed.text(), "")
})

test("a date problem corrects the clock and retries once", async () => {
  const apiFetch = createApiFetch(options)
  const seen = await gateway({ clockSkew: 3_600_000 })
  const first = await apiFetch("/api/admin/menu", {
    method: "POST",
    body: "{}",
  })
  assert.equal(first.status, 200)
  assert.equal(seen.requests.length, 2)
  await apiFetch("/api/admin/menu")
  assert.equal(seen.requests.length, 3)
  const date = Date.parse(seen.requests[2].headers.get("date"))
  assert.ok(Math.abs(date - (Date.now() + 3_600_000)) < 5_000)
})

test("an ohttp-key problem refetches the key once and retries the same call", async () => {
  const apiFetch = createApiFetch(options)
  const seen = await gateway({ staleFirst: true })
  const response = await apiFetch("/api/admin/menu")
  assert.equal(response.status, 200)
  assert.equal(seen.keyFetches, 2)
  assert.equal(seen.requests.length, 1)
})

test("any fetch body type is encoded with its content type", async () => {
  const apiFetch = createApiFetch(options)
  const seen = await gateway()
  await apiFetch("/api/x", {
    method: "POST",
    body: new URLSearchParams({ a: "1" }),
  })
  await apiFetch("/api/y", {
    method: "POST",
    body: new Blob(["bin"], { type: "image/png" }),
  })
  assert.equal(decoder.decode(seen.requests[0].body), "a=1")
  assert.match(
    seen.requests[0].headers.get("content-type"),
    /x-www-form-urlencoded/,
  )
  assert.equal(seen.requests[1].headers.get("content-type"), "image/png")
})

test("plain paths, Bearer calls and disabled builds use fetch directly", async () => {
  const seen = await gateway()
  const apiFetch = createApiFetch(options)
  await apiFetch("/api/plain?x=1")
  await createApiFetch({ ...options, enabled: false })("/api/admin/menu", {
    method: "POST",
    body: "{}",
  })
  await apiFetch("/api/admin/menu", {
    headers: { Authorization: "Bearer desktop" },
  })
  assert.equal(seen.keyFetches, 0)
  assert.deepEqual(
    seen.direct.map((call) => [call.url, call.init.credentials]),
    [
      ["/api/plain?x=1", "same-origin"],
      ["/api/admin/menu", "same-origin"],
      ["/api/admin/menu", "same-origin"],
    ],
  )
})

test("a failed key fetch or a tampered reply becomes the call's response", async () => {
  globalThis.fetch = async () => new Response(null, { status: 503 })
  assert.equal((await createApiFetch(options)("/api/admin/menu")).status, 503)
  const key = await keyPair(1)
  globalThis.fetch = async (url, init = {}) =>
    init.method === "POST"
      ? new Response(new Uint8Array(64), {
          headers: { "Content-Type": "message/ohttp-res" },
        })
      : new Response(key.list, {
          headers: { "Content-Type": "application/ohttp-keys" },
        })
  assert.equal((await createApiFetch(options)("/api/admin/menu")).status, 502)
})

test("key lists skip unknown KEMs and are discarded on any encoding error", async () => {
  const { list } = await keyPair(9)
  const x25519 = [
    7,
    0x00,
    0x20,
    ...new Uint8Array(32),
    0x00,
    0x04,
    0x00,
    0x01,
    0x00,
    0x01,
  ]
  const both = Uint8Array.from([0, x25519.length, ...x25519, ...list])
  assert.equal(selectKey(both).keyId, 9)
  assert.throws(() => selectKey(both.subarray(0, both.length - 1)))
  assert.throws(() => selectKey(Uint8Array.from([0, x25519.length, ...x25519])))
})
