import { money } from '/js/constants.js';
import { renderLeaderboardSummary } from '/js/components-leaderboard.js';

const publicSummary = document.getElementById('publicSummary');

async function loadPublicSummary() {
  const response = await fetch('/api/public-summary');
  if (!response.ok) throw new Error('Unable to load public summary');

  const data = await response.json();

  renderLeaderboardSummary(publicSummary, {
    totalFund: money(data.socialFundTotalPence),
    entries: (data.leaderboard || []).map((entry) => ({
      name: entry.displayName,
      amount: money(entry.totalPence),
    })),
  });
}

loadPublicSummary().catch((error) => {
  renderLeaderboardSummary(publicSummary, {
    totalFund: '£0.00',
    entries: [],
  });

  const warning = document.createElement('p');
  warning.className = 'muted';
  warning.textContent = `Unable to load summary: ${error.message}`;
  publicSummary.appendChild(warning);
});
