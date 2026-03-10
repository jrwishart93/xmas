import '/firebase.js';
import { initIcons, initMobileNav } from '/js/app-common.js';
import { money } from '/js/constants.js';
import { renderLeaderboardSummary } from '/js/components-leaderboard.js';

const publicSummary = document.getElementById('publicSummary');

function animateCurrencyValue(node, valuePence = 0) {
  const duration = 900;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const currentPence = Math.round(valuePence * progress);
    node.textContent = money(currentPence);
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

async function loadPublicSummary() {
  const response = await fetch('/api/public-summary');
  if (!response.ok) throw new Error('Unable to load the fund summary');

  const data = await response.json();

  renderLeaderboardSummary(publicSummary, {
    totalFund: money(data.socialFundTotalPence),
    entries: (data.leaderboard || []).map((entry) => ({
      name: entry.displayName,
      amount: money(entry.totalPence),
      amountPence: entry.totalPence,
    })),
  });

  const fundAmount = document.getElementById('fundAmount');
  if (fundAmount) animateCurrencyValue(fundAmount, data.socialFundTotalPence || 0);
}

loadPublicSummary().catch((error) => {
  renderLeaderboardSummary(publicSummary, {
    totalFund: '£0.00',
    entries: [],
  });

  const warning = document.createElement('p');
  warning.className = 'muted';
  warning.textContent = `Unable to load the summary: ${error.message}`;
  publicSummary.appendChild(warning);
});

initMobileNav();
initIcons();
