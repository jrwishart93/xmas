import { NextResponse } from 'next/server';
import { requireRequestMember } from '../../_lib/requestAuth';
import { CaseError, closeVote, dismissCase, markCasePaid, pleadToCase, voteOnCase } from '../../_lib/cases';
import { errorResponse } from '../../_lib/routeErrors';

type Params = { params: Promise<{ caseId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { caseId } = await params;

  try {
    const member = await requireRequestMember(request);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    switch (body.action) {
      case 'plead':
        await pleadToCase(member, caseId, body.plea);
        return NextResponse.json({ ok: true });
      case 'vote':
        return NextResponse.json({ ok: true, verdict: await voteOnCase(member, caseId, body.vote) });
      case 'close-vote':
        return NextResponse.json({ ok: true, verdict: await closeVote(member, caseId) });
      case 'dismiss':
        await dismissCase(member, caseId);
        return NextResponse.json({ ok: true });
      case 'mark-paid':
        return NextResponse.json({ ok: true, ...(await markCasePaid(member, caseId)) });
      default:
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    return errorResponse(error, 'Unable to update case.', [CaseError]);
  }
}
