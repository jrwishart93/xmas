import { TEAM_ID } from "./team";

export const SESSION_COOKIE_NAME = "stf_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 4;
const SESSION_VERSION = "v1";

export type SignedSessionPayload = {
  uid: string;
  role: "member" | "admin";
  teamId: string;
  iat: number;
  exp: number;
};

function getSessionSecret() {
  const secret =
    process.env.SESSION_COOKIE_SECRET ||
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    "";

  return secret.trim();
}

function encodePayload(payload: SignedSessionPayload) {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodePayload(value: string) {
  try {
    return JSON.parse(decodeURIComponent(value)) as SignedSessionPayload;
  } catch {
    return null;
  }
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}

async function signValue(value: string) {
  const secret = getSessionSecret();
  if (!secret) {
    throw new Error("Missing SESSION_COOKIE_SECRET or fallback secret for signed sessions.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSignedSession(params: {
  uid: string;
  role: "member" | "admin";
  teamId?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: SignedSessionPayload = {
    uid: params.uid,
    role: params.role,
    teamId: params.teamId || TEAM_ID,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const encoded = encodePayload(payload);
  const signature = await signValue(`${SESSION_VERSION}.${encoded}`);
  return `${SESSION_VERSION}.${encoded}.${signature}`;
}

export async function verifySignedSession(value?: string | null) {
  if (!value) return null;

  const [version, encoded, signature] = String(value).split(".");
  if (!version || !encoded || !signature || version !== SESSION_VERSION) {
    return null;
  }

  try {
    const expectedSignature = await signValue(`${version}.${encoded}`);
    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }
  } catch {
    return null;
  }

  const payload = decodePayload(encoded);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return null;

  return payload;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  };
}

export function clearSessionCookieOptions() {
  return {
    ...getSessionCookieOptions(),
    maxAge: 0,
  };
}
