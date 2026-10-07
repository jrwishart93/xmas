type ScnRecord = Record<string, unknown> | null | undefined;
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_LATE_PENALTY_MULTIPLIER = 2;
const DEFAULT_LATE_PENALTY_AFTER_DAYS = 3;

function parsePositivePence(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return Math.round(parsed);
}

function parsePositiveInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return Math.round(parsed);
}

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed < 0) return null;
  return Math.round(parsed);
}

function parseTimestampMs(value: unknown): number | null {
  if (!value) return null;

  if (typeof value === 'object' && value && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }

  if (typeof value === 'object' && value && '_seconds' in value) {
    const seconds = Number((value as { _seconds?: number })._seconds);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? value : value * 1000;
  }

  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

export function getScnOriginalAmountPence(scn: ScnRecord): number {
  if (!scn) return 0;

  const candidates = [scn.originalAmountPence, scn.finalAmountPence, scn.baseAmountPence, scn.amountPence];

  for (const candidate of candidates) {
    const amount = parsePositivePence(candidate);
    if (amount !== null) return amount;
  }

  return 0;
}

export function getScnPaymentBreakdown(
  scn: ScnRecord,
  options: { now?: number; statusOverride?: string } = {}
): {
  originalAmountPence: number;
  currentAmountPence: number;
  latePenaltyMultiplier: number;
  latePenaltyAfterDays: number;
  dueAtMs: number | null;
  latePenaltyAmountPence: number;
  latePenaltyDeltaPence: number;
  isLatePenaltyEligible: boolean;
  isLatePenaltyApplied: boolean;
  shouldPersistLatePenalty: boolean;
} {
  const originalAmountPence = getScnOriginalAmountPence(scn);
  if (!scn || originalAmountPence <= 0) {
    return {
      originalAmountPence: 0,
      currentAmountPence: 0,
      latePenaltyMultiplier: DEFAULT_LATE_PENALTY_MULTIPLIER,
      latePenaltyAfterDays: DEFAULT_LATE_PENALTY_AFTER_DAYS,
      dueAtMs: null,
      latePenaltyAmountPence: 0,
      latePenaltyDeltaPence: 0,
      isLatePenaltyEligible: false,
      isLatePenaltyApplied: false,
      shouldPersistLatePenalty: false,
    };
  }

  const parsedLatePenaltyMultiplier = parsePositiveInteger(scn.latePenaltyMultiplier);
  const parsedLatePenaltyAfterDays = parseNonNegativeInteger(scn.latePenaltyAfterDays);
  const latePenaltyMultiplier =
    parsedLatePenaltyMultiplier ?? DEFAULT_LATE_PENALTY_MULTIPLIER;
  const latePenaltyAfterDays =
    parsedLatePenaltyAfterDays ?? DEFAULT_LATE_PENALTY_AFTER_DAYS;
  // The payment clock starts when the case is decided, not when it was first raised.
  const issuedAtMs = parseTimestampMs(scn.resolvedAt) ?? parseTimestampMs(scn.createdAt);
  const dueAtMs = issuedAtMs ? issuedAtMs + latePenaltyAfterDays * DAY_MS : null;
  const status = options.statusOverride || String(scn.status || '');
  const now = options.now || Date.now();

  const storedCurrentAmount =
    parsePositivePence(scn.amountPaidPence) || parsePositivePence(scn.amountPence) || originalAmountPence;
  const latePenaltyAmountPence = Math.round(originalAmountPence * latePenaltyMultiplier);
  const isLatePenaltyEligible =
    status === 'awaiting_payment' &&
    dueAtMs !== null &&
    now > dueAtMs &&
    latePenaltyAmountPence > originalAmountPence;
  const shouldPersistLatePenalty = isLatePenaltyEligible && storedCurrentAmount < latePenaltyAmountPence;
  const currentAmountPence = shouldPersistLatePenalty ? latePenaltyAmountPence : storedCurrentAmount;
  const isLatePenaltyApplied =
    Boolean(scn.latePenaltyAppliedAt) || currentAmountPence > originalAmountPence || shouldPersistLatePenalty;

  return {
    originalAmountPence,
    currentAmountPence,
    latePenaltyMultiplier,
    latePenaltyAfterDays,
    dueAtMs,
    latePenaltyAmountPence,
    latePenaltyDeltaPence: Math.max(0, currentAmountPence - originalAmountPence),
    isLatePenaltyEligible,
    isLatePenaltyApplied,
    shouldPersistLatePenalty,
  };
}

export function getScnAmountPence(scn: ScnRecord, options?: { now?: number; statusOverride?: string }): number {
  return getScnPaymentBreakdown(scn, options).currentAmountPence;
}
