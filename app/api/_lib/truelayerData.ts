import crypto from 'node:crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin';

const AUTH_API = 'https://auth.truelayer.com';
const EXPECTED_REDIRECT_URI = 'https://team-sigma-three.vercel.app/api/truelayer/callback';
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;
const CONNECT_RATE_LIMIT_MS = 15 * 1000;

type TokenPayload = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
};

type DataApiAccount = {
  account_id?: string;
  display_name?: string;
  currency?: string;
  provider?: {
    provider_id?: string;
    display_name?: string;
  };
};

type DataApiBalanceRow = {
  currency?: string;
  update_timestamp?: string;
  current?: number | { amount?: number };
  available?: number | { amount?: number };
};

type TeamTrueLayerIntegration = {
  provider?: string;
  accountId?: string;
  accountDisplayName?: string;
  currency?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  connectedAt?: unknown;
  updatedAt?: unknown;
  lastBalanceAt?: unknown;
  lastConnectRequestAtMs?: number;
  lastConnectRequestBy?: string;
};

type OAuthStateRecord = {
  uid: string;
  teamId: string;
  createdAtMs: number;
  expiresAtMs: number;
  used: boolean;
};

type TrueLayerDataConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiBase: string;
};

export class TrueLayerDataError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'TrueLayerDataError';
    this.code = code;
    this.status = status;
  }
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function parseErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  const value = record.error_description || record.error || record.message;
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function integrationRef(teamId: string) {
  return adminDb.doc(`teams/${teamId}/integrations/truelayer`);
}

function oauthStateRef(state: string) {
  return adminDb.doc(`truelayer_oauth_states/${state}`);
}

export function getTrueLayerDataConfigError(): string | null {
  try {
    getTrueLayerDataConfigOrThrow();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Invalid TrueLayer Data API configuration.';
  }
}

function getTrueLayerDataConfigOrThrow(): TrueLayerDataConfig {
  const clientId = readEnv('TRUELAYER_CLIENT_ID');
  if (!clientId) throw new TrueLayerDataError('missing_config', 'Missing TRUELAYER_CLIENT_ID.', 500);

  const clientSecret = readEnv('TRUELAYER_CLIENT_SECRET');
  if (!clientSecret) throw new TrueLayerDataError('missing_config', 'Missing TRUELAYER_CLIENT_SECRET.', 500);

  const redirectUri = readEnv('TRUELAYER_REDIRECT_URI');
  if (!redirectUri) throw new TrueLayerDataError('missing_config', 'Missing TRUELAYER_REDIRECT_URI.', 500);

  if (redirectUri !== EXPECTED_REDIRECT_URI) {
    throw new TrueLayerDataError(
      'invalid_redirect_uri',
      `TRUELAYER_REDIRECT_URI must be exactly ${EXPECTED_REDIRECT_URI}.`,
      500
    );
  }

  const apiBase = trimTrailingSlash(readEnv('TRUELAYER_API') || 'https://api.truelayer.com');
  return { clientId, clientSecret, redirectUri, apiBase };
}

export function getTrueLayerDataSettings() {
  const configError = getTrueLayerDataConfigError();
  return {
    redirectUri: EXPECTED_REDIRECT_URI,
    configured: !configError,
    configError,
    apiBase: trimTrailingSlash(readEnv('TRUELAYER_API') || 'https://api.truelayer.com'),
  };
}

export async function createConsentUrl(params: {
  teamId: string;
  uid: string;
}): Promise<string> {
  const config = getTrueLayerDataConfigOrThrow();
  const now = Date.now();

  const integrationSnapshot = await integrationRef(params.teamId).get();
  const integration = integrationSnapshot.exists
    ? (integrationSnapshot.data() as TeamTrueLayerIntegration)
    : null;

  const lastConnectRequestAtMs = Number(integration?.lastConnectRequestAtMs || 0);
  if (lastConnectRequestAtMs && now - lastConnectRequestAtMs < CONNECT_RATE_LIMIT_MS) {
    throw new TrueLayerDataError(
      'rate_limited',
      'Please wait a few seconds before requesting another bank connection.',
      429
    );
  }

  const state = crypto.randomUUID().replaceAll('-', '');
  await oauthStateRef(state).set({
    uid: params.uid,
    teamId: params.teamId,
    createdAt: FieldValue.serverTimestamp(),
    createdAtMs: now,
    expiresAtMs: now + OAUTH_STATE_TTL_MS,
    used: false,
  });

  await integrationRef(params.teamId).set(
    {
      lastConnectRequestAt: FieldValue.serverTimestamp(),
      lastConnectRequestAtMs: now,
      lastConnectRequestBy: params.uid,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const authUrl = new URL(`${AUTH_API}/`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', config.clientId);
  authUrl.searchParams.set('redirect_uri', config.redirectUri);
  authUrl.searchParams.set('scope', 'accounts balance offline_access');
  authUrl.searchParams.set('providers', 'uk-ob-all');
  authUrl.searchParams.set('provider_id', 'ob-monzo');
  authUrl.searchParams.set('state', state);

  return authUrl.toString();
}

async function postTokenRequest(params: URLSearchParams): Promise<TokenPayload> {
  const response = await fetch(`${AUTH_API}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new TrueLayerDataError(
      'token_exchange_failed',
      parseErrorMessage(payload, 'TrueLayer token exchange failed.'),
      502
    );
  }

  const accessToken = payload.access_token;
  const refreshToken = payload.refresh_token;
  const expiresIn = Number(payload.expires_in);

  if (typeof accessToken !== 'string' || !Number.isFinite(expiresIn)) {
    throw new TrueLayerDataError('invalid_token_response', 'TrueLayer token response was incomplete.', 502);
  }

  return {
    access_token: accessToken,
    refresh_token: typeof refreshToken === 'string' ? refreshToken : undefined,
    expires_in: expiresIn,
  };
}

async function fetchDataApi(path: string, accessToken: string, apiBase: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${apiBase}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new TrueLayerDataError(
      'data_api_failed',
      parseErrorMessage(payload, `TrueLayer Data API request failed for ${path}.`),
      502
    );
  }

  return payload;
}

function pickMonzoAccount(results: DataApiAccount[]): DataApiAccount | null {
  if (!results.length) return null;

  // Balance-only phase: transaction ingestion (including Monzo pot-transfer filtering)
  // is intentionally deferred until a dedicated transactions endpoint is introduced.
  const monzoGbp = results.find((account) => {
    const providerId = String(account.provider?.provider_id || '').toLowerCase();
    const providerName = String(account.provider?.display_name || '').toLowerCase();
    const isMonzo = providerId.includes('monzo') || providerName.includes('monzo');
    return isMonzo && String(account.currency || '').toUpperCase() === 'GBP';
  });
  if (monzoGbp) return monzoGbp;

  const gbp = results.find((account) => String(account.currency || '').toUpperCase() === 'GBP');
  if (gbp) return gbp;

  return results[0];
}

function parseBalanceAmount(row: DataApiBalanceRow): number {
  const current = row.current;
  if (typeof current === 'number' && Number.isFinite(current)) return current;
  if (typeof current === 'object' && current) {
    const amount = Number((current as { amount?: number }).amount);
    if (Number.isFinite(amount)) return amount;
  }

  const available = row.available;
  if (typeof available === 'number' && Number.isFinite(available)) return available;
  if (typeof available === 'object' && available) {
    const amount = Number((available as { amount?: number }).amount);
    if (Number.isFinite(amount)) return amount;
  }

  return 0;
}

export async function consumeOAuthCallback(params: {
  code: string;
  state: string;
}): Promise<{ teamId: string }> {
  const config = getTrueLayerDataConfigOrThrow();
  const now = Date.now();

  const stateDocRef = oauthStateRef(params.state);
  const stateRecord = await adminDb.runTransaction(async (tx) => {
    const snapshot = await tx.get(stateDocRef);
    if (!snapshot.exists) {
      throw new TrueLayerDataError('invalid_state', 'State is invalid or unknown.', 400);
    }

    const data = snapshot.data() as OAuthStateRecord;
    if (data.used) {
      throw new TrueLayerDataError('invalid_state', 'State has already been used.', 400);
    }
    if (Number(data.expiresAtMs || 0) < now) {
      throw new TrueLayerDataError('invalid_state', 'State has expired.', 400);
    }

    tx.update(stateDocRef, {
      used: true,
      usedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return data;
  });

  const memberSnapshot = await adminDb.doc(`teams/${stateRecord.teamId}/members/${stateRecord.uid}`).get();
  if (!memberSnapshot.exists || memberSnapshot.data()?.role !== 'admin') {
    throw new TrueLayerDataError('forbidden', 'Only admins can complete bank connection.', 403);
  }

  const tokenPayload = await postTokenRequest(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      code: params.code,
    })
  );

  const accountsPayload = await fetchDataApi('/data/v1/accounts', tokenPayload.access_token, config.apiBase);
  const results = Array.isArray(accountsPayload.results)
    ? (accountsPayload.results as DataApiAccount[])
    : [];
  const selected = pickMonzoAccount(results);
  if (!selected?.account_id) {
    throw new TrueLayerDataError('no_accounts', 'No accessible bank accounts were returned by TrueLayer.', 409);
  }

  const expiresAt = Date.now() + tokenPayload.expires_in * 1000;
  await integrationRef(stateRecord.teamId).set(
    {
      provider: 'monzo',
      accountId: selected.account_id,
      accountDisplayName: selected.display_name || 'Monzo Account',
      currency: selected.currency || 'GBP',
      accessToken: tokenPayload.access_token,
      refreshToken: tokenPayload.refresh_token || null,
      expiresAt,
      connectedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { teamId: stateRecord.teamId };
}

async function refreshAccessToken(params: {
  teamId: string;
  refreshToken: string;
}): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
  const config = getTrueLayerDataConfigOrThrow();
  const tokenPayload = await postTokenRequest(
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: params.refreshToken,
    })
  );

  const refreshedToken = tokenPayload.refresh_token || params.refreshToken;
  const expiresAt = Date.now() + tokenPayload.expires_in * 1000;

  await integrationRef(params.teamId).set(
    {
      accessToken: tokenPayload.access_token,
      refreshToken: refreshedToken,
      expiresAt,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    accessToken: tokenPayload.access_token,
    refreshToken: refreshedToken,
    expiresAt,
  };
}

export async function getValidAccessToken(teamId: string): Promise<{
  accessToken: string;
  accountId: string;
  currency: string;
}> {
  const snapshot = await integrationRef(teamId).get();
  if (!snapshot.exists) {
    throw new TrueLayerDataError('not_connected', 'Bank account is not connected yet.', 409);
  }

  const integration = snapshot.data() as TeamTrueLayerIntegration;
  const accountId = integration.accountId;
  const currency = integration.currency || 'GBP';
  const accessToken = integration.accessToken;
  const refreshToken = integration.refreshToken;
  const expiresAt = Number(integration.expiresAt || 0);

  if (!accountId || !accessToken || !expiresAt) {
    throw new TrueLayerDataError('not_connected', 'Bank account connection is incomplete.', 409);
  }

  if (Date.now() < expiresAt - ACCESS_TOKEN_REFRESH_BUFFER_MS) {
    return { accessToken, accountId, currency };
  }

  if (!refreshToken) {
    throw new TrueLayerDataError('token_expired', 'Refresh token is missing. Reconnect the bank account.', 409);
  }

  const refreshed = await refreshAccessToken({ teamId, refreshToken });
  return {
    accessToken: refreshed.accessToken,
    accountId,
    currency,
  };
}

export async function fetchTeamBalance(teamId: string): Promise<{
  balance: number;
  currency: string;
  lastUpdated: string;
}> {
  const config = getTrueLayerDataConfigOrThrow();
  const token = await getValidAccessToken(teamId);
  const payload = await fetchDataApi(`/data/v1/accounts/${token.accountId}/balance`, token.accessToken, config.apiBase);
  const rows = Array.isArray(payload.results) ? (payload.results as DataApiBalanceRow[]) : [];

  if (!rows.length) {
    throw new TrueLayerDataError('no_balance', 'No balance data was returned by TrueLayer.', 502);
  }

  const row = rows[0];
  const balance = parseBalanceAmount(row);
  const currency = row.currency || token.currency || 'GBP';
  const lastUpdated = row.update_timestamp || new Date().toISOString();

  await integrationRef(teamId).set(
    {
      lastBalanceAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { balance, currency, lastUpdated };
}
