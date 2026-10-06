import { NextResponse } from 'next/server';
import { requireRequestMember } from '../_lib/requestAuth';
import { listCases } from '../_lib/cases';
import { listDisbursements } from '../_lib/disbursements';
import { errorResponse } from '../_lib/routeErrors';
import { listAnnouncements } from '../../../lib/adminData';

// Everything the member dashboard needs in one request.
export async function GET(request: Request) {
  try {
    const member = await requireRequestMember(request);
    const [casesPayload, spending, announcements] = await Promise.all([
      listCases(member),
      listDisbursements(),
      listAnnouncements(3),
    ]);
    const cases = casesPayload.cases;

    return NextResponse.json(
      {
        awaitingMyPlea: cases.filter((item) => item.canPlead).length,
        owedByMe: cases.filter((item) => item.canPay).reduce((sum, item) => sum + item.amountDuePence, 0),
        casesOwedByMe: cases.filter((item) => item.canPay).length,
        openVotes: cases.filter((item) => item.canVote && !item.vote?.myVote).length,
        openCases: cases.filter((item) => item.stage === 'awaiting_plea' || item.stage === 'court_requested').length,
        memberCount: casesPayload.members.length,
        totalSpentPence: spending.totalSpentPence,
        announcements: announcements.map((item) => ({
          id: item.id,
          title: item.title,
          message: item.message,
          createdAt: item.createdAt,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return errorResponse(error, 'Unable to load your summary.');
  }
}
