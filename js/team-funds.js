const TEAM_MEMBER_DIRECTORY = [
  { name: 'Jamie Wishart', initials: 'JW', profilePath: '/app/team/#jamie-wishart' },
  { name: 'Lawrie MacKay', initials: 'LM', profilePath: '/app/team/#lawrie-mackay' },
  { name: 'Chris Beddows', initials: 'CB', profilePath: '/app/team/#chris-beddows' },
  { name: 'Adam J', initials: 'AJ', profilePath: '/app/team/#adam-j' },
  { name: 'Derek Niven', initials: 'DN', profilePath: '/app/team/#derek-niven' },
  { name: 'Paul Ewing', initials: 'PE', profilePath: '/app/team/#paul-ewing' },
];

export const paymentMemberMap = {
  'WISHART JR': 'Jamie Wishart',
  'L MacKay': 'Lawrie MacKay',
  'BEDDOWS C': 'Chris Beddows',
  'Adam Jardine': 'Adam J',
  'Derek Niven': 'Derek Niven',
  'Paul Ewing': 'Paul Ewing',
};

export const rawPayments = [
  { sourceName: 'WISHART JR', amount: 1 },
  { sourceName: 'WISHART JR', amount: 1 },
  { sourceName: 'WISHART JR', amount: 1 },
  { sourceName: 'L MacKay', amount: 1 },
  { sourceName: 'L MacKay', amount: 1 },
  { sourceName: 'BEDDOWS C', amount: 2 },
  { sourceName: 'BEDDOWS C', amount: 2 },
  { sourceName: 'Adam Jardine', amount: 3 },
  { sourceName: 'Adam Jardine', amount: 3 },
  { sourceName: 'Derek Niven', amount: 3 },
  { sourceName: 'Derek Niven', amount: 4 },
  { sourceName: 'Paul Ewing', amount: 3 },
];

export function formatFunds(amount) {
  return `£${Number(amount || 0).toFixed(2)}`;
}

export const mappedContributors = rawPayments.map((payment) => ({
  ...payment,
  memberName: paymentMemberMap[payment.sourceName] || payment.sourceName,
}));

export const leaderboardData = TEAM_MEMBER_DIRECTORY.map((member) => {
  const memberPayments = mappedContributors.filter((payment) => payment.memberName === member.name);
  const totalPaid = memberPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  return {
    ...member,
    amount: totalPaid,
    paymentCount: memberPayments.length,
  };
}).filter((member) => member.amount > 0);

export function getSortedTeamFunds() {
  return [...leaderboardData].sort(
    (a, b) =>
      b.amount - a.amount ||
      b.paymentCount - a.paymentCount ||
      a.name.localeCompare(b.name)
  );
}

export function getTeamFundsTotal() {
  return leaderboardData.reduce((sum, member) => sum + Number(member.amount || 0), 0);
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
  }
  return 1;
}
