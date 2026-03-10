import { getAdminAuth } from "./firebaseAdmin";
import { SESSION_COOKIE_NAME, verifySignedSession } from "../../../lib/adminSession";
import { getMemberRecord } from "../../../lib/isAdmin";
import { TEAM_ID } from "../../../lib/team";

export type RequestMemberContext = {
  uid: string;
  teamId: string;
  role: "member" | "admin";
  displayName: string;
  email: string;
  disabled: boolean;
};

export class RequestAuthError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "RequestAuthError";
    this.code = code;
    this.status = status;
  }
}

function readBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
}

function readCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie") || "";
  const prefix = `${name}=`;

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }

  return null;
}

async function resolveUidFromRequest(request: Request) {
  const bearerToken = readBearerToken(request);
  if (bearerToken) {
    const decoded = await getAdminAuth().verifyIdToken(bearerToken).catch(() => null);
    if (decoded?.uid) return decoded.uid;
  }

  const sessionCookie = readCookieValue(request, SESSION_COOKIE_NAME);
  const session = await verifySignedSession(sessionCookie);
  if (!session || session.teamId !== TEAM_ID) return null;

  return session.uid;
}

export async function requireRequestMember(
  request: Request,
  options: {
    requireAdmin?: boolean;
  } = {}
) {
  const uid = await resolveUidFromRequest(request);
  if (!uid) {
    throw new RequestAuthError("unauthorized", "Authentication required.", 401);
  }

  const member = await getMemberRecord(uid, TEAM_ID);
  if (!member) {
    throw new RequestAuthError("membership_required", "Team membership required.", 403);
  }

  if (member.disabled === true) {
    throw new RequestAuthError("disabled", "This account has been disabled.", 403);
  }

  if (options.requireAdmin && member.role !== "admin") {
    throw new RequestAuthError("forbidden", "Admin access required.", 403);
  }

  return {
    uid,
    teamId: TEAM_ID,
    role: member.role === "admin" ? "admin" : "member",
    displayName: String(member.displayName || member.email || uid),
    email: String(member.email || ""),
    disabled: false,
  } satisfies RequestMemberContext;
}
