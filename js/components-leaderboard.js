export function renderLeaderboardSummary(container, { entries = [], totalFund = '£0.00' } = {}) {
  container.innerHTML = '';

  const total = document.createElement('p');
  total.className = 'leaderboard-total';
  total.innerHTML = `Team Fund Total: <strong>${totalFund}</strong>`;

  const title = document.createElement('h3');
  title.className = 'leaderboard-heading';
  title.textContent = 'Leaderboard (Top 5 · Last 90 Days)';

  const list = document.createElement('ol');
  list.className = 'leaderboard-list';

  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'leaderboard-empty';
    empty.textContent = 'No contributions recorded yet.';
    list.appendChild(empty);
  } else {
    entries.slice(0, 5).forEach(({ name, amount }) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-item';
      item.innerHTML = `<span>${name}</span><strong>${amount}</strong>`;
      list.appendChild(item);
    });
  }

  container.append(total, title, list);
}
