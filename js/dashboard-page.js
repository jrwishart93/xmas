import { bootProtectedPage, initPreviewGates } from '/js/app-common.js';
import { getTeamSummary, getLeaderboard, getMembers, getCasesForUser } from '/js/data.js';
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
    document.getElementById('fundTotal').textContent = previewBalance.formatted;
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

  const [team, leaderboardRows, members, caseData] = await Promise.all([
    getTeamSummary(),
    getLeaderboard(),
    getMembers(),
    getCasesForUser(ctx.user.uid),
  ]);

  const totalPence = team.moneyBalancePence || 0;
  animateCurrency(document.getElementById('fundTotal'), totalPence);

  const outstanding = (caseData.allegationsAgainstMe || []).filter((item) => item.stage !== 'resolved').length;
  document.getElementById('outstandingCount').textContent = String(outstanding);

  const findings = document.getElementById('recentFindings');
  findings.innerHTML = '';

  leaderboardRows.slice(0, 4).forEach((row, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>#${index + 1} ${members.get(row.uid)?.displayName || row.uid}</span><strong>${money(row.totalPence)}</strong>`;
    findings.appendChild(li);
  });

  initPreviewGates();
});
