import { NextResponse } from 'next/server';
import { consumeOAuthCallback, getTrueLayerDataConfigError, TrueLayerDataError } from '../../_lib/truelayerData';

function dashboardRedirect(request: Request, bank: 'connected' | 'error', reason?: string) {
  const url = new URL('/app/dashboard/', request.url);
  url.searchParams.set('bank', bank);
  if (reason) url.searchParams.set('reason', reason);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const configError = getTrueLayerDataConfigError();
  if (configError) {
    return dashboardRedirect(request, 'error', 'config');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const authError = url.searchParams.get('error');

  if (authError) {
    return dashboardRedirect(request, 'error', 'authorisation');
  }
  if (!code || !state) {
    return dashboardRedirect(request, 'error', 'missing_code');
  }

  try {
    await consumeOAuthCallback({ code, state });
    return dashboardRedirect(request, 'connected');
  } catch (error) {
    if (error instanceof TrueLayerDataError) {
      return dashboardRedirect(request, 'error', error.code);
    }
    return dashboardRedirect(request, 'error', 'callback_failed');
  }
}
