import { bootProtectedPage, initIcons } from '/js/app-common.js';
import { money } from '/js/constants.js';
import { createApi, escapeHtml, formatDate } from '/js/api.js';
import { getTeamFundsSummary } from '/js/team-funds.js';

let api;

function renderTotals(totalSpentPence) {
  const paidInPence = Math.round(Number(getTeamFundsSummary().total || 0) * 100);
  const leftPence = paidInPence - totalSpentPence;
  document.getElementById('spendIn').textContent = money(paidInPence);
  document.getElementById('spendOut').textContent = money(totalSpentPence);
  document.getElementById('spendLeft').textContent = money(leftPence);
  const share = paidInPence > 0 ? Math.min(100, Math.round((totalSpentPence / paidInPence) * 100)) : 0;
  document.getElementById('spendMeter').style.setProperty('--share', `${share}%`);
}

function renderList(items, canManage) {
  const list = document.getElementById('spendList');
  if (!items.length) {
    list.innerHTML = '<li class="muted">Nothing has been spent from the fund yet.</li>';
    return;
  }

  list.innerHTML = items.map((item, index) => `
    <li class="payment-history__item" style="--stagger:${Math.min(index, 12)}" data-id="${escapeHtml(item.id)}">
      <span class="member-initials" aria-hidden="true">£</span>
      <div class="payment-history__meta">
        <strong>${escapeHtml(item.description)}</strong>
        <span class="muted">${escapeHtml(formatDate(item.spentOn ? Date.parse(item.spentOn) : item.createdAt))}${item.createdByName ? ` • logged by ${escapeHtml(item.createdByName)}` : ''}</span>
      </div>
      <span class="spend-item__end">
        <strong class="payment-history__amount spend-item__amount">−${money(item.amountPence)}</strong>
        ${canManage ? '<button type="button" class="link-button" data-remove>Remove</button>' : ''}
      </span>
    </li>
  `).join('');
}

async function refresh() {
  const payload = await api('/api/disbursements');
  renderTotals(payload.totalSpentPence);
  renderList(payload.items, payload.canManage);
  document.getElementById('spendFormCard').hidden = !payload.canManage;
  initIcons();
}

function initForm() {
  const form = document.getElementById('spendForm');
  const status = document.getElementById('spendStatus');
  const submit = document.getElementById('spendSubmit');
  document.getElementById('spendDate').value = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.hidden = false;
    status.classList.remove('is-error');
    submit.disabled = true;
    try {
      await api('/api/disbursements', {
        method: 'POST',
        body: {
          description: document.getElementById('spendDescription').value,
          amount: document.getElementById('spendAmount').value,
          spentOn: document.getElementById('spendDate').value,
        },
      });
      form.reset();
      document.getElementById('spendDate').value = new Date().toISOString().slice(0, 10);
      status.textContent = 'Added to the spending log.';
      await refresh();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('is-error');
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById('spendList').addEventListener('click', async (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-remove]') : null;
    const id = button?.closest('[data-id]')?.dataset.id;
    if (!id || !window.confirm('Remove this entry from the spending log?')) return;
    button.disabled = true;
    try {
      await api(`/api/disbursements?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await refresh();
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  });
}

bootProtectedPage(async (ctx) => {
  api = createApi(ctx.user);
  initForm();
  try {
    await refresh();
  } catch (error) {
    document.getElementById('spendList').innerHTML = `<li class="muted">Unable to load spending: ${escapeHtml(error.message)}</li>`;
  }
});
