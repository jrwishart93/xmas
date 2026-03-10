export function renderLeaderboardSummary(container, { entries = [], totalFund = '£0.00' } = {}) {
  container.innerHTML = '';

  const totalLabel = document.createElement('p');
  totalLabel.className = 'fund-label';
  totalLabel.textContent = 'TEAM FUND BALANCE';

  const total = document.createElement('p');
  total.className = 'fund-amount';
  total.innerHTML = `<strong id="fundAmount" data-value="${totalFund}">${totalFund}</strong>`;

  const title = document.createElement('h3');
  title.className = 'leaderboard-heading';
  title.textContent = '90-Day Contribution Summary';

  const list = document.createElement('ol');
  list.className = 'leaderboard-list';

  if (!entries.length) {
    const empty = document.createElement('li');
    empty.className = 'leaderboard-empty muted';
    empty.textContent = 'No contributions recorded yet.';
    list.appendChild(empty);
  } else {
    const maxAmount = Math.max(...entries.slice(0, 5).map(({ amountPence = 0 }) => amountPence), 1);

    entries.slice(0, 5).forEach(({ name, amount, amountPence = 0 }, index) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-item';
      const medalClass = index < 3 ? `rank-${index + 1}` : '';
      const percent = Math.max(8, Math.round((amountPence / maxAmount) * 100));
      const status = index === 0 ? '<span class="status-tag">Highest Total</span>' : '';

      item.innerHTML = `
        <span class="rank-badge ${medalClass}">${index + 1}</span>
        <span class="contributor-name">${name} ${status}</span>
        <strong class="leaderboard-item-value">${amount}</strong>
        <span class="progress-wrap"><span class="progress-bar" style="width:${percent}%"></span></span>
      `;
      list.appendChild(item);
    });
  }

  container.append(totalLabel, total, title, list);
}
