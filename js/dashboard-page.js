import { bootProtectedPage } from '/js/app-common.js';
import { getTeamSummary, getLeaderboard, getMembers } from '/js/data.js';
import { money } from '/js/constants.js';

bootProtectedPage(async () => {
  const [team, leaderboardRows, members] = await Promise.all([getTeamSummary(), getLeaderboard(), getMembers()]);
  document.getElementById('fundTotal').textContent = money(team.moneyBalancePence || 0);
  const list = document.getElementById('leaderboard');
  list.innerHTML = '';
  leaderboardRows.slice(0, 5).forEach((row) => {
    const li = document.createElement('li');
    li.textContent = `${members.get(row.uid)?.displayName || row.uid}: ${money(row.totalPence)}`;
    list.appendChild(li);
  });
});
