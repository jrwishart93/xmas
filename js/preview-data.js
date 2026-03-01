import { TEAM } from '/archive/brewhemia-2025/team.js';

const PREVIEW_SECTIONS = [
  'Sec 1.1 Late for Duty',
  'Sec 1.2 Attendance on Incorrect Day',
  'Sec 2.1 Birthday (Personal)',
  'Sec 3.3 General Operational Error',
  'Sec 3.4 Speeding Notice (On or Off Duty)',
  'Sec 4.1 False Activation of Emergency Button',
  'Sec 5.3 Serious or Complex Arrest',
  'Sec 6.2 Award or Commendation',
];

const PREVIEW_NAMES = Object.values(TEAM)
  .map((member) => member?.name)
  .filter(Boolean)
  .sort((a, b) => a.localeCompare(b));

const hashString = (value = '') => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const makeAmountPence = (name) => {
  const hash = hashString(`preview-total-${name}`);
  return 800 + (hash % 2200);
};

export function getPreviewLeaderboardFromArchive() {
  const rows = PREVIEW_NAMES.map((name) => {
    const amountPence = makeAmountPence(name);
    return { name, amountPence, amount: `£${(amountPence / 100).toFixed(2)}` };
  });

  return rows.sort((a, b) => b.amountPence - a.amountPence).slice(0, 5);
}

export function getPreviewBalanceFromArchive() {
  const leaderboardTotal = getPreviewLeaderboardFromArchive().reduce((sum, row) => sum + row.amountPence, 0);
  const bufferPence = 5000 + (hashString('preview-buffer') % 15000);
  const totalPence = leaderboardTotal + bufferPence;
  return {
    valuePence: totalPence,
    formatted: `£${(totalPence / 100).toFixed(2)}`,
  };
}

export function getPreviewRecentActivityFromArchive() {
  const names = PREVIEW_NAMES.length ? PREVIEW_NAMES : ['Team Member'];

  return Array.from({ length: 6 }, (_, index) => {
    const name = names[index % names.length];
    const clause = PREVIEW_SECTIONS[(hashString(`${name}-clause-${index}`) + index) % PREVIEW_SECTIONS.length];
    const amount = 1 + (hashString(`${name}-amount-${index}`) % 3);
    return `${name} – ${clause} – £${amount}`;
  });
}
