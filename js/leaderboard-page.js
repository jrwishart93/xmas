import { bootProtectedPage } from '/js/app-common.js';
import { getLeaderboard, getMembers } from '/js/data.js';
import { money } from '/js/constants.js';

bootProtectedPage(async () => {
  const [rows, members] = await Promise.all([getLeaderboard(), getMembers()]);
  const tbody = document.getElementById('rows');
  tbody.innerHTML = '';
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${members.get(row.uid)?.displayName || row.uid}</td><td>${money(row.totalPence)}</td>`;
    tbody.appendChild(tr);
  });
});
