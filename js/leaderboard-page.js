import { bootProtectedPage, initIcons, initPreviewGates } from '/js/app-common.js';
import { subscribeLeaderboard, getMembers } from '/js/data.js';
import { money } from '/js/constants.js';
import { PREVIEW_MODE } from '/js/config.js';
import { getPreviewLeaderboardFromArchive } from '/js/preview-data.js';

bootProtectedPage(async () => {
  const container = document.getElementById('rows');
  container.innerHTML = '';

  if (PREVIEW_MODE) {
    getPreviewLeaderboardFromArchive().forEach((row, index) => {
      const card = document.createElement('article');
      card.className = 'card leaderboard-card p-responsive';
      card.setAttribute('data-preview-gate', 'leaderboard-detail');
      card.innerHTML = `
        <h2 class="section-header"><i data-lucide="user" class="icon"></i>${row.name}</h2>
        <p class="metric">${row.amount}</p>
        <p class="muted">Rank #${index + 1}</p>
      `;
      container.appendChild(card);
    });

    initPreviewGates(container);
    initIcons();
    return;
  }

  const members = await getMembers();

  subscribeLeaderboard((rows) => {
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
});
