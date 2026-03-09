type ScnRecord = Record<string, unknown> | null | undefined;

function parsePositivePence(value: unknown): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed <= 0) return null;
  return Math.round(parsed);
}

export function getScnAmountPence(scn: ScnRecord): number {
  if (!scn) return 0;

  const candidates = [scn.amountPence, scn.finalAmountPence, scn.baseAmountPence];

  for (const candidate of candidates) {
    const amount = parsePositivePence(candidate);
    if (amount !== null) return amount;
  }

  return 0;
}
