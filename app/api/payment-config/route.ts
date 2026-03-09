import { NextResponse } from 'next/server';
import { getPaymentDisplayConfig } from '../_lib/truelayer';

export async function GET() {
  return NextResponse.json(getPaymentDisplayConfig());
}
