import { bootProtectedPage, initIcons } from '/js/app-common.js';
import {
  createOpenBankingPayment,
  getPaymentConfig,
  markBankTransferAsReceived,
  setScnPaymentMethod,
  subscribeScnById,
} from '/js/data.js';
import { money } from '/js/constants.js';
import { getScnPaymentBreakdown } from '/js/scn-amount.js';

const DEFAULT_PAYMENT_CONFIG = {
  bankDetails: {
    accountName: 'Team Social Fund',
    sortCode: '40-00-05',
    accountNumber: '74984172',
  },
  paymentMethods: {
    openBanking: false,
    bankTransfer: true,
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizePaymentConfig(payload) {
  const bankDetails = payload?.bankDetails || {};
  const paymentMethods = payload?.paymentMethods || {};

  return {
    bankDetails: {
      accountName: bankDetails.accountName || DEFAULT_PAYMENT_CONFIG.bankDetails.accountName,
      sortCode: bankDetails.sortCode || DEFAULT_PAYMENT_CONFIG.bankDetails.sortCode,
      accountNumber: bankDetails.accountNumber || DEFAULT_PAYMENT_CONFIG.bankDetails.accountNumber,
    },
    paymentMethods: {
      openBanking: paymentMethods.openBanking !== false,
      bankTransfer: paymentMethods.bankTransfer !== false,
    },
  };
}

function getScnIdFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((part) => part === 'scn');
  return idx >= 0 ? parts[idx + 1] : null;
}

function formatDueWindow(breakdown) {
  if (!breakdown?.latePenaltyAfterDays) return 'No deadline';
  if (!breakdown?.dueAtMs) return `${breakdown.latePenaltyAfterDays} days from issue`;

  const dueDate = new Date(breakdown.dueAtMs);
  if (breakdown.isLatePenaltyApplied) {
    return `Expired on ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  return `${breakdown.latePenaltyAfterDays} days, by ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

function paymentStatusBadge(status) {
  if (status === 'paid') return '<span class="badge badge-paid">Paid</span>';
  if (status === 'awaiting_payment') return '<span class="badge badge-awaiting">Awaiting Payment</span>';
  return '<span class="badge">Issued</span>';
}

function buildReference(scnId, uid) {
  return `SCN-${scnId}-${uid.slice(0, 6).toUpperCase()}`;
}

async function copyText(value, label) {
  await navigator.clipboard.writeText(value);
  alert(`${label} copied.`);
}

function renderPaymentOptions({ scn, isAdmin, ref, breakdown, paymentConfig }) {
  const cards = [];
  const bank = paymentConfig.bankDetails;

  if (paymentConfig.paymentMethods.bankTransfer) {
    cards.push(`
      <article class="card payment-option ${scn.paymentMethod === 'bank_transfer' ? 'payment-selected' : ''}" id="bankOption">
        <p class="section-header">Bank Transfer <span class="badge badge-paid">No Processing Fee</span></p>
        <p class="muted">Account name: ${escapeHtml(bank.accountName)}</p>
        <p class="muted">Sort code: ${escapeHtml(bank.sortCode)}</p>
        <p class="muted">Account number: ${escapeHtml(bank.accountNumber)}</p>
        <p><strong>Reference:</strong> <code>${escapeHtml(ref)}</code></p>
        <div class="actions">
          <button type="button" class="secondary" id="copyBank">Copy account details</button>
          <button type="button" class="secondary" id="copyRef">Copy reference</button>
          <button type="button" id="setBank">Use Bank Transfer</button>
        </div>
        ${scn.paymentMethod === 'bank_transfer' ? '<p class="muted">Awaiting bank transfer confirmation.</p>' : ''}
        ${isAdmin && scn.status === 'awaiting_payment' && scn.paymentMethod === 'bank_transfer' ? '<button type="button" id="markPaid">Mark Bank Transfer as Received</button>' : ''}
      </article>
    `);
  }

  if (paymentConfig.paymentMethods.openBanking) {
    cards.push(`
      <article class="card payment-option ${scn.paymentMethod === 'truelayer' ? 'payment-selected' : ''}">
        <p class="section-header">Open Banking (TrueLayer) <span class="badge badge-paid">No Processing Fee</span></p>
        <p class="muted">Pay securely from your bank app (including Monzo) using TrueLayer.</p>
        <p><strong>Total: ${money(breakdown.currentAmountPence)}</strong></p>
        <div class="actions">
          <button type="button" id="payNow">Pay by Bank App</button>
        </div>
        ${scn.paymentMethod === 'truelayer' && scn.status === 'awaiting_payment' ? '<p class="muted">Payment started. Complete it in your bank app to update this SCN.</p>' : ''}
      </article>
    `);
  }

  if (!cards.length) {
    cards.push('<article class="card payment-option"><p class="muted">All payment methods are currently unavailable. Please contact an admin.</p></article>');
  }

  return cards.join('\n');
}

bootProtectedPage(async (ctx) => {
  const scnId = getScnIdFromPath();
  const card = document.getElementById('scnPaymentCard');
  const isAdmin = (ctx.membership?.role || '').toLowerCase() === 'admin';

  if (!scnId) {
    card.innerHTML = '<p class="muted">Invalid SCN reference.</p>';
    return;
  }

  let paymentConfig = DEFAULT_PAYMENT_CONFIG;
  try {
    paymentConfig = normalizePaymentConfig(await getPaymentConfig());
  } catch (error) {
    console.warn('Falling back to default payment config:', error);
  }

  subscribeScnById(scnId, (scn) => {
    if (!scn) {
      card.innerHTML = '<p class="muted">SCN not found.</p>';
      return;
    }

    const ref = scn.bankReference || buildReference(scn.id, scn.accusedUserId || ctx.user.uid);
    const breakdown = getScnPaymentBreakdown(scn);
    const clauseTitle = scn.clauseTitle || scn.clauseId || 'Unspecified Clause';
    const penaltySummary =
      breakdown.latePenaltyAmountPence > breakdown.originalAmountPence
        ? `increases to ${money(breakdown.latePenaltyAmountPence)}`
        : 'no change';
    const latePenaltyNotice = breakdown.isLatePenaltyApplied
      ? `
        <article class="card payment-option">
          <p class="section-header">Amount Adjustment Applied</p>
          <p><strong>Original:</strong> ${money(breakdown.originalAmountPence)}</p>
          <p><strong>Current:</strong> ${money(breakdown.currentAmountPence)}</p>
        </article>
      `
      : '';

    card.innerHTML = `
      <section class="payment-section">
        <p class="eyebrow">SCN summary</p>
        <h2 class="section-header">${escapeHtml(clauseTitle)}</h2>
        <p><strong>Contribution:</strong> ${money(breakdown.currentAmountPence)}</p>
        <p><strong>Due by:</strong> ${escapeHtml(formatDueWindow(breakdown))}</p>
        <p><strong>Adjustment after due date:</strong> ${escapeHtml(penaltySummary)}</p>
        <p><strong>Status:</strong> ${paymentStatusBadge(scn.status || 'issued')}</p>
        <p class="muted"><strong>Issued:</strong> ${scn.createdAt?.toDate ? scn.createdAt.toDate().toLocaleString() : 'Pending timestamp'}</p>
      </section>

      <section class="payment-options-grid">
        ${latePenaltyNotice}
        ${renderPaymentOptions({ scn, isAdmin, ref, breakdown, paymentConfig })}
      </section>
    `;

    const bankDetailsText = `${paymentConfig.bankDetails.accountName}\nSort code: ${paymentConfig.bankDetails.sortCode}\nAccount number: ${paymentConfig.bankDetails.accountNumber}`;

    document.getElementById('copyBank')?.addEventListener('click', () =>
      copyText(bankDetailsText, 'Bank details')
    );
    document.getElementById('copyRef')?.addEventListener('click', () => copyText(ref, 'Reference'));

    document.getElementById('setBank')?.addEventListener('click', async () => {
      const button = document.getElementById('setBank');
      if (button) button.disabled = true;
      try {
        const idToken = await ctx.user.getIdToken();
        await setScnPaymentMethod({
          idToken,
          scnId: scn.id,
          paymentMethod: 'bank_transfer',
          bankReference: ref,
        });
      } catch (error) {
        alert(error?.message || 'Unable to switch to bank transfer.');
        if (button) button.disabled = false;
      }
    });

    document.getElementById('markPaid')?.addEventListener('click', async () => {
      const button = document.getElementById('markPaid');
      if (button) button.disabled = true;
      try {
        const idToken = await ctx.user.getIdToken();
        await markBankTransferAsReceived({ idToken, scnId: scn.id });
      } catch (error) {
        alert(error?.message || 'Unable to mark bank transfer as received.');
        if (button) button.disabled = false;
      }
    });

    document.getElementById('payNow')?.addEventListener('click', async () => {
      const button = document.getElementById('payNow');
      if (button) button.disabled = true;
      try {
        const idToken = await ctx.user.getIdToken();
        const result = await createOpenBankingPayment({ idToken, scnId: scn.id });
        if (result?.url) {
          window.location.href = result.url;
          return;
        }
        alert('Unable to start Open Banking payment.');
        if (button) button.disabled = false;
      } catch (error) {
        alert(error?.message || 'Unable to start Open Banking payment.');
        if (button) button.disabled = false;
      }
    });

    initIcons();
  });
});
