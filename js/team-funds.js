const TEAM_MEMBER_DIRECTORY = [
  { name: 'Jamie Wishart', initials: 'JW', profilePath: '/app/team/#jamie-wishart' },
  { name: 'Lawrie MacKay', initials: 'LM', profilePath: '/app/team/#lawrie-mackay' },
  { name: 'Chris Beddows', initials: 'CB', profilePath: '/app/team/#chris-beddows' },
  { name: 'Adam J', initials: 'AJ', profilePath: '/app/team/#adam-j' },
  { name: 'Derek Niven', initials: 'DN', profilePath: '/app/team/#derek-niven' },
  { name: 'Paul Ewing', initials: 'PE', profilePath: '/app/team/#paul-ewing' },
  { name: 'Steve Hancock', initials: 'SH', profilePath: '/app/team/#steve-hancock' },
];

export const paymentNameMap = {
  'WISHART JR': 'Jamie Wishart',
  'L MacKay': 'Lawrie MacKay',
  'BEDDOWS C': 'Chris Beddows',
  'Adam Jardine': 'Adam J',
  'Derek Niven': 'Derek Niven',
  'Paul Ewing': 'Paul Ewing',
  'HANCOCK AJ&SP': 'Steve Hancock',
};

export const paymentMemberMap = paymentNameMap;

export const rawPayments = [
  { sourceName: 'Derek Niven', amount: 3 },
  { sourceName: 'Derek Niven', amount: 2 },
  { sourceName: 'Derek Niven', amount: 2 },
  { sourceName: 'Derek Niven', amount: 2 },
  { sourceName: 'Adam Jardine', amount: 3 },
  { sourceName: 'Adam Jardine', amount: 3 },
  { sourceName: 'Adam Jardine', amount: 3 },
  { sourceName: 'WISHART JR', amount: 3 },
  { sourceName: 'WISHART JR', amount: 3 },
  { sourceName: 'BEDDOWS C', amount: 2 },
  { sourceName: 'BEDDOWS C', amount: 2 },
  { sourceName: 'BEDDOWS C', amount: 1 },
  { sourceName: 'Paul Ewing', amount: 2 },
  { sourceName: 'Paul Ewing', amount: 2 },
  { sourceName: 'HANCOCK AJ&SP', amount: 2 },
  { sourceName: 'HANCOCK AJ&SP', amount: 1 },
  { sourceName: 'L MacKay', amount: 1 },
  { sourceName: 'L MacKay', amount: 1 },
];

export const teamFundAdjustments = [
  { description: 'Current fund balance reconciliation', amount: 2 },
];

export function formatFunds(amount) {
  return `£${Number(amount || 0).toFixed(2)}`;
}

export function formatContributionPercentage(value) {
  const rounded = Math.round(Number(value || 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function mapPaymentToMember(payment, nameMap = paymentNameMap) {
  return {
    ...payment,
    memberName: nameMap[payment.sourceName] || payment.sourceName,
  };
}

export function mapPaymentsToMembers(payments = rawPayments, nameMap = paymentNameMap) {
  return payments.map((payment) => mapPaymentToMember(payment, nameMap));
}

export const mappedContributors = mapPaymentsToMembers(rawPayments);

function buildLeaderboardData(payments = mappedContributors) {
  return TEAM_MEMBER_DIRECTORY.map((member) => {
    const memberPayments = payments.filter((payment) => payment.memberName === member.name);
    const totalPaid = memberPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return {
      ...member,
      amount: totalPaid,
      paymentCount: memberPayments.length,
      payments: memberPayments,
    };
  }).filter((member) => member.amount > 0);
}

export const leaderboardData = buildLeaderboardData(mappedContributors);

export function getSortedTeamFunds() {
  return [...leaderboardData].sort(
    (a, b) =>
      b.amount - a.amount ||
      b.paymentCount - a.paymentCount ||
      a.name.localeCompare(b.name)
  );
}

export function getTeamFundPaymentEntries() {
  return mappedContributors.map((payment) => ({
    name: payment.memberName,
    amountPence: Number(payment.amount || 0) * 100,
    sourceName: payment.sourceName,
  }));
}

export function getContributionsTotal() {
  return leaderboardData.reduce((sum, member) => sum + Number(member.amount || 0), 0);
}

export function getTeamFundsTotal() {
  const adjustmentTotal = teamFundAdjustments.reduce(
    (sum, adjustment) => sum + Number(adjustment.amount || 0),
    0
  );
  return getContributionsTotal() + adjustmentTotal;
}

export function getTeamFundsSummary() {
  const total = getTeamFundsTotal();
  const paidCount = leaderboardData.filter((member) => Number(member.amount || 0) > 0).length;
  const totalPayments = mappedContributors.length;
  return {
    memberCount: TEAM_MEMBER_DIRECTORY.length,
    paidCount,
    total,
    totalPayments,
  };
}

export function getRankAtIndex(sortedFunds, index) {
  if (index === 0) return 1;
  const current = sortedFunds[index];
  for (let i = index - 1; i >= 0; i -= 1) {
    const prev = sortedFunds[i];
    if (prev.amount > current.amount) return i + 2;
    if (prev.amount === current.amount && prev.paymentCount > current.paymentCount) return i + 2;
    if (
      prev.amount === current.amount &&
      prev.paymentCount === current.paymentCount &&
      prev.name.localeCompare(current.name) < 0
    ) {
      return i + 2;
    }
  }
  return 1;
}
