import { bootProtectedPage, initPreviewGates } from '/js/app-common.js';
import {
  getMembers,
  subscribeTeamSummary,
  subscribeLeaderboard,
  subscribeOutstandingScnCount,
} from '/js/data.js';
import { money } from '/js/constants.js';
import { PREVIEW_MODE } from '/js/config.js';
import {
  getPreviewLeaderboardFromArchive,
  getPreviewBalanceFromArchive,
  getPreviewRecentActivityFromArchive,
} from '/js/preview-data.js';

function animateCurrency(node, valuePence = 0) {
  const duration = 850;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    node.textContent = money(Math.round(valuePence * progress));
    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

bootProtectedPage(async (ctx) => {
  if (PREVIEW_MODE) {
    const previewBalance = getPreviewBalanceFromArchive();
    const findings = document.getElementById('recentFindings');
    document.getElementById('confirmedTotal').textContent = previewBalance.formatted;
    document.getElementById('pendingTotal').textContent = '£6.00';
    document.getElementById('outstandingCount').textContent = '3';

    findings.innerHTML = '';
    getPreviewRecentActivityFromArchive().slice(0, 4).forEach((entry) => {
      const li = document.createElement('li');
      const [actor, section, amount] = entry.split(' – ');
      li.innerHTML = `<span>${actor} — ${section}</span><strong>${amount}</strong>`;
      findings.appendChild(li);
    });

    initPreviewGates();
    return;
  }

  const [members] = await Promise.all([getMembers()]);

  subscribeTeamSummary((team) => {
    animateCurrency(document.getElementById('confirmedTotal'), team.confirmedBalancePence || 0);
    document.getElementById('pendingTotal').textContent = money(team.pendingBalancePence || 0);
  });

  subscribeOutstandingScnCount(ctx.user.uid, (count) => {
    document.getElementById('outstandingCount').textContent = String(count);
  });

  const findings = document.getElementById('recentFindings');
  subscribeLeaderboard((leaderboardRows) => {
    findings.innerHTML = '';
    leaderboardRows.slice(0, 4).forEach((row, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>#${index + 1} ${members.get(row.uid)?.displayName || row.uid}</span><strong>${money(row.totalPence)}</strong>`;
      findings.appendChild(li);
    });
  });

  initPreviewGates();
});
