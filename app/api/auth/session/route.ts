import { NextResponse } from "next/server";

import { getAdminAuth } from "../../_lib/firebaseAdmin";
import {
  clearSessionCookieOptions,
  createSignedSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "../../../../lib/adminSession";
import { getMemberRecord } from "../../../../lib/isAdmin";
import { TEAM_ID } from "../../../../lib/team";

function buildClearedResponse(body: Record<string, unknown>, status: number) {
  const response = NextResponse.json(body, { status });
  response.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
  return response;
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return buildClearedResponse({ error: "Missing ID token." }, 401);
  }

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded?.uid) {
    return buildClearedResponse({ error: "Invalid ID token." }, 401);
  }

  const member = await getMemberRecord(decoded.uid, TEAM_ID);
  if (!member) {
    return buildClearedResponse({ error: "Team membership required." }, 403);
  }

  if (member.disabled === true) {
    return buildClearedResponse({ error: "This account has been disabled." }, 403);
  }

  const cookieValue = await createSignedSession({
    uid: decoded.uid,
    role: member.role === "admin" ? "admin" : "member",
    teamId: TEAM_ID,
  });

  const response = NextResponse.json({
    ok: true,
    role: member.role === "admin" ? "admin" : "member",
  });

  response.cookies.set(SESSION_COOKIE_NAME, cookieValue, getSessionCookieOptions());
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", clearSessionCookieOptions());
  return response;
}
