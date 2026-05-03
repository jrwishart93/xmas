export const teamFunds = [
  { name: 'Chris Beddows', initials: 'CB', amount: 3 },
  { name: 'Paul Ewing', initials: 'PE', amount: 3 },
  { name: 'Jamie Wishart', initials: 'JW', amount: 2 },
  { name: 'Adam J', initials: 'AJ', amount: 1 },
  { name: 'Steve Hancock', nickname: 'Santa', initials: 'SH', amount: 0 },
  { name: 'Lawrie MacKay', initials: 'LM', amount: 0 },
];

export function formatFunds(amount) {
  return `£${Number(amount || 0).toFixed(2)}`;
}

export function getSortedTeamFunds() {
  return [...teamFunds].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

export function getTeamFundsTotal() {
  return teamFunds.reduce((sum, member) => sum + Number(member.amount || 0), 0);
}

export function getTeamFundsSummary() {
  const total = getTeamFundsTotal();
  const paidCount = teamFunds.filter((member) => Number(member.amount || 0) > 0).length;
  return {
    memberCount: teamFunds.length,
    paidCount,
    total,
  };
}

export function getRankAtIndex(sortedFunds, index) {
  if (index === 0) return 1;
  const currentAmount = sortedFunds[index].amount;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (sortedFunds[i].amount > currentAmount) return i + 2;
  }
  return 1;
}
