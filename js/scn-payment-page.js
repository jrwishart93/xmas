import { bootProtectedPage, initIcons } from '/js/app-common.js';
import {
  createCheckoutSession,
  getMembers,
  markBankTransferAsReceived,
  setScnPaymentMethod,
  subscribeScnById,
} from '/js/data.js';
import { money } from '/js/constants.js';

function getScnIdFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((part) => part === 'scn');
  return idx >= 0 ? parts[idx + 1] : null;
}

function feeFor(amountPence) {
  return Math.round(amountPence * 0.029 + 20);
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

bootProtectedPage(async (ctx) => {
  const scnId = getScnIdFromPath();
  const card = document.getElementById('scnPaymentCard');
  const members = await getMembers();
  const isAdmin = (ctx.membership?.role || '').toLowerCase() === 'admin';

  if (!scnId) {
    card.innerHTML = '<p class="muted">Invalid SCN route.</p>';
    return;
  }

  subscribeScnById(scnId, (scn) => {
    if (!scn) {
      card.innerHTML = '<p class="muted">SCN not found.</p>';
      return;
    }

    const ref = scn.bankReference || buildReference(scn.id, scn.accusedUserId || ctx.user.uid);
    const fee = feeFor(scn.amountPence || 0);
    const total = (scn.amountPence || 0) + fee;
    const clauseTitle = scn.clauseTitle || scn.clauseId || 'Unspecified Clause';

    card.innerHTML = `
      <section class="payment-section">
        <p class="eyebrow">SCN Details</p>
        <h2 class="section-header">${clauseTitle}</h2>
        <p><strong>Amount:</strong> ${money(scn.amountPence || 0)}</p>
        <p><strong>Status:</strong> ${paymentStatusBadge(scn.status || 'issued')}</p>
        <p class="muted"><strong>Issued:</strong> ${scn.createdAt?.toDate ? scn.createdAt.toDate().toLocaleString() : 'Pending timestamp'}</p>
      </section>

      <section class="payment-options-grid">
        <article class="card payment-option ${scn.paymentMethod === 'bank_transfer' ? 'payment-selected' : ''}" id="bankOption">
          <p class="section-header">Bank Transfer <span class="badge badge-paid">No Processing Fee</span></p>
          <p class="muted">Account name: Team Sigma Three Social Fund</p>
          <p class="muted">Sort code: 11-22-33</p>
          <p class="muted">Account number: 12345678</p>
          <p><strong>Reference:</strong> <code>${ref}</code></p>
          <div class="actions">
            <button type="button" class="secondary" id="copyBank">Copy account details</button>
            <button type="button" class="secondary" id="copyRef">Copy reference</button>
            <button type="button" id="setBank">Use Bank Transfer</button>
          </div>
          ${scn.paymentMethod === 'bank_transfer' ? '<p class="muted">Awaiting bank transfer confirmation.</p>' : ''}
          ${isAdmin && scn.status === 'awaiting_payment' && scn.paymentMethod === 'bank_transfer' ? '<button type="button" id="markPaid">Mark Bank Transfer as Received</button>' : ''}
        </article>

        <article class="card payment-option ${scn.paymentMethod === 'stripe' ? 'payment-selected' : ''}">
          <p class="section-header">Apple Pay / Google Pay <span class="badge badge-awaiting">Processing fee applies</span></p>
          <p class="muted">Outstanding Contribution: ${money(scn.amountPence || 0)}</p>
          <p class="muted">Fee: ${money(fee)}</p>
          <p><strong>Total: ${money(total)}</strong></p>
          <div class="actions">
            <button type="button" id="payNow">Pay Now</button>
          </div>
        </article>
      </section>
    `;

    document.getElementById('copyBank')?.addEventListener('click', () =>
      copyText('Team Sigma Three Social Fund\nSort code: 11-22-33\nAccount number: 12345678', 'Bank details')
    );
    document.getElementById('copyRef')?.addEventListener('click', () => copyText(ref, 'Reference'));

    document.getElementById('setBank')?.addEventListener('click', async () => {
      await setScnPaymentMethod({ scnId: scn.id, paymentMethod: 'bank_transfer', bankReference: ref });
    });

    document.getElementById('markPaid')?.addEventListener('click', async () => {
      const idToken = await ctx.user.getIdToken();
      await markBankTransferAsReceived({ idToken, scnId: scn.id });
    });

    document.getElementById('payNow')?.addEventListener('click', async () => {
      const idToken = await ctx.user.getIdToken();
      const result = await createCheckoutSession({ idToken, scnId: scn.id });
      if (result?.url) window.location.href = result.url;
    });

    initIcons();
  });
});
