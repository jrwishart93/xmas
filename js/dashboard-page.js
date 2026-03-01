import { bootProtectedPage } from '/js/app-common.js';
import { getTeamSummary, getLeaderboard, getMembers, getCasesForUser } from '/js/data.js';
import { money } from '/js/constants.js';

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

  if (!findings.children.length) {
    const li = document.createElement('li');
    li.innerHTML = '<span class="muted">No findings recorded yet.</span>';
    findings.appendChild(li);
  }
});
