import { NextResponse } from "next/server";

import { createConsentUrl } from "@/app/api/_lib/truelayerData";
import { requireRequestMember, RequestAuthError } from "@/app/api/_lib/requestAuth";

export async function GET(request: Request) {
  try {
    const admin = await requireRequestMember(request, { requireAdmin: true });
    const url = await createConsentUrl({
      teamId: admin.teamId,
      uid: admin.uid,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const target = new URL("/admin/banking/", request.url);
    target.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Unable to start bank connection."
    );
    return NextResponse.redirect(target);
  }
}
