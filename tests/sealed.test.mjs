import assert from "node:assert/strict"
import { createApiFetch } from "../src/lib/sealed.ts"

// Runs under both `node --test` and Vitest, whichever the product uses.
const { afterEach, test } = process.env.VITEST
  ? await import("vitest")
  : await import("node:test")

const { subtle } = globalThis.crypto
const encoder = new TextEncoder()
const SEALED = "application/vnd.one.sealed"
const b64 = (bytes) => Buffer.from(bytes).toString("base64url")
const INFO = "test sealed api v1"
const options = {
  enabled: true,
  info: INFO,
  plain: (pathname) => pathname === "/api/plain",
}

/** Plays the backend gateway: handshake, then open envelopes and seal replies. */
function gateway({ clockSkew = 0, expireFirst = false, reply } = {}) {
  const keys = new Map()
  const seen = { handshakes: 0, envelopes: [], direct: [] }
  let expired = !expireFirst
  globalThis.fetch = async (url, init) => {
    if (!url.startsWith("/api/sealed")) {
      seen.direct.push({ url, init })
      return Response.json({ direct: url })
    }
    if (url === "/api/sealed/handshake") {
      seen.handshakes++
      const client = Buffer.from(JSON.parse(init.body).public_key, "base64url")
      const pair = await subtle.generateKey(
        { name: "ECDH", namedCurve: "P-256" },
        false,
        ["deriveBits"],
      )
      const server = new Uint8Array(
        await subtle.exportKey("raw", pair.publicKey),
      )
      const shared = await subtle.deriveBits(
        {
          name: "ECDH",
          public: await subtle.importKey(
            "raw",
            client,
            { name: "ECDH", namedCurve: "P-256" },
            false,
            [],
          ),
        },
        pair.privateKey,
        256,
      )
      const key = await subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: Buffer.concat([client, server]),
          info: encoder.encode(INFO),
        },
        await subtle.importKey("raw", shared, "HKDF", false, ["deriveKey"]),
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      )
      const keyId = `kid-${seen.handshakes}`
      keys.set(keyId, key)
      return Response.json({
        key_id: keyId,
        public_key: b64(server),
        server_time: Date.now() + clockSkew,
        expires_in: 21600,
      })
    }
    assert.equal(url, "/api/sealed")
    assert.equal(init.method, "POST")
    assert.equal(init.headers.get("Content-Type"), SEALED)
    const keyId = init.headers.get("X-Sealed-Key")
    seen.headers = init.headers
    if (!expired) {
      expired = true
      return Response.json({ code: "sealed_key_invalid" }, { status: 401 })
    }
    const key = keys.get(keyId)
    const body = init.body
    const nonce = body.slice(0, 12)
    const envelope = JSON.parse(
      new TextDecoder().decode(
        await subtle.decrypt(
          { name: "AES-GCM", iv: nonce, additionalData: encoder.encode(keyId) },
          key,
          body.slice(12),
        ),
      ),
    )
    seen.envelopes.push({ keyId, ...envelope })
    const [status, payload, type] = reply?.(envelope) ?? [
      200,
      { ok: envelope.p },
    ]
    if (payload === null) return new Response(null, { status })
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
    const sealed = await subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: nonce },
      key,
      encoder.encode(JSON.stringify(payload)),
    )
    return new Response(Buffer.concat([iv, new Uint8Array(sealed)]), {
      status,
      headers: {
        "Content-Type": SEALED,
        ...(type === undefined ? {} : { "X-Sealed-Type": type }),
      },
    })
  }
  return seen
}

afterEach(() => {
  delete globalThis.fetch
})

test("concurrent calls share one handshake and carry method, path, body and server time", async () => {
  const apiFetch = createApiFetch(options)
  const seen = gateway({ clockSkew: 3_600_000 })
  const [list, saved] = await Promise.all([
    apiFetch("/api/admin/users?page=1&q=a+b"),
    apiFetch("/api/admin/users/7", {
      method: "put",
      body: JSON.stringify({ name: "x" }),
    }),
  ])
  assert.equal(seen.handshakes, 1)
  assert.deepEqual(await list.json(), { ok: "/api/admin/users?page=1&q=a+b" })
  assert.equal(saved.headers.get("Content-Type"), "application/json")
  const [get, put] = seen.envelopes
  assert.equal(get.m, "GET")
  assert.equal(get.b, null)
  assert.equal(put.m, "PUT")
  assert.equal(put.p, "/api/admin/users/7")
  assert.equal(put.b, '{"name":"x"}')
  assert.ok(Math.abs(put.t - (Date.now() + 3_600_000)) < 5_000)
})

test("inner statuses survive and empty replies stay empty", async () => {
  const apiFetch = createApiFetch(options)
  gateway({
    reply: (envelope) =>
      envelope.m === "DELETE"
        ? [204, null]
        : [401, { message: "请先通过 One User 登录" }],
  })
  const denied = await apiFetch("/api/auth/me")
  assert.equal(denied.status, 401)
  assert.deepEqual(await denied.json(), { message: "请先通过 One User 登录" })
  const removed = await apiFetch("/api/admin/roles/3", { method: "DELETE" })
  assert.equal(removed.status, 204)
})

test("the inner content type is restored from X-Sealed-Type", async () => {
  const apiFetch = createApiFetch(options)
  gateway({
    reply: () => [401, { code: "unauthenticated" }, "application/problem+json"],
  })
  const response = await apiFetch("/api/auth/user")
  assert.equal(response.status, 401)
  assert.equal(response.headers.get("Content-Type"), "application/problem+json")
  assert.deepEqual(await response.json(), { code: "unauthenticated" })
})

test("an expired key renews the channel once and retries the same call", async () => {
  const apiFetch = createApiFetch(options)
  const seen = gateway({ expireFirst: true })
  const response = await apiFetch("/api/admin/menu")
  assert.equal(response.status, 200)
  assert.equal(seen.handshakes, 2)
  assert.deepEqual(
    seen.envelopes.map((e) => e.keyId),
    ["kid-2"],
  )
})

test("non-JSON bodies are refused before anything is sent", async () => {
  const apiFetch = createApiFetch(options)
  gateway()
  await assert.rejects(
    apiFetch("/api/x", { method: "POST", body: new Blob(["x"]) }),
    TypeError,
  )
})

test("caller headers ride on the outer request but never replace the sealed type", async () => {
  const apiFetch = createApiFetch(options)
  const seen = gateway()
  await apiFetch("/api/x", {
    method: "POST",
    body: "{}",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "op-1" },
  })
  assert.equal(seen.headers.get("Idempotency-Key"), "op-1")
  assert.equal(seen.headers.get("Content-Type"), SEALED)
})

test("plain paths, Bearer calls and disabled builds use fetch directly", async () => {
  const seen = gateway()
  const apiFetch = createApiFetch(options)
  await apiFetch("/api/plain?x=1")
  await createApiFetch({ ...options, enabled: false })("/api/admin/menu", {
    method: "POST",
    body: "{}",
  })
  await apiFetch("/api/admin/menu", {
    headers: { Authorization: "Bearer desktop" },
  })
  assert.equal(seen.handshakes, 0)
  assert.deepEqual(
    seen.direct.map((call) => [call.url, call.init.credentials]),
    [
      ["/api/plain?x=1", "same-origin"],
      ["/api/admin/menu", "same-origin"],
      ["/api/admin/menu", "same-origin"],
    ],
  )
})

test("a failed handshake becomes the call's response", async () => {
  globalThis.fetch = async () => new Response(null, { status: 503 })
  const response = await createApiFetch(options)("/api/admin/menu")
  assert.equal(response.status, 503)
})
