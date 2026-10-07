import { bootProtectedPage, initIcons, initPreviewGates } from '/js/app-common.js';
import { renderPayPanel } from '/js/pay-panel.js';
import { createApi, escapeHtml, formatDate } from '/js/api.js';
import { money } from '/js/constants.js';
import { getTeamFundsSummary } from '/js/team-funds.js';

function initialsFromName(name = '') {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'TS';
}

function formatRole(role = 'member') {
  return String(role || 'member')
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' ');
}

function getUserDisplayName(ctx) {
  return ctx.membership?.displayName || ctx.user?.displayName || ctx.user?.email?.split('@')[0] || 'Team Member';
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}


function initBreachInfoModal() {
  const trigger = document.getElementById('openBreachModal');
  const modal = document.getElementById('breachInfoModal');
  const closeBtn = document.getElementById('closeBreachModal');

  if (!(trigger && modal)) return;

  const openModal = () => {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
      return;
    }

    modal.setAttribute('open', 'open');
  };

  const closeModal = () => {
    if (typeof modal.close === 'function') {
      modal.close();
      return;
    }

    modal.removeAttribute('open');
  };

  trigger.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains('dashboard-info-modal__backdrop')) closeModal();
  });

  modal.addEventListener('cancel', () => {
    modal.removeAttribute('open');
  });
}

function initQuickPayConfirmation(ctx) {
  const paymentButtons = document.querySelectorAll('.dashboard-quick-payment-btn[data-amount]');
  const confirmArea = document.getElementById('quickPayConfirm');
  const confirmBtn = document.getElementById('quickPayConfirmBtn');
  const statusEl = document.getElementById('quickPayConfirmStatus');

  if (!confirmArea || !confirmBtn || !statusEl) return () => {};

  let pendingAmountPence = null;

  function showStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.className = `dashboard-quick-payment-confirm-status${isError ? ' dashboard-quick-payment-confirm-status--error' : ' dashboard-quick-payment-confirm-status--success'}`;
    statusEl.hidden = false;
  }

  const showConfirmFor = (pounds) => {
    if (!pounds) return;

    pendingAmountPence = pounds * 100;
    confirmBtn.textContent = `Confirm £${pounds} payment sent`;
    confirmBtn.disabled = false;
    statusEl.hidden = true;
    confirmArea.hidden = false;
  };

  paymentButtons.forEach((btn) => {
    btn.addEventListener('click', () => showConfirmFor(parseInt(btn.dataset.amount, 10)));
  });

  confirmBtn.addEventListener('click', async () => {
    if (!pendingAmountPence) return;

    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Recording...';

    try {
      const idToken = await ctx.user.getIdToken();
      const response = await fetch('/api/quick-pay/declaration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ amountPence: pendingAmountPence }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || 'Unable to record payment.');
      }

      const poundAmount = pendingAmountPence / 100;
      showStatus(`£${poundAmount} payment recorded. Thank you!`, false);
      pendingAmountPence = null;
      confirmBtn.textContent = 'Confirm payment sent';
    } catch (error) {
      showStatus(error instanceof Error ? error.message : 'Something went wrong. Please try again.', true);
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm payment sent';
    }
  });

  return showConfirmFor;
}

async function loadMemberSummary(ctx) {
  const summary = await createApi(ctx.user)('/api/member-summary');

  const needs = [];
  if (summary.awaitingMyPlea) needs.push(`${summary.awaitingMyPlea} case${summary.awaitingMyPlea === 1 ? '' : 's'} to answer`);
  if (summary.casesOwedByMe) needs.push(`${money(summary.owedByMe)} to pay`);
  if (summary.openVotes) needs.push(`${summary.openVotes} vote${summary.openVotes === 1 ? '' : 's'} waiting`);

  setText('tileCasesTitle', needs.length ? needs[0].charAt(0).toUpperCase() + needs[0].slice(1) : 'All clear');
  setText('tileCasesText', needs.length > 1
    ? `Also: ${needs.slice(1).join(', ')}.`
    : `${summary.openCases} open case${summary.openCases === 1 ? '' : 's'} across the team.`);

  const chip = document.getElementById('dashboardCasesChip');
  if (chip && needs.length) {
    setText('dashboardCasesChipText', `You have ${needs.join(', ')}`);
    chip.hidden = false;
  }

  const paidInPence = Math.round(Number(getTeamFundsSummary().total || 0) * 100);
  setText('tileFundTitle', `${money(paidInPence - summary.totalSpentPence)} left`);
  setText('tileFundText', `${money(paidInPence)} paid in, ${money(summary.totalSpentPence)} spent.`);
  setText('tileTeamTitle', `${summary.memberCount} member${summary.memberCount === 1 ? '' : 's'}`);

  const news = document.getElementById('tileNews');
  if (news && summary.announcements.length) {
    news.innerHTML = summary.announcements.map((item) => `
      <article class="dashboard-news__item">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.message)}</p>
        <span class="muted">${escapeHtml(formatDate(item.createdAt ? Date.parse(item.createdAt) : null))}</span>
      </article>
    `).join('');
  }
}

bootProtectedPage(async (ctx) => {
  const displayName = getUserDisplayName(ctx);
  const roleLabel = formatRole(ctx.membership?.role);
  const email = ctx.user?.email || 'Signed-in account';

  setText('dashboardGreeting', `Welcome back, ${displayName}`);
  setText('dashboardIdentity', 'Pay into the team fund below, or see who’s paid on the leaderboard.');
  setText('dashboardStatusText', 'Secure session active');
  setText('dashboardUserName', displayName);
  setText('dashboardEmail', email);
  const initials = initialsFromName(displayName);

  setText('dashboardRoleBadge', roleLabel);
  setText('dashboardAvatar', initials);
  setText('headerProfileAvatar', initials);

  initPreviewGates();
  initBreachInfoModal();
  const showConfirmFor = initQuickPayConfirmation(ctx);
  renderPayPanel(document.getElementById('dashboardPayPanel'), { onAmountChosen: showConfirmFor });
  initIcons();

  try {
    await loadMemberSummary(ctx);
  } catch (error) {
    setText('tileCasesTitle', 'Open cases');
    setText('tileCasesText', 'Unable to load your cases right now.');
    console.error(error);
  }
});
