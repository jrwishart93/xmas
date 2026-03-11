import { TEAM } from '/archive/brewhemia-2025/team.js';
import { loadAct, flattenClauses } from '/js/act.js';
import { bootProtectedPage, initIcons, initPreviewGates } from '/js/app-common.js';
import { money, STAGE_LABELS } from '/js/constants.js';
import { PREVIEW_MODE } from '/js/config.js';
import {
  getTrueLayerBalance,
  getTrueLayerConnectUrl,
  subscribeLeaderboard,
  subscribeMembers,
  subscribeOutstandingScns,
  subscribeTeamSummary,
} from '/js/data.js';
import {
  getPreviewBalanceFromArchive,
  getPreviewLeaderboardFromArchive,
} from '/js/preview-data.js';
import { initQuickPayMonzo } from '/js/quick-pay-monzo.js';
import { getScnPaymentBreakdown } from '/js/scn-amount.js';

const BANK_REFRESH_INTERVAL_MS = 60_000;
const MEMBER_PREVIEW_LIMIT = 6;
const OFFENCE_RESULT_LIMIT = 6;
const PREVIEW_FINE_CODES = ['4.6', '2.5', '3.4'];

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

function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function parseTimestampMs(value) {
  if (!value) return null;

  if (typeof value === 'object' && typeof value.toDate === 'function') {
    const date = value.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date.getTime() : null;
  }

  if (typeof value === 'object' && typeof value._seconds === 'number') {
    return value._seconds * 1000;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 10_000_000_000 ? value : value * 1000;
  }

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.getTime();
}

function formatShortDate(value) {
  const timestamp = parseTimestampMs(value);
  if (!timestamp) return 'recently';
  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatFineStatus(scn) {
  if (scn?.status === 'awaiting_payment') return 'Awaiting payment';
  if (scn?.status === 'paid') return 'Paid';
  if (scn?.stage && STAGE_LABELS[scn.stage]) return STAGE_LABELS[scn.stage];
  if (scn?.stage) return formatRole(scn.stage);
  return 'Issued';
}

function formatDueMessage(breakdown) {
  if (!breakdown?.dueAtMs) return 'Timing set by the Act';

  const dueDate = new Date(breakdown.dueAtMs);
  const dueText = dueDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });

  if (breakdown.isLatePenaltyApplied) {
    return `Late adjustment applied on ${dueText}`;
  }

  return `Due by ${dueText}`;
}

function getFinePillClass(breakdown) {
  if (breakdown?.isLatePenaltyApplied) return ' dashboard-fine-pill--danger';
  if (breakdown?.dueAtMs && breakdown.dueAtMs - Date.now() < 24 * 60 * 60 * 1000) {
    return ' dashboard-fine-pill--warning';
  }
  return '';
}

function buildFineLink(scnId) {
  return `/app/scn/${encodeURIComponent(scnId)}/`;
}

function isPayableFine(scn) {
  const status = normalizeText(scn?.status || '');
  const stage = normalizeText(scn?.stage || '');

  if (status === 'paid') return false;
  if (status === 'awaiting_payment') return true;
  if (!stage) return true;

  return stage === 'pleaded_guilty' || stage === 'court_convicted';
}

function buildClauseLookup(clauses) {
  const lookup = new Map();

  clauses.forEach((clause) => {
    const keys = [clause.id, clause.code].filter(Boolean);
    keys.forEach((key) => {
      lookup.set(normalizeText(key), clause);
    });
  });

  return lookup;
}

function resolveClause(scn, clauseLookup) {
  const key = normalizeText(scn?.clauseId || scn?.clauseCode || '');
  return clauseLookup.get(key) || null;
}

function buildSearchBlob(clause) {
  return normalizeText(
    [
      clause.id,
      clause.code,
      clause.title,
      clause.description,
      clause.partTitle,
      `part ${clause.partNumber}`,
    ].join(' ')
  );
}

function searchClauses(clauses, searchTerm) {
  const term = normalizeText(searchTerm);
  if (!term) return [];

  return clauses
    .map((clause) => {
      const code = normalizeText(clause.code || clause.id);
      const title = normalizeText(clause.title);
      const description = normalizeText(clause.description);
      const haystack = buildSearchBlob(clause);

      if (!haystack.includes(term)) return null;

      let score = 0;
      if (code === term) score += 120;
      if (code.startsWith(term)) score += 70;
      if (title.startsWith(term)) score += 55;
      if (title.includes(term)) score += 30;
      if (description.includes(term)) score += 12;

      return { clause, score };
    })
    .filter(Boolean)
    .sort((left, right) => right.score - left.score || left.clause.partNumber - right.clause.partNumber)
    .slice(0, OFFENCE_RESULT_LIMIT)
    .map((item) => item.clause);
}

function findMatchingOutstandingScns(clause, outstandingScns) {
  const keys = new Set([normalizeText(clause.id), normalizeText(clause.code)].filter(Boolean));
  return outstandingScns.filter((scn) => keys.has(normalizeText(scn?.clauseId || scn?.clauseCode || '')));
}

function buildPreviewOutstandingScns(clauses) {
  const now = Date.now();

  return PREVIEW_FINE_CODES.map((code, index) => {
    const clause = clauses.find((item) => String(item.code) === code) || clauses[index] || null;
    if (!clause) return null;

    const createdAt = new Date(now - (index + 1) * 24 * 60 * 60 * 1000).toISOString();

    return {
      id: `preview-${clause.code || index + 1}`,
      clauseId: clause.id || clause.code,
      clauseTitle: clause.title,
      accusedUserId: 'preview-user',
      baseAmountPence: clause.amountPence,
      latePenaltyMultiplier: clause.latePenaltyMultiplier,
      latePenaltyAfterDays: clause.latePenaltyAfterDays,
      createdAt,
      status: index === 0 ? 'awaiting_payment' : 'issued',
      stage: index === 2 ? 'court_requested' : 'pleaded_guilty',
    };
  }).filter(Boolean);
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

function ensureAdminActionCard() {
  const grid = document.querySelector('.dashboard-action-grid');
  if (!grid || grid.querySelector('[data-admin-action-card]')) return;

  const card = document.createElement('a');
  card.href = '/admin/';
  card.className = 'dashboard-action-card';
  card.dataset.adminActionCard = 'true';
  card.innerHTML = `
    <i data-lucide="shield" class="icon"></i>
    <strong>Admin Panel</strong>
    <span>Open member controls, banking, and ledger tools.</span>
  `;
  grid.appendChild(card);
}

function renderSearchResults(state) {
  const meta = document.getElementById('dashboardSearchMeta');
  const container = document.getElementById('dashboardSearchResults');
  const searchInput = document.getElementById('dashboardOffenceSearchInput');
  const term = searchInput?.value || '';

  if (!state.clauses.length) {
    meta.textContent = 'Offence search is unavailable right now.';
    container.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Unable to load offence data.</strong>
        <span>Please refresh the page and try again.</span>
      </div>
    `;
    return;
  }

  if (!normalizeText(term)) {
    meta.textContent = 'Search by offence code, title, or keyword. Suggested searches are above.';
    container.innerHTML = `
      <div class="dashboard-search-placeholder">
        <strong>Start with what you know.</strong>
        <span>Search by code like 4.6, or by words such as birthday, speeding, or promotion.</span>
      </div>
    `;
    return;
  }

  const results = searchClauses(state.clauses, term);

  if (!results.length) {
    meta.textContent = `No offences matched "${term}".`;
    container.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>No results found.</strong>
        <span>Try a shorter phrase or search by section code.</span>
      </div>
    `;
    return;
  }

  meta.textContent = `Showing ${results.length} matching offence${results.length === 1 ? '' : 's'}.`;
  container.innerHTML = results.map((clause) => {
    const matches = findMatchingOutstandingScns(clause, state.outstandingScns);
    const matchButtons = matches.slice(0, 2).map((scn) => {
      const breakdown = getScnPaymentBreakdown(scn);
      return `
        <a href="${buildFineLink(scn.id)}" class="btn">
          Pay ${escapeHtml(money(breakdown.currentAmountPence))} fine
        </a>
      `;
    }).join('');
    const extraMatches = matches.length > 2 ? `<span class="dashboard-search-note">+${matches.length - 2} more open fine${matches.length - 2 === 1 ? '' : 's'}</span>` : '';

    return `
      <article class="dashboard-search-result">
        <div class="dashboard-search-result__head">
          <div class="dashboard-search-result__badges">
            <span class="badge">${escapeHtml(clause.code || clause.id)}</span>
            <span class="dashboard-search-part">Part ${escapeHtml(clause.partNumber)} · ${escapeHtml(clause.partTitle || 'Act reference')}</span>
          </div>
          <strong class="dashboard-search-amount">${escapeHtml(money(clause.amountPence || 0))}</strong>
        </div>
        <h3>${escapeHtml(clause.title || clause.code || 'Offence')}</h3>
        <p>${escapeHtml(clause.description || 'No description provided.')}</p>
        <div class="dashboard-search-actions">
          <a href="/act/#section-${encodeURIComponent(clause.code || clause.id)}" class="btn secondary">Read clause</a>
          ${matchButtons}
          ${extraMatches}
        </div>
        <p class="dashboard-search-note">
          ${matches.length
            ? `${matches.length} open fine${matches.length === 1 ? '' : 's'} currently match this offence.`
            : 'No open fine currently matches this offence.'}
        </p>
      </article>
    `;
  }).join('');
}

function renderOpenFines(state) {
  const meta = document.getElementById('dashboardOpenFinesMeta');
  const container = document.getElementById('dashboardOpenFinesList');
  const count = state.outstandingScns.length;

  document.getElementById('outstandingCount').textContent = String(count);

  if (!count) {
    meta.textContent = 'No unpaid fines are assigned to you right now.';
    container.innerHTML = `
      <div class="dashboard-empty-state">
        <strong>Nothing waiting for payment.</strong>
        <span>When a notice is issued to you, it will appear here with a direct link to its payment page.</span>
      </div>
    `;
    return;
  }

  meta.textContent = `${count} open fine${count === 1 ? '' : 's'} ready to review and pay.`;
  container.innerHTML = state.outstandingScns.slice(0, 5).map((scn) => {
    const clause = resolveClause(scn, state.clauseLookup);
    const breakdown = getScnPaymentBreakdown(scn);
    const title = clause?.title || scn.clauseTitle || scn.clauseId || 'Open fine';
    const code = clause?.code || scn.clauseId || 'SCN';

    return `
      <article class="dashboard-fine-card">
        <div class="dashboard-fine-card__head">
          <div class="dashboard-fine-card__title-wrap">
            <div class="dashboard-fine-card__labels">
              <span class="badge">${escapeHtml(code)}</span>
              <span class="dashboard-fine-pill${getFinePillClass(breakdown)}">${escapeHtml(formatFineStatus(scn))}</span>
            </div>
            <h3>${escapeHtml(title)}</h3>
          </div>
          <strong class="dashboard-fine-card__amount">${escapeHtml(money(breakdown.currentAmountPence))}</strong>
        </div>
        <p class="dashboard-fine-card__meta">
          Issued ${escapeHtml(formatShortDate(scn.createdAt))} · ${escapeHtml(formatDueMessage(breakdown))}
        </p>
        <div class="actions">
          <a href="${buildFineLink(scn.id)}" class="btn">Pay now</a>
        </div>
      </article>
    `;
  }).join('');
}

function refreshFineHub(state) {
  renderSearchResults(state);
  renderOpenFines(state);
}

function bindSearchControls(state) {
  const searchInput = document.getElementById('dashboardOffenceSearchInput');
  if (searchInput?.dataset.bound === 'true') return;

  if (searchInput) {
    searchInput.dataset.bound = 'true';
    searchInput.addEventListener('input', () => {
      renderSearchResults(state);
    });
  }

  document.querySelectorAll('[data-dashboard-search-value]').forEach((button) => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      if (!searchInput) return;
      searchInput.value = button.dataset.dashboardSearchValue || '';
      searchInput.focus();
      renderSearchResults(state);
    });
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
    clauses: [],
    clauseLookup: new Map(),
    outstandingScns: [],
  };

  updateIdentity(ctx);
  if (isAdmin) {
    ensureAdminActionCard();
  }

  try {
    state.clauses = await loadAct().then(flattenClauses);
    state.clauseLookup = buildClauseLookup(state.clauses);
  } catch (error) {
    console.warn('Unable to load Act clauses for dashboard search:', error);
  }

  bindSearchControls(state);
  refreshFineHub(state);
  initQuickPayMonzo(document.getElementById('quickPayMonzoSection'));

  if (PREVIEW_MODE) {
    const members = previewMembers();
    const previewBalance = getPreviewBalanceFromArchive();
    const previewRows = getPreviewLeaderboardFromArchive().map((row, index) => ({
      uid: members[index % members.length]?.uid || `preview-${index + 1}`,
      totalPence: row.amountPence,
    }));

    document.getElementById('confirmedTotal').textContent = previewBalance.formatted;
    document.getElementById('pendingTotal').textContent = '£6.00';
    bankBalanceEl.textContent = '£187.40';
    bankMetaEl.textContent = 'Illustrative balance from the Team Social Fund Monzo account.';
    connectBankBtn.hidden = true;
    refreshBankBtn.hidden = true;
    state.outstandingScns = buildPreviewOutstandingScns(state.clauses).filter(isPayableFine);

    renderMemberPreview(members, ctx.user.uid);
    renderLeaderboard(
      previewRows,
      new Map(members.map((member) => [member.uid, member]))
    );
    refreshFineHub(state);

    initQuickPayMonzo(document.getElementById('quickPayMonzoSection'));
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
    subscribeOutstandingScns(ctx.user.uid, (items) => {
      state.outstandingScns = items.filter(isPayableFine);
      refreshFineHub(state);
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
