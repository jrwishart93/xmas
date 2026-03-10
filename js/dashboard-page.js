import { TEAM } from '/archive/brewhemia-2025/team.js';
import { bootProtectedPage, initIcons, initPreviewGates } from '/js/app-common.js';
import { money } from '/js/constants.js';
import { PREVIEW_MODE } from '/js/config.js';
import {
  getTrueLayerBalance,
  getTrueLayerConnectUrl,
  subscribeLeaderboard,
  subscribeMembers,
  subscribeOutstandingScnCount,
  subscribeTeamSummary,
} from '/js/data.js';
import {
  getPreviewBalanceFromArchive,
  getPreviewLeaderboardFromArchive,
} from '/js/preview-data.js';

const BANK_REFRESH_INTERVAL_MS = 60_000;
const MEMBER_PREVIEW_LIMIT = 6;

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] || character;
  });
}

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

function formatBankBalance(value, currency = 'GBP') {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return '--';

  if (currency === 'GBP') {
    return `£${amount.toFixed(2)}`;
  }

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currency || 'GBP',
  }).format(amount);
}

function getBankStatusFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    bank: params.get('bank'),
    reason: params.get('reason'),
  };
}

function clearBankStatusFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete('bank');
  url.searchParams.delete('reason');
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}

function previewMembers() {
  return Object.values(TEAM)
    .map((member, index) => ({
      uid: member.id,
      displayName: member.name,
      email: `${member.id}@preview.local`,
      role: index === 0 ? 'admin' : 'member',
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function updateIdentity(ctx) {
  const displayName = getUserDisplayName(ctx);
  const roleLabel = formatRole(ctx.membership?.role);
  const email = ctx.user?.email || 'Signed-in account';

  document.getElementById('dashboardGreeting').textContent = `Welcome back, ${displayName}`;
  document.getElementById('dashboardIdentity').textContent = `${roleLabel} access is active for ${email}.`;
  document.getElementById('dashboardStatusText').textContent = 'Secure session active';
  document.getElementById('dashboardMemberCount').textContent = 'Loading team members...';
  document.getElementById('dashboardUserName').textContent = displayName;
  document.getElementById('dashboardEmail').textContent = email;
  document.getElementById('dashboardRoleBadge').textContent = roleLabel;
  document.getElementById('dashboardAvatar').textContent = initialsFromName(displayName);
}

function renderLeaderboard(rows, membersById) {
  const findings = document.getElementById('recentFindings');
  findings.innerHTML = '';

  if (!rows.length) {
    findings.innerHTML = '<li class="leaderboard-mini-empty">No contribution payments have been recorded yet.</li>';
    return;
  }

  rows.slice(0, 5).forEach((row, index) => {
    const name = membersById.get(row.uid)?.displayName || row.uid;
    const item = document.createElement('li');
    item.className = 'leaderboard-mini-item';
    item.innerHTML = `
      <span class="leaderboard-mini-rank">#${index + 1}</span>
      <span class="leaderboard-mini-meta">
        <strong>${escapeHtml(name)}</strong>
        <span>90-day total</span>
      </span>
      <strong class="leaderboard-mini-value">${money(row.totalPence)}</strong>
    `;
    findings.appendChild(item);
  });
}

function renderMemberPreview(members, currentUid) {
  const container = document.getElementById('teamMembersList');
  const meta = document.getElementById('teamMembersMeta');
  const visibleMembers = members.slice(0, MEMBER_PREVIEW_LIMIT);

  document.getElementById('dashboardMemberCount').textContent = `${members.length} team member${members.length === 1 ? '' : 's'} connected`;
  meta.textContent = members.length
    ? `Showing ${visibleMembers.length} of ${members.length} team members.`
    : 'No team members found.';

  container.innerHTML = '';

  if (!members.length) {
    container.innerHTML = '<p class="member-empty-state">No team members found.</p>';
    return;
  }

  visibleMembers.forEach((member) => {
    const card = document.createElement('article');
    const isCurrentUser = member.uid === currentUid;
    const displayName = member.displayName || member.email || member.uid;
    const roleLabel = formatRole(member.role);

    card.className = `member-card${isCurrentUser ? ' member-card--current' : ''}`;
    card.innerHTML = `
      <div class="member-card__head">
        <span class="member-card__avatar" aria-hidden="true">${escapeHtml(initialsFromName(displayName))}</span>
        <div class="member-card__meta">
          <strong>${escapeHtml(displayName)}</strong>
          <span>${escapeHtml(member.email || 'Team account')}</span>
        </div>
      </div>
      <div class="member-card__footer">
        <span class="badge">${escapeHtml(roleLabel)}</span>
        ${isCurrentUser ? '<span class="member-card__you">You</span>' : ''}
      </div>
    `;
    container.appendChild(card);
  });
}

bootProtectedPage(async (ctx) => {
  const bankBalanceEl = document.getElementById('teamSocialFundBalance');
  const bankMetaEl = document.getElementById('teamSocialFundMeta');
  const connectBankBtn = document.getElementById('connectBankBtn');
  const refreshBankBtn = document.getElementById('refreshBankBalanceBtn');
  const isAdmin = (ctx.membership?.role || '').toLowerCase() === 'admin';
  const unsubscribers = [];
  const state = {
    leaderboardRows: [],
    membersById: new Map(),
  };

  updateIdentity(ctx);

  if (PREVIEW_MODE) {
    const members = previewMembers();
    const previewBalance = getPreviewBalanceFromArchive();
    const previewRows = getPreviewLeaderboardFromArchive().map((row, index) => ({
      uid: members[index % members.length]?.uid || `preview-${index + 1}`,
      totalPence: row.amountPence,
    }));

    document.getElementById('confirmedTotal').textContent = previewBalance.formatted;
    document.getElementById('pendingTotal').textContent = '£6.00';
    document.getElementById('outstandingCount').textContent = '3';
    bankBalanceEl.textContent = '£187.40';
    bankMetaEl.textContent = 'Illustrative balance from the Team Social Fund Monzo account.';
    connectBankBtn.hidden = true;
    refreshBankBtn.hidden = true;

    renderMemberPreview(members, ctx.user.uid);
    renderLeaderboard(
      previewRows,
      new Map(members.map((member) => [member.uid, member]))
    );

    initPreviewGates();
    initIcons();
    return;
  }

  const bankStatus = getBankStatusFromUrl();
  if (bankStatus.bank === 'connected') {
    bankMetaEl.textContent = 'Bank connected successfully. Loading latest balance...';
    clearBankStatusFromUrl();
  } else if (bankStatus.bank === 'error') {
    bankMetaEl.textContent = 'Bank connection was unsuccessful. Please try again.';
    clearBankStatusFromUrl();
  }

  unsubscribers.push(
    subscribeTeamSummary((team) => {
      animateCurrency(document.getElementById('confirmedTotal'), team.confirmedBalancePence || 0);
      document.getElementById('pendingTotal').textContent = money(team.pendingBalancePence || 0);
    })
  );

  unsubscribers.push(
    subscribeOutstandingScnCount(ctx.user.uid, (count) => {
      document.getElementById('outstandingCount').textContent = String(count);
    })
  );

  unsubscribers.push(
    subscribeMembers((members) => {
      state.membersById = new Map(members.map((member) => [member.uid, member]));
      renderMemberPreview(members, ctx.user.uid);
      renderLeaderboard(state.leaderboardRows, state.membersById);
      initIcons();
    })
  );

  unsubscribers.push(
    subscribeLeaderboard((rows) => {
      state.leaderboardRows = rows;
      renderLeaderboard(rows, state.membersById);
      initIcons();
    })
  );

  const loadBankBalance = async ({ silent = false } = {}) => {
    try {
      const idToken = await ctx.user.getIdToken();
      const payload = await getTrueLayerBalance({ idToken });

      bankBalanceEl.textContent = formatBankBalance(payload.balance, payload.currency || 'GBP');
      bankMetaEl.textContent = payload.lastUpdated
        ? `Last updated: ${new Date(payload.lastUpdated).toLocaleTimeString()}`
        : 'Connected to Team Social Fund Monzo account.';
      connectBankBtn.hidden = true;
    } catch (error) {
      const code = error?.code;

      bankBalanceEl.textContent = '--';

      if (code === 'not_connected' || code === 'token_expired') {
        if (isAdmin) {
          bankMetaEl.textContent = 'No bank connected yet. Use Connect Bank to link Monzo.';
          connectBankBtn.hidden = false;
        } else {
          bankMetaEl.textContent = 'Waiting for an admin to connect the team bank account.';
          connectBankBtn.hidden = true;
        }
      } else if (code === 'missing_config' || code === 'invalid_redirect_uri') {
        bankMetaEl.textContent = 'Bank integration is not configured in environment variables.';
        connectBankBtn.hidden = true;
      } else {
        bankMetaEl.textContent = error?.message || 'Unable to load bank balance.';
        connectBankBtn.hidden = !isAdmin;
      }

      if (!silent) {
        console.warn('Unable to load team bank balance:', error);
      }
    }

    initIcons();
  };

  connectBankBtn.hidden = !isAdmin;

  connectBankBtn?.addEventListener('click', async () => {
    if (!isAdmin) return;

    connectBankBtn.disabled = true;
    try {
      const idToken = await ctx.user.getIdToken();
      const payload = await getTrueLayerConnectUrl({ idToken });

      if (!payload?.url) {
        throw new Error('Consent URL was not returned by the server.');
      }

      window.location.href = payload.url;
    } catch (error) {
      alert(error?.message || 'Unable to start bank connection.');
      connectBankBtn.disabled = false;
    }
  });

  refreshBankBtn?.addEventListener('click', async () => {
    refreshBankBtn.disabled = true;
    await loadBankBalance();
    refreshBankBtn.disabled = false;
  });

  await loadBankBalance();

  const intervalId = window.setInterval(() => {
    loadBankBalance({ silent: true });
  }, BANK_REFRESH_INTERVAL_MS);

  window.addEventListener(
    'beforeunload',
    () => {
      window.clearInterval(intervalId);
      unsubscribers.forEach((unsubscribe) => unsubscribe?.());
    },
    { once: true }
  );

  initPreviewGates();
  initIcons();
});
