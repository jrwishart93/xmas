import { bootProtectedPage, initIcons } from '/js/app-common.js';
import { getLeaderboard, getMembers } from '/js/data.js';
import { money } from '/js/constants.js';

bootProtectedPage(async () => {
  const [rows, members] = await Promise.all([getLeaderboard(), getMembers()]);
  const container = document.getElementById('rows');
  container.innerHTML = '';

  rows.forEach((row, index) => {
    const card = document.createElement('article');
    card.className = 'card leaderboard-card p-responsive';
    card.innerHTML = `
      <h2 class="section-header"><i data-lucide="user" class="icon"></i>${members.get(row.uid)?.displayName || row.uid}</h2>
      <p class="metric">${money(row.totalPence)}</p>
      <p class="muted">Rank #${index + 1}</p>
    `;
    container.appendChild(card);
  });

  initIcons();
});
