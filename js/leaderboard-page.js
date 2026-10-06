import { bootProtectedPage, initIcons } from '/js/app-common.js';
import {
  formatFunds,
  getRankAtIndex,
  getSortedTeamFunds,
  getTeamFundsSummary,
  getPaymentHistory,
  formatContributionPercentage,
} from '/js/team-funds.js';
import { renderPayPanel } from '/js/pay-panel.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function formatPaidAt(paidAt) {
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonth(paidAt) {
  const date = new Date(paidAt);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function countUp(node, target) {
  if (!node) return;
  if (prefersReducedMotion) {
    node.textContent = formatFunds(target);
    return;
  }
  const duration = 1100;
  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    node.textContent = formatFunds(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function renderGrowthChart(container, history) {
  if (!container) return;
  const chronological = [...history].reverse();
  if (chronological.length < 2) {
    container.hidden = true;
    return;
  }

  const width = 320;
  const height = 110;
  const pad = 8;
  const firstTime = new Date(chronological[0].paidAt).getTime();
  const lastTime = new Date(chronological[chronological.length - 1].paidAt).getTime();
  const span = Math.max(1, lastTime - firstTime);

  let running = 0;
  const points = chronological.map((payment) => {
    running += payment.amount;
    return { time: new Date(payment.paidAt).getTime(), total: running };
  });
  const maxTotal = running || 1;
  const x = (time) => pad + ((time - firstTime) / span) * (width - pad * 2);
  const y = (total) => height - pad - (total / maxTotal) * (height - pad * 2);

  // Step line: the balance holds flat until the next payment lands.
  let line = `M ${x(points[0].time).toFixed(1)} ${y(0).toFixed(1)}`;
  points.forEach((point, index) => {
    const px = x(point.time).toFixed(1);
    const previousTotal = index === 0 ? 0 : points[index - 1].total;
    line += ` L ${px} ${y(previousTotal).toFixed(1)} L ${px} ${y(point.total).toFixed(1)}`;
  });
  const last = points[points.length - 1];
  const area = `${line} L ${x(last.time).toFixed(1)} ${height - pad} L ${x(points[0].time).toFixed(1)} ${height - pad} Z`;

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fundChartArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(91,122,255,0.45)" />
          <stop offset="1" stop-color="rgba(91,122,255,0)" />
        </linearGradient>
      </defs>
      <path class="fund-chart__area" d="${area}" fill="url(#fundChartArea)" />
      <path class="fund-chart__line" d="${line}" fill="none" pathLength="1" />
    </svg>
    <span class="fund-chart__dot" style="left:${((x(last.time) / width) * 100).toFixed(2)}%;top:${y(last.total).toFixed(1)}px"></span>
    <div class="fund-chart__axis muted">
      <span>${escapeHtml(formatPaidAt(chronological[0].paidAt))}</span>
      <span>${escapeHtml(formatPaidAt(chronological[chronological.length - 1].paidAt))}</span>
    </div>
  `;
}

function renderStandings(container, sortedFunds, summary) {
  container.innerHTML = '';
  const topAmount = sortedFunds[0]?.amount || 1;

  sortedFunds.forEach((member, index) => {
    const card = document.createElement('article');
    card.className = 'leaderboard-row';
    card.style.setProperty('--stagger', String(index));
    const rank = getRankAtIndex(sortedFunds, index);
    const percentage = formatContributionPercentage((member.amount / (summary.total || 1)) * 100);
    const barWidth = Math.max(6, Math.round((member.amount / topAmount) * 100));

    card.innerHTML = `
      <a class="leaderboard-row-link" href="${escapeHtml(member.profilePath)}" aria-label="View ${escapeHtml(member.name)} in team directory">
        <span class="rank-badge${rank <= 3 ? ` rank-${rank}` : ''}">${rank}</span>
        <span class="member-initials" aria-hidden="true">${escapeHtml(member.initials)}</span>
        <div class="leaderboard-member-meta">
          <h2>${escapeHtml(member.name)}</h2>
          <p>${member.paymentCount} payment${member.paymentCount === 1 ? '' : 's'} • ${percentage}% of the fund</p>
          <span class="progress-wrap"><span class="progress-bar" style="--bar-width:${barWidth}%"></span></span>
        </div>
        <strong class="leaderboard-item-value">${formatFunds(member.amount)}</strong>
      </a>
    `;
    container.appendChild(card);
  });
}

function renderHistory({ list, filters, count }, history, sortedFunds) {
  let activeMember = '';

  const filterNames = ['', ...sortedFunds.map((member) => member.name)];
  filters.innerHTML = filterNames
    .map((name) => `
      <button type="button" class="history-filter" data-member="${escapeHtml(name)}" aria-pressed="${name === '' ? 'true' : 'false'}">
        ${name ? escapeHtml(name) : 'Everyone'}
      </button>
    `)
    .join('');

  const draw = () => {
    const visible = activeMember ? history.filter((payment) => payment.memberName === activeMember) : history;
    const visibleTotal = visible.reduce((sum, payment) => sum + payment.amount, 0);
    count.textContent = `${visible.length} payment${visible.length === 1 ? '' : 's'} • ${formatFunds(visibleTotal)}`;

    let currentMonth = '';
    let html = '';
    visible.forEach((payment, index) => {
      const month = formatMonth(payment.paidAt);
      if (month !== currentMonth) {
        currentMonth = month;
        html += `<li class="payment-history__month" aria-hidden="true">${escapeHtml(month)}</li>`;
      }
      html += `
        <li class="payment-history__item" style="--stagger:${Math.min(index, 12)}">
          <span class="member-initials" aria-hidden="true">${escapeHtml(payment.initials)}</span>
          <div class="payment-history__meta">
            <a href="${escapeHtml(payment.profilePath)}">${escapeHtml(payment.memberName)}</a>
            <span class="muted">${escapeHtml(formatPaidAt(payment.paidAt))}${payment.reference ? ` • “${escapeHtml(payment.reference)}”` : ''}</span>
          </div>
          <strong class="payment-history__amount">+${formatFunds(payment.amount)}</strong>
        </li>
      `;
    });
    list.innerHTML = html || '<li class="muted">No payments yet.</li>';
  };

  filters.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('.history-filter') : null;
    if (!button) return;
    activeMember = button.dataset.member || '';
    filters.querySelectorAll('.history-filter').forEach((item) => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    draw();
  });

  draw();
}

bootProtectedPage(async () => {
  const sortedFunds = getSortedTeamFunds();
  const summary = getTeamFundsSummary();
  const history = getPaymentHistory();

  countUp(document.getElementById('leaderboardTotalFunds'), summary.total);
  document.getElementById('leaderboardContributorCount').textContent = String(summary.paidCount);
  document.getElementById('leaderboardPaymentCount').textContent = String(summary.totalPayments);
  document.getElementById('leaderboardSummaryTotal').textContent = formatFunds(summary.total);

  const latest = history[0];
  document.getElementById('fundHeroMeta').textContent = latest
    ? `${summary.totalPayments} payments from ${summary.paidCount} people • latest ${formatPaidAt(latest.paidAt)}`
    : 'No payments yet.';

  renderGrowthChart(document.getElementById('fundChart'), history);
  renderPayPanel(document.getElementById('payPanel'));
  renderStandings(document.getElementById('rows'), sortedFunds, summary);
  renderHistory(
    {
      list: document.getElementById('historyList'),
      filters: document.getElementById('historyFilters'),
      count: document.getElementById('historyCount'),
    },
    history,
    sortedFunds
  );

  initIcons();
});
