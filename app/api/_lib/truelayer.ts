import crypto from 'node:crypto';
import * as tlSigning from 'truelayer-signing';

type TrueLayerEnvironment = 'sandbox' | 'live';

type TrueLayerConfig = {
  clientId: string;
  clientSecret: string;
  merchantAccountId: string;
  signingKeyId: string;
  signingPrivateKeyPem: string;
};

type PaymentMethodsConfig = {
  openBanking: boolean;
  bankTransfer: boolean;
};

export type PaymentDisplayConfig = {
  bankDetails: {
    accountName: string;
    sortCode: string;
    accountNumber: string;
  };
  paymentMethods: PaymentMethodsConfig;
  truelayer: {
    environment: TrueLayerEnvironment;
    configured: boolean;
    configError: string | null;
  };
};

const DEFAULT_ALLOWED_WEBHOOK_JWKS = new Set([
  'https://webhooks.truelayer.com/.well-known/jwks',
  'https://webhooks.truelayer-sandbox.com/.well-known/jwks',
]);

const DEFAULT_BANK_DETAILS = {
  accountName: 'Team Social Fund',
  sortCode: '40-00-05',
  accountNumber: '74984172',
};

const jwksCache = new Map<string, { value: string; expiresAt: number }>();
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

export type CreateHostedPaymentInput = {
  amountInMinor: number;
  currency: string;
  beneficiaryReference: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  metadata?: Record<string, string>;
  returnUri: string;
};

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseEnvBoolean(name: string, defaultValue: boolean): boolean {
  const value = readEnv(name);
  if (!value) return defaultValue;
  const lowered = value.toLowerCase();
  return !['0', 'false', 'off', 'no'].includes(lowered);
}

export function getTrueLayerEnvironment(): TrueLayerEnvironment {
  const value = String(process.env.TRUELAYER_ENV || 'sandbox').toLowerCase();
  if (value === 'live' || value === 'production') return 'live';
  return 'sandbox';
}

function getEnvironmentSuffix(environment: TrueLayerEnvironment): 'SANDBOX' | 'LIVE' {
  return environment === 'live' ? 'LIVE' : 'SANDBOX';
}

function getResolvedEnvValue(baseName: string, environment: TrueLayerEnvironment): string | undefined {
  const suffix = getEnvironmentSuffix(environment);
  return readEnv(`${baseName}_${suffix}`) || readEnv(baseName);
}

function resolveTrueLayerConfig(): {
  environment: TrueLayerEnvironment;
  config: Partial<TrueLayerConfig>;
  missingBases: string[];
} {
  const environment = getTrueLayerEnvironment();

  const config: Partial<TrueLayerConfig> = {
    clientId: getResolvedEnvValue('TRUELAYER_CLIENT_ID', environment),
    clientSecret: getResolvedEnvValue('TRUELAYER_CLIENT_SECRET', environment),
    merchantAccountId: getResolvedEnvValue('TRUELAYER_MERCHANT_ACCOUNT_ID', environment),
    signingKeyId: getResolvedEnvValue('TRUELAYER_SIGNING_KEY_ID', environment),
    signingPrivateKeyPem: getResolvedEnvValue('TRUELAYER_SIGNING_PRIVATE_KEY', environment)?.replace(/\\n/g, '\n'),
  };

  const missingBases: string[] = [];
  if (!config.clientId) missingBases.push('TRUELAYER_CLIENT_ID');
  if (!config.clientSecret) missingBases.push('TRUELAYER_CLIENT_SECRET');
  if (!config.merchantAccountId) missingBases.push('TRUELAYER_MERCHANT_ACCOUNT_ID');
  if (!config.signingKeyId) missingBases.push('TRUELAYER_SIGNING_KEY_ID');
  if (!config.signingPrivateKeyPem) missingBases.push('TRUELAYER_SIGNING_PRIVATE_KEY');

  return { environment, config, missingBases };
}

function getTrueLayerConfigOrThrow(): TrueLayerConfig {
  const resolved = resolveTrueLayerConfig();
  if (resolved.missingBases.length > 0) {
    const suffix = getEnvironmentSuffix(resolved.environment);
    const preferred = resolved.missingBases.map((base) => `${base}_${suffix}`);
    throw new Error(
      `Missing TrueLayer configuration for ${resolved.environment}: ${preferred.join(', ')} (or unsuffixed fallback vars).`
    );
  }

  return resolved.config as TrueLayerConfig;
}

function getApiBaseUrl(): string {
  return getTrueLayerEnvironment() === 'live'
    ? 'https://api.truelayer.com'
    : 'https://api.truelayer-sandbox.com';
}

function getAuthBaseUrl(): string {
  return getTrueLayerEnvironment() === 'live'
    ? 'https://auth.truelayer.com'
    : 'https://auth.truelayer-sandbox.com';
}

function getPaymentHost(): string {
  return getTrueLayerEnvironment() === 'live'
    ? 'https://payment.truelayer.com'
    : 'https://payment.truelayer-sandbox.com';
}

function extractErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!payload || typeof payload !== 'object') return fallbackMessage;
  const record = payload as Record<string, unknown>;
  const message = record.error_description || record.error || record.message;
  return typeof message === 'string' ? message : fallbackMessage;
}

async function getAccessToken(config: TrueLayerConfig): Promise<string> {
  const response = await fetch(`${getAuthBaseUrl()}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: 'payments',
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(extractErrorMessage(payload, 'Unable to obtain a TrueLayer access token.'));
  }

  return payload.access_token;
}

function buildTlSignature(
  params: {
    method: 'POST';
    path: string;
    body: string;
    idempotencyKey: string;
  },
  config: TrueLayerConfig
): string {
  return tlSigning.sign({
    kid: config.signingKeyId,
    method: params.method as unknown as tlSigning.HttpMethod,
    path: params.path,
    headers: { 'Idempotency-Key': params.idempotencyKey },
    body: params.body,
    privateKeyPem: config.signingPrivateKeyPem,
  });
}

async function signedPost<TPayload>(params: {
  path: string;
  accessToken: string;
  body: TPayload;
  idempotencyKey: string;
  config: TrueLayerConfig;
}): Promise<Record<string, unknown>> {
  const bodyString = JSON.stringify(params.body);
  const signature = buildTlSignature(
    {
      method: 'POST',
      path: params.path,
      body: bodyString,
      idempotencyKey: params.idempotencyKey,
    },
    params.config
  );

  const response = await fetch(`${getApiBaseUrl()}${params.path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': params.idempotencyKey,
      'Tl-Signature': signature,
    },
    body: bodyString,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(extractErrorMessage(payload, `TrueLayer request failed for ${params.path}.`));
  }

  return payload;
}

function buildFallbackHostedPageUrl(
  paymentId: string | undefined,
  resourceToken: string | undefined,
  returnUri: string
): string | null {
  if (!paymentId || !resourceToken) return null;

  const hashParams = new URLSearchParams({
    payment_id: paymentId,
    resource_token: resourceToken,
    return_uri: returnUri,
  });

  return `${getPaymentHost()}/payments#${hashParams.toString()}`;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function extractHostedPageUrl(payload: Record<string, unknown>): string | undefined {
  const authFlow = payload.authorization_flow;
  if (!authFlow || typeof authFlow !== 'object') return undefined;

  const actions = (authFlow as Record<string, unknown>).actions;
  if (!actions || typeof actions !== 'object') return undefined;

  const nextAction = (actions as Record<string, unknown>).next;
  if (!nextAction || typeof nextAction !== 'object') return undefined;

  return asString((nextAction as Record<string, unknown>).uri);
}

export async function createHostedPayment(input: CreateHostedPaymentInput): Promise<{
  paymentId: string;
  hostedPageUrl: string;
}> {
  const config = getTrueLayerConfigOrThrow();
  const accessToken = await getAccessToken(config);

  const createPaymentPayload = await signedPost({
    path: '/v3/payments',
    accessToken,
    config,
    idempotencyKey: crypto.randomUUID(),
    body: {
      amount_in_minor: input.amountInMinor,
      currency: input.currency,
      payment_method: {
        type: 'bank_transfer',
        provider_selection: {
          type: 'user_selected',
        },
        beneficiary: {
          type: 'merchant_account',
          merchant_account_id: config.merchantAccountId,
          reference: input.beneficiaryReference,
        },
      },
      user: {
        id: input.userId,
        name: input.userName,
        ...(input.userEmail ? { email: input.userEmail } : {}),
      },
      metadata: input.metadata || {},
    },
  });

  const paymentId = asString(createPaymentPayload.id);
  if (!paymentId) {
    throw new Error('TrueLayer did not return a payment id.');
  }

  const authFlowPayload = await signedPost({
    path: `/v3/payments/${paymentId}/authorization-flow`,
    accessToken,
    config,
    idempotencyKey: crypto.randomUUID(),
    body: {
      provider_selection: {
        type: 'user_selected',
      },
      redirect: {
        uri: input.returnUri,
      },
    },
  });

  const hostedPageUrl =
    extractHostedPageUrl(authFlowPayload) ||
    asString(authFlowPayload.hosted_page_uri) ||
    buildFallbackHostedPageUrl(paymentId, asString(createPaymentPayload.resource_token), input.returnUri);

  if (!hostedPageUrl) {
    throw new Error('TrueLayer did not provide a hosted payment URL.');
  }

  return { paymentId, hostedPageUrl };
}

function getAllowedWebhookJwksUrls(): Set<string> {
  const configured = (process.env.TRUELAYER_WEBHOOK_JWKS_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configured.length) return new Set(configured);

  return DEFAULT_ALLOWED_WEBHOOK_JWKS;
}

async function fetchJwks(jku: string): Promise<string> {
  const now = Date.now();
  const cached = jwksCache.get(jku);
  if (cached && cached.expiresAt > now) return cached.value;

  const response = await fetch(jku, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`Unable to fetch TrueLayer JWKs from ${jku}.`);
  }

  const body = await response.text();
  jwksCache.set(jku, { value: body, expiresAt: now + JWKS_CACHE_TTL_MS });
  return body;
}

function headersToObject(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export async function verifyTrueLayerWebhookSignature(request: Request, body: string): Promise<void> {
  const signature =
    request.headers.get('tl-signature') ||
    request.headers.get('Tl-Signature') ||
    request.headers.get('TL-SIGNATURE');
  if (!signature) {
    throw new Error('Missing Tl-Signature header.');
  }

  const jku = tlSigning.extractJku(signature);
  if (!jku) {
    throw new Error('Webhook signature does not contain a JKU.');
  }

  const allowedJwksUrls = getAllowedWebhookJwksUrls();
  if (!allowedJwksUrls.has(jku)) {
    throw new Error('Webhook signature JKU is not allowed.');
  }

  const jwks = await fetchJwks(jku);
  const url = new URL(request.url);
  const path = `${url.pathname}${url.search}`;

  tlSigning.verify({
    jwks,
    signature,
    method: request.method.toUpperCase() as unknown as tlSigning.HttpMethod,
    path,
    body,
    headers: headersToObject(request.headers),
  });
}

export function getTrueLayerPaymentConfigError(): string | null {
  const resolved = resolveTrueLayerConfig();
  if (!resolved.missingBases.length) return null;

  const suffix = getEnvironmentSuffix(resolved.environment);
  const preferred = resolved.missingBases.map((base) => `${base}_${suffix}`);
  return `Missing TrueLayer configuration for ${resolved.environment}: ${preferred.join(', ')} (or unsuffixed fallback vars).`;
}

export function getPaymentDisplayConfig(): PaymentDisplayConfig {
  const configError = getTrueLayerPaymentConfigError();

  const openBankingEnabled =
    parseEnvBoolean('PAYMENT_METHOD_OPEN_BANKING_ENABLED', true) && !configError;
  const bankTransferEnabled = parseEnvBoolean('PAYMENT_METHOD_BANK_TRANSFER_ENABLED', true);

  return {
    bankDetails: {
      accountName: readEnv('BANK_ACCOUNT_NAME') || DEFAULT_BANK_DETAILS.accountName,
      sortCode: readEnv('BANK_SORT_CODE') || DEFAULT_BANK_DETAILS.sortCode,
      accountNumber: readEnv('BANK_ACCOUNT_NUMBER') || DEFAULT_BANK_DETAILS.accountNumber,
    },
    paymentMethods: {
      openBanking: openBankingEnabled,
      bankTransfer: bankTransferEnabled,
    },
    truelayer: {
      environment: getTrueLayerEnvironment(),
      configured: !configError,
      configError,
    },
  };
}
