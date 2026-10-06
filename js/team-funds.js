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

// Every incoming payment to the team Monzo account, newest first.
// Source: Monzo data export, 7 October 2026. `sourceName` is the payer name Monzo shows;
// paymentNameMap links it to a team member.
export const rawPayments = [
  { id: 'tx_0000BArxA26JG3vjqG3Y1M', paidAt: '2026-09-28T14:36', sourceName: 'Derek Niven', amount: 3 },
  { id: 'tx_0000BACZR55B3rlhLXQtU2', paidAt: '2026-09-08T15:27', sourceName: 'Derek Niven', amount: 2 },
  { id: 'tx_0000B9H7CfPDrFb3ORAnq6', paidAt: '2026-08-11T22:12', sourceName: 'WISHART JR', amount: 1 },
  { id: 'tx_0000B8fkIfMNSF2tdt1ZsP', paidAt: '2026-07-24T21:31', sourceName: 'Derek Niven', amount: 1 },
  { id: 'tx_0000B8fkGdC4XNqv2r5z3q', paidAt: '2026-07-24T21:31', sourceName: 'Adam Jardine', amount: 2, reference: 'Sent from Revolut' },
  { id: 'tx_0000B8YIazhCQa8kJD7GbK', paidAt: '2026-07-21T07:18', sourceName: 'BEDDOWS C', amount: 3 },
  { id: 'tx_0000B8KW8zixPImxDpx2AM', paidAt: '2026-07-14T15:44', sourceName: 'WISHART JR', amount: 1 },
  { id: 'tx_0000B7eWWlAf0TgqhOdiQT', paidAt: '2026-06-24T09:30', sourceName: 'BEDDOWS C', amount: 2 },
  { id: 'tx_0000B7eWSGTpAmvmb9PJ4M', paidAt: '2026-06-24T09:29', sourceName: 'BEDDOWS C', amount: 1 },
  { id: 'tx_0000B7UU7OMEXvtk8FhkRd', paidAt: '2026-06-19T13:16', sourceName: 'Adam Jardine', amount: 3, reference: 'A/L, Anniversary' },
  { id: 'tx_0000B7OHtLcPZKRtNHWFko', paidAt: '2026-06-16T13:31', sourceName: 'Derek Niven', amount: 2 },
  { id: 'tx_0000B72ytAiU7kIrUBOQbq', paidAt: '2026-06-06T06:49', sourceName: 'Adam Jardine', amount: 1, reference: 'Logged on fine' },
  { id: 'tx_0000B6p8I9NwOF6m4jl2H4', paidAt: '2026-05-30T14:28', sourceName: 'HANCOCK AJ&SP', amount: 2 },
  { id: 'tx_0000B6ibUEgU3EvjNKXqXR', paidAt: '2026-05-27T10:52', sourceName: 'Derek Niven', amount: 1 },
  { id: 'tx_0000B6dNXouzQ7Qg7dBFGk', paidAt: '2026-05-24T22:23', sourceName: 'WISHART JR', amount: 5 },
  { id: 'tx_0000B6YfcOWnnCjSETrPqT', paidAt: '2026-05-22T15:52', sourceName: 'Derek Niven', amount: 1 },
  { id: 'tx_0000B6WOkvXkq4fyRG25zP', paidAt: '2026-05-21T13:33', sourceName: 'Paul Ewing', amount: 1 },
  { id: 'tx_0000B6W3eIt1YNvwOU71ov', paidAt: '2026-05-21T09:37', sourceName: 'Adam Jardine', amount: 3, reference: 'Adam J fines' },
  { id: 'tx_0000B6W1kZwAs8PCM6hdRJ', paidAt: '2026-05-21T09:16', sourceName: 'BEDDOWS C', amount: 1 },
  { id: 'tx_0000B6SJNGIkjUtYZIITM9', paidAt: '2026-05-19T14:14', sourceName: 'HANCOCK AJ&SP', amount: 1 },
  { id: 'tx_0000B6RmzQ2BhKHKJX6ws6', paidAt: '2026-05-19T08:11', sourceName: 'WISHART JR', amount: 1 },
  { id: 'tx_0000B6HtvLkCSkdKHN23gA', paidAt: '2026-05-14T13:42', sourceName: 'L MacKay', amount: 1 },
  { id: 'tx_0000B69eVpdReYUspkVnTm', paidAt: '2026-05-10T14:12', sourceName: 'Derek Niven', amount: 1 },
  { id: 'tx_0000B690reeBBup9CQatI9', paidAt: '2026-05-10T06:47', sourceName: 'BEDDOWS C', amount: 1 },
  { id: 'tx_0000B61Saxi8IofoTkgWdV', paidAt: '2026-05-06T15:20', sourceName: 'Derek Niven', amount: 6 },
  { id: 'tx_0000B61GhxfNfP9CpD05rf', paidAt: '2026-05-06T13:07', sourceName: 'L MacKay', amount: 1 },
  { id: 'tx_0000B61GTLWAhn2FkFz9Bi', paidAt: '2026-05-06T13:04', sourceName: 'Adam Jardine', amount: 5 },
  { id: 'tx_0000B5v72zB94fjporVBxr', paidAt: '2026-05-03T13:51', sourceName: 'Adam Jardine', amount: 1 },
  { id: 'tx_0000B4mklFe7JOueGMsYNt', paidAt: '2026-03-30T15:11', sourceName: 'BEDDOWS C', amount: 3 },
  { id: 'tx_0000B4mkOAIh1LKxf4VG3W', paidAt: '2026-03-30T15:07', sourceName: 'Paul Ewing', amount: 3 },
  { id: 'tx_0000B4EAyTkVz8u4fkYu5y', paidAt: '2026-03-13T21:50', sourceName: 'WISHART JR', amount: 1 },
  { id: 'tx_0000B4EAaEgeKqq8Q2aCXJ', paidAt: '2026-03-13T21:46', sourceName: 'WISHART JR', amount: 1 },
];

// The ledger above is the full Monzo history, so no reconciliation adjustment is needed.
export const teamFundAdjustments = [];

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

export function getPaymentHistory() {
  const directory = new Map(TEAM_MEMBER_DIRECTORY.map((member) => [member.name, member]));
  return [...mappedContributors]
    .sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)))
    .map((payment) => {
      const member = directory.get(payment.memberName);
      return {
        id: payment.id,
        paidAt: payment.paidAt,
        amount: Number(payment.amount || 0),
        reference: payment.reference || '',
        memberName: payment.memberName,
        initials: member?.initials || String(payment.memberName || '?').slice(0, 2).toUpperCase(),
        profilePath: member?.profilePath || '/app/team/',
      };
    });
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
