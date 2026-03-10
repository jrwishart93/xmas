import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { SESSION_COOKIE_NAME, verifySignedSession } from "@/lib/adminSession";
import { TEAM_ID } from "@/lib/team";

export async function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value || null;
  const session = await verifySignedSession(sessionCookie);

  if (!session || session.role !== "admin" || session.teamId !== TEAM_ID) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
