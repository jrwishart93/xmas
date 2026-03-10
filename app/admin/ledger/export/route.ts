import { NextResponse } from "next/server";

import { requireRequestMember, RequestAuthError } from "@/app/api/_lib/requestAuth";
import { buildLedgerCsv } from "@/lib/adminData";

export async function GET(request: Request) {
  try {
    await requireRequestMember(request, { requireAdmin: true });
    const csv = await buildLedgerCsv();

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="team-social-fund-ledger.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to export ledger." },
      { status: 500 }
    );
  }
}
