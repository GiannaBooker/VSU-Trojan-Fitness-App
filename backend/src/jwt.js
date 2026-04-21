import crypto from "node:crypto";

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function base64UrlDecodeToBuffer(value) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function signHmacSha256(input, secret) {
  return crypto.createHmac("sha256", secret).update(input).digest();
}

export function signJwt(payload, secret, { expiresInSeconds }) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const jti = crypto.randomUUID();

  const fullPayload = {
    ...payload,
    iat: nowSeconds,
    exp: nowSeconds + expiresInSeconds,
    jti,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = base64UrlEncode(signHmacSha256(signingInput, secret));

  return { token: `${signingInput}.${signature}`, jti, exp: fullPayload.exp };
}

export function verifyJwt(token, secret) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = base64UrlEncode(signHmacSha256(signingInput, secret));

  const signatureOk = crypto.timingSafeEqual(
    Buffer.from(encodedSignature),
    Buffer.from(expectedSignature),
  );
  if (!signatureOk) {
    throw new Error("Invalid token signature");
  }

  const payloadJson = base64UrlDecodeToBuffer(encodedPayload).toString("utf8");
  const payload = JSON.parse(payloadJson);

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp <= nowSeconds) {
    throw new Error("Token expired");
  }

  return payload;
}

