import { bootProtectedPage, initIcons, initPreviewGates } from '/js/app-common.js';
import {
  getMembers,
  getTrueLayerBalance,
  getTrueLayerConnectUrl,
  subscribeTeamSummary,
  subscribeLeaderboard,
  subscribeOutstandingScnCount,
} from '/js/data.js';
import { money } from '/js/constants.js';
import { PREVIEW_MODE } from '/js/config.js';
import {
  getPreviewBalanceFromArchive,
  getPreviewRecentActivityFromArchive,
} from '/js/preview-data.js';

const BANK_REFRESH_INTERVAL_MS = 60_000;

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
  if (!Number.isFinite(amount)) return '—';

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

function renderRecentPreviewActivity() {
  const findings = document.getElementById('recentFindings');
  findings.innerHTML = '';
  getPreviewRecentActivityFromArchive().slice(0, 4).forEach((entry) => {
    const li = document.createElement('li');
    const [actor, section, amount] = entry.split(' – ');
    li.innerHTML = `<span>${actor} — ${section}</span><strong>${amount}</strong>`;
    findings.appendChild(li);
  });
}

bootProtectedPage(async (ctx) => {
  const bankBalanceEl = document.getElementById('teamSocialFundBalance');
  const bankMetaEl = document.getElementById('teamSocialFundMeta');
  const connectBankBtn = document.getElementById('connectBankBtn');
  const refreshBankBtn = document.getElementById('refreshBankBalanceBtn');
  const isAdmin = (ctx.membership?.role || '').toLowerCase() === 'admin';

  if (PREVIEW_MODE) {
    const previewBalance = getPreviewBalanceFromArchive();
    document.getElementById('confirmedTotal').textContent = previewBalance.formatted;
    document.getElementById('pendingTotal').textContent = '£6.00';
    document.getElementById('outstandingCount').textContent = '3';

    bankBalanceEl.textContent = '£187.40';
    bankMetaEl.textContent = 'Preview balance from Team Social Fund Monzo account.';
    connectBankBtn.hidden = true;

    renderRecentPreviewActivity();
    initPreviewGates();
    initIcons();
    return;
  }

  const bankStatus = getBankStatusFromUrl();
  if (bankStatus.bank === 'connected') {
    bankMetaEl.textContent = 'Bank connected successfully. Loading latest balance…';
    clearBankStatusFromUrl();
  } else if (bankStatus.bank === 'error') {
    bankMetaEl.textContent = 'Bank connection failed. Please try connecting again.';
    clearBankStatusFromUrl();
  }

  const [members] = await Promise.all([getMembers()]);

  subscribeTeamSummary((team) => {
    animateCurrency(document.getElementById('confirmedTotal'), team.confirmedBalancePence || 0);
    document.getElementById('pendingTotal').textContent = money(team.pendingBalancePence || 0);
  });

  subscribeOutstandingScnCount(ctx.user.uid, (count) => {
    document.getElementById('outstandingCount').textContent = String(count);
  });

  const findings = document.getElementById('recentFindings');
  subscribeLeaderboard((leaderboardRows) => {
    findings.innerHTML = '';
    leaderboardRows.slice(0, 4).forEach((row, index) => {
      const li = document.createElement('li');
      li.innerHTML = `<span>#${index + 1} ${members.get(row.uid)?.displayName || row.uid}</span><strong>${money(row.totalPence)}</strong>`;
      findings.appendChild(li);
    });
  });

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

      bankBalanceEl.textContent = '—';

      if (code === 'not_connected' || code === 'token_expired') {
        if (isAdmin) {
          bankMetaEl.textContent = 'No bank connected yet. Use Connect Bank to link Monzo.';
          connectBankBtn.hidden = false;
        } else {
          bankMetaEl.textContent = 'Waiting for an admin to connect the Team Social Fund bank account.';
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
    },
    { once: true }
  );

  initPreviewGates();
  initIcons();
});
