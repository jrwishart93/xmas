import { bootProtectedPage, initIcons } from '/js/app-common.js';
import {
  formatFunds,
  getRankAtIndex,
  getSortedTeamFunds,
  getTeamFundsSummary,
  formatContributionPercentage,
} from '/js/team-funds.js';

bootProtectedPage(async () => {
  const container = document.getElementById('rows');
  const totalAmount = document.getElementById('leaderboardTotalFunds');
  const contributorCount = document.getElementById('leaderboardContributorCount');
  const paymentCount = document.getElementById('leaderboardPaymentCount');
  const summaryTotal = document.getElementById('leaderboardSummaryTotal');

  const sortedFunds = getSortedTeamFunds();
  const summary = getTeamFundsSummary();

  totalAmount.textContent = formatFunds(summary.total);
  contributorCount.textContent = String(summary.paidCount);
  paymentCount.textContent = String(summary.totalPayments);
  summaryTotal.textContent = formatFunds(summary.total);

  container.innerHTML = '';

  sortedFunds.forEach((member, index) => {
    const card = document.createElement('article');
    card.className = 'leaderboard-row';
    const rank = getRankAtIndex(sortedFunds, index);
    const percentageValue = (member.amount / (summary.total || 1)) * 100;
    const percentage = formatContributionPercentage(percentageValue);

    card.innerHTML = `
      <a class="leaderboard-row-link" href="${member.profilePath}" aria-label="View ${member.name} in team directory">
        <span class="rank-badge">${rank}</span>
        <span class="member-initials" aria-hidden="true">${member.initials}</span>
        <div class="leaderboard-member-meta">
          <h2>${member.name}</h2>
          <p>${member.paymentCount} payment${member.paymentCount === 1 ? '' : 's'} • ${percentage}% contribution</p>
          <span class="progress-wrap"><span class="progress-bar" style="width:${percentageValue}%"></span></span>
        </div>
        <strong class="leaderboard-item-value">${formatFunds(member.amount)}</strong>
      </a>
    `;
    container.appendChild(card);
  });

  initIcons();
});
