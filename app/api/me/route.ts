import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '../_lib/firebaseAdmin';
import { requireRequestMember } from '../_lib/requestAuth';
import { errorResponse } from '../_lib/routeErrors';
import { teamMemberPath } from '../../../lib/team';

export async function PATCH(request: Request) {
  try {
    const member = await requireRequestMember(request);
    const body = (await request.json().catch(() => ({}))) as { displayName?: unknown };
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().replace(/\s+/g, ' ') : '';

    if (displayName.length < 2 || displayName.length > 60) {
      return NextResponse.json({ error: 'Use a name between 2 and 60 characters.' }, { status: 400 });
    }

    await getAdminDb().doc(teamMemberPath(member.uid)).update({
      displayName,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, displayName });
  } catch (error) {
    return errorResponse(error, 'Unable to update your profile.');
  }
}
