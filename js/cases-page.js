import { bootProtectedPage, initIcons } from '/js/app-common.js';
import { loadAct, flattenClauses } from '/js/act.js';
import { money, STAGE_LABELS } from '/js/constants.js';
import { MONZO_LINKS } from '/js/quick-pay-monzo.js';
import { createApi, escapeHtml, formatDate } from '/js/api.js';

const OPEN_STAGES = new Set(['awaiting_plea', 'court_requested']);

let api;
let state = { cases: [], members: [], me: null };
let clauses = [];
let mode = 'self';
let activeFilter = 'all';

function stageTone(item) {
  if (item.status === 'paid') return 'paid';
  if (item.stage === 'court_requested') return 'vote';
  if (item.stage === 'awaiting_plea') return 'open';
  if (item.canPay || item.amountDuePence > 0) return 'owed';
  return 'closed';
}

function stageLabel(item) {
  if (item.status === 'paid') return 'Paid';
  return STAGE_LABELS[item.stage] || item.stage;
}

// Monzo links exist for £1–£5, so larger amounts are split across links (e.g. £8 = £5 + £3).
function monzoParts(amountPence) {
  let remaining = Math.round(amountPence / 100);
  const parts = [];
  while (remaining > 0) {
    const chunk = Math.min(5, remaining);
    parts.push(chunk);
    remaining -= chunk;
  }
  return parts;
}

function timeLeft(closesAt) {
  const ms = (closesAt || 0) - Date.now();
  if (ms <= 0) return 'closing now';
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h left`;
  return `${Math.max(1, Math.round(ms / 60_000))}m left`;
}

function peopleLine(item) {
  if (item.stage === 'court_costs') return `${escapeHtml(item.accusedName)} owes court costs`;
  if (item.isConfession) return `${escapeHtml(item.accusedName)} owned up`;
  return `${escapeHtml(item.reporterName)} reported ${escapeHtml(item.accusedName)}`;
}

function amountLine(item) {
  if (item.status === 'paid') return `Paid ${money(item.amountPaidPence || item.finalAmountPence)}${item.paidAt ? ` on ${formatDate(item.paidAt)}` : ''}`;
  if (item.amountDuePence > 0) {
    const due = item.dueAt && !item.isLate ? ` • due ${formatDate(item.dueAt)}` : '';
    return `${money(item.amountDuePence)} to pay${item.isLate ? ' (doubled — paid late)' : due}`;
  }
  if (item.stage === 'court_acquitted') return 'Not upheld — nothing to pay';
  if (item.stage === 'dismissed') return 'Dismissed — nothing to pay';
  if (item.stage === 'court_requested') return `${money(item.baseAmountPence)}, or ${money(item.baseAmountPence * 2)} if upheld`;
  return `${money(item.baseAmountPence)} if accepted`;
}

function voteBlock(item) {
  if (!item.vote) return '';
  const { guilty, notGuilty, cast, eligible, myVote, closesAt } = item.vote;
  const guiltyShare = cast ? Math.round((guilty / cast) * 100) : 0;
  const isOpen = item.stage === 'court_requested';
  const header = isOpen
    ? `${cast} of ${eligible} vote${eligible === 1 ? '' : 's'} in • ${escapeHtml(timeLeft(closesAt))}`
    : `Final vote: ${guilty} guilty, ${notGuilty} not guilty`;

  return `
    <div class="case-vote">
      <p class="case-vote__meta muted">${header}</p>
      <div class="case-vote__bar" role="img" aria-label="${guilty} guilty, ${notGuilty} not guilty">
        <span class="case-vote__guilty" style="--share:${guiltyShare}%"></span>
      </div>
      <p class="case-vote__legend"><span>Guilty ${guilty}</span><span>Not guilty ${notGuilty}</span></p>
      ${myVote ? `<p class="case-vote__mine">You voted <strong>${myVote === 'guilty' ? 'guilty' : 'not guilty'}</strong>. You can change it until the vote closes.</p>` : ''}
    </div>
  `;
}

function actionsBlock(item) {
  const buttons = [];

  if (item.canPlead) {
    buttons.push(`<button type="button" class="btn" data-action="plead" data-value="guilty">Accept (${money(item.baseAmountPence)})</button>`);
    buttons.push(`<button type="button" class="btn secondary" data-action="plead" data-value="contest">Contest — send to team vote</button>`);
  }

  if (item.canVote) {
    const mine = item.vote?.myVote;
    buttons.push(`<button type="button" class="btn${mine === 'guilty' ? ' is-chosen' : ' secondary'}" data-action="vote" data-value="guilty" aria-pressed="${mine === 'guilty'}">Guilty</button>`);
    buttons.push(`<button type="button" class="btn${mine === 'not_guilty' ? ' is-chosen' : ' secondary'}" data-action="vote" data-value="not_guilty" aria-pressed="${mine === 'not_guilty'}">Not guilty</button>`);
  }

  if (item.canPay) {
    monzoParts(item.amountDuePence).forEach((pounds) => {
      buttons.push(`<a class="btn case-pay-link" href="${escapeHtml(MONZO_LINKS[pounds])}" target="_blank" rel="noopener noreferrer">Pay £${pounds} in Monzo</a>`);
    });
    buttons.push(`<button type="button" class="btn secondary" data-action="mark-paid">I’ve paid this</button>`);
  } else if (item.canAdminConfirmPaid) {
    buttons.push(`<button type="button" class="btn secondary" data-action="mark-paid">Mark as paid (admin)</button>`);
  }

  if (item.canCloseVote) buttons.push(`<button type="button" class="btn secondary" data-action="close-vote">Close vote now (admin)</button>`);
  if (item.canDismiss) buttons.push(`<button type="button" class="btn danger" data-action="dismiss">Dismiss (admin)</button>`);

  if (!buttons.length) return '';
  const payHint = item.canPay && monzoParts(item.amountDuePence).length > 1
    ? '<p class="muted case-card__hint">Monzo links go up to £5, so this is split into more than one payment.</p>'
    : '';
  return `<div class="case-card__actions">${buttons.join('')}</div>${payHint}`;
}

function caseCard(item, index) {
  return `
    <article class="case-card case-card--${stageTone(item)}" data-case-id="${escapeHtml(item.id)}" style="--stagger:${Math.min(index, 10)}">
      <header class="case-card__head">
        <span class="case-card__clause">${escapeHtml(item.clauseId)}</span>
        <h3>${escapeHtml(item.clauseTitle)}</h3>
        <span class="case-badge case-badge--${stageTone(item)}">${escapeHtml(stageLabel(item))}</span>
      </header>
      <p class="case-card__people">${peopleLine(item)} • ${escapeHtml(formatDate(item.createdAt))}</p>
      ${item.brief ? `<p class="case-card__brief">“${escapeHtml(item.brief)}”</p>` : ''}
      <p class="case-card__amount">${escapeHtml(amountLine(item))}</p>
      ${voteBlock(item)}
      ${actionsBlock(item)}
      <p class="case-card__status" role="status" hidden></p>
    </article>
  `;
}

function matchesFilter(item) {
  switch (activeFilter) {
    case 'open':
      return OPEN_STAGES.has(item.stage);
    case 'unpaid':
      return item.amountDuePence > 0 && item.status !== 'paid';
    case 'mine':
      return item.isAccused || item.isReporter;
    case 'closed':
      return !OPEN_STAGES.has(item.stage) && !(item.amountDuePence > 0 && item.status !== 'paid');
    default:
      return true;
  }
}

function render() {
  const needsYou = state.cases.filter((item) => item.canPlead || item.canPay || (item.canVote && !item.vote?.myVote));
  const needsSection = document.getElementById('needsYouSection');
  needsSection.hidden = needsYou.length === 0;
  document.getElementById('needsYouList').innerHTML = needsYou.map(caseCard).join('');

  const visible = state.cases.filter(matchesFilter);
  document.getElementById('caseList').innerHTML = visible.length
    ? visible.map(caseCard).join('')
    : '<p class="muted">No cases here yet.</p>';

  const open = state.cases.filter((item) => OPEN_STAGES.has(item.stage)).length;
  const votes = state.cases.filter((item) => item.stage === 'court_requested').length;
  const unpaid = state.cases.filter((item) => item.amountDuePence > 0 && item.status !== 'paid')
    .reduce((sum, item) => sum + item.amountDuePence, 0);
  document.getElementById('casesStats').innerHTML = `
    <span class="status-chip"><strong>${open}</strong> open</span>
    <span class="status-chip"><strong>${votes}</strong> team vote${votes === 1 ? '' : 's'}</span>
    <span class="status-chip"><strong>${money(unpaid)}</strong> unpaid</span>
  `;

  initIcons();
}

async function refresh() {
  state = await api('/api/cases');
  render();
}

function showCardStatus(card, message, isError) {
  const status = card?.querySelector('.case-card__status');
  if (!status) return;
  status.textContent = message;
  status.hidden = false;
  status.classList.toggle('is-error', Boolean(isError));
}

const CONFIRMATIONS = {
  'plead:contest': 'Send this to a 48-hour team vote? If it’s upheld the amount doubles.',
  'mark-paid': 'Only confirm once the Monzo payment has gone through.',
  dismiss: 'Dismiss this case? Nothing will be owed on it.',
  'close-vote': 'Close the vote now and settle the case on the votes cast so far?',
};

async function handleCaseAction(event) {
  const button = event.target instanceof Element ? event.target.closest('button[data-action]') : null;
  if (!button) return;
  const card = button.closest('[data-case-id]');
  const caseId = card?.dataset.caseId;
  if (!caseId) return;

  const action = button.dataset.action;
  const value = button.dataset.value;
  const confirmText = CONFIRMATIONS[`${action}:${value}`] || CONFIRMATIONS[action];
  if (confirmText && !window.confirm(confirmText)) return;

  const body = { action };
  if (action === 'plead') body.plea = value;
  if (action === 'vote') body.vote = value;

  card.querySelectorAll('button').forEach((item) => { item.disabled = true; });
  try {
    const result = await api(`/api/cases/${encodeURIComponent(caseId)}`, { method: 'POST', body });
    if (result.verdict === 'convicted') window.alert('The vote is in: the case is upheld.');
    if (result.verdict === 'acquitted') window.alert('The vote is in: the case is not upheld.');
    await refresh();
  } catch (error) {
    card.querySelectorAll('button').forEach((item) => { item.disabled = false; });
    showCardStatus(card, error.message, true);
  }
}

function fillClauses(select) {
  select.innerHTML = '<option value="">Choose a section…</option>' + clauses
    .map((clause) => `<option value="${escapeHtml(clause.code)}">${escapeHtml(clause.code)} ${escapeHtml(clause.title)} — ${money(clause.amountPence)}</option>`)
    .join('');
}

function fillMembers(select) {
  const others = state.members.filter((member) => member.uid !== state.me?.uid);
  select.innerHTML = '<option value="">Choose a team member…</option>' + others
    .map((member) => `<option value="${escapeHtml(member.uid)}">${escapeHtml(member.displayName)}</option>`)
    .join('');
}

function updatePreview() {
  const clause = clauses.find((item) => item.code === document.getElementById('caseClause').value);
  const preview = document.getElementById('casePreview');
  if (!clause) {
    preview.textContent = '';
    return;
  }
  preview.textContent = mode === 'self'
    ? `You’ll owe ${money(clause.amountPence)}. Pay within ${clause.latePenaltyAfterDays} days or it doubles.`
    : `They can accept (${money(clause.amountPence)}) or contest it. If contested and upheld it becomes ${money(clause.amountPence * 2)}; if not upheld you pay £1 court costs.`;
}

function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('.case-mode__tab').forEach((tab) => {
    tab.setAttribute('aria-selected', String(tab.dataset.mode === mode));
  });
  document.getElementById('accusedField').hidden = mode !== 'other';
  document.querySelector('#caseSubmit span').textContent = mode === 'self' ? 'Own up' : 'Send report';
  updatePreview();
}

function initForm() {
  fillClauses(document.getElementById('caseClause'));
  fillMembers(document.getElementById('caseAccused'));

  document.querySelectorAll('.case-mode__tab').forEach((tab) => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });
  document.getElementById('caseClause').addEventListener('change', updatePreview);

  const form = document.getElementById('caseForm');
  const status = document.getElementById('caseFormStatus');
  const submit = document.getElementById('caseSubmit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const clauseCode = document.getElementById('caseClause').value;
    const accusedUserId = mode === 'other' ? document.getElementById('caseAccused').value : state.me.uid;
    status.hidden = false;
    status.classList.remove('is-error');

    if (!clauseCode || !accusedUserId) {
      status.textContent = mode === 'other' ? 'Choose a team member and a section of the Act.' : 'Choose a section of the Act.';
      status.classList.add('is-error');
      return;
    }

    submit.disabled = true;
    try {
      await api('/api/cases', {
        method: 'POST',
        body: { accusedUserId, clauseCode, brief: document.getElementById('caseBrief').value },
      });
      form.reset();
      updatePreview();
      status.textContent = mode === 'self' ? 'Logged. You can pay it now under “Needs you”.' : 'Report sent. They’ll see it next time they open the app.';
      await refresh();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('is-error');
    } finally {
      submit.disabled = false;
    }
  });
}

function initFilters() {
  const filters = document.getElementById('caseFilters');
  filters.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('[data-filter]') : null;
    if (!button) return;
    activeFilter = button.dataset.filter;
    filters.querySelectorAll('[data-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    render();
  });
}

bootProtectedPage(async (ctx) => {
  api = createApi(ctx.user);
  document.querySelector('main').addEventListener('click', handleCaseAction);
  initFilters();

  try {
    const [act] = await Promise.all([loadAct(), refresh()]);
    clauses = flattenClauses(act);
    initForm();
    setMode(new URLSearchParams(window.location.search).get('mode') === 'report' ? 'other' : 'self');
  } catch (error) {
    document.getElementById('caseList').innerHTML = `<p class="muted">Unable to load cases: ${escapeHtml(error.message)}</p>`;
  }
});
