import { bootProtectedPage, initIcons } from '/js/app-common.js';
import {
  formatFunds,
  getRankAtIndex,
  getSortedTeamFunds,
  getTeamFundsSummary,
} from '/js/team-funds.js';

bootProtectedPage(async () => {
  const container = document.getElementById('rows');
  const totalAmount = document.getElementById('leaderboardTotalFunds');
  const memberCount = document.getElementById('leaderboardMemberCount');
  const paidCount = document.getElementById('leaderboardPaidCount');
  const summaryTotal = document.getElementById('leaderboardSummaryTotal');

  const sortedFunds = getSortedTeamFunds();
  const summary = getTeamFundsSummary();

  totalAmount.textContent = formatFunds(summary.total);
  memberCount.textContent = String(summary.memberCount);
  paidCount.textContent = String(summary.paidCount);
  summaryTotal.textContent = formatFunds(summary.total);

  container.innerHTML = '';

  sortedFunds.forEach((member, index) => {
    const card = document.createElement('article');
    card.className = 'leaderboard-row';
    const rank = getRankAtIndex(sortedFunds, index);
    const displayName = member.nickname ? `${member.name} (${member.nickname})` : member.name;

    card.innerHTML = `
      <span class="rank-badge">${rank}</span>
      <span class="member-initials" aria-hidden="true">${member.initials}</span>
      <div class="leaderboard-member-meta">
        <h2>${displayName}</h2>
      </div>
      <strong class="leaderboard-item-value">${formatFunds(member.amount)}</strong>
    `;
    container.appendChild(card);
  });

  initIcons();
});
