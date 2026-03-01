import { bootProtectedPage, initPreviewGates } from '/js/app-common.js';
import { loadAct, flattenClauses } from '/js/act.js';
import { createScn, getMembers, getCasesForUser, resolvePlea, resolveCourt } from '/js/data.js';
import { money, STAGE_LABELS } from '/js/constants.js';
import { PREVIEW_MODE } from '/js/config.js';
import { TEAM } from '/archive/brewhemia-2025/team.js';
import { getPreviewRecentActivityFromArchive } from '/js/preview-data.js';

let currentUser;
let membership;
let members;
let clauses;

function fillClauses(select) {
  select.innerHTML = clauses.map((c) => `<option value="${c.id}">${c.id} — ${c.title} (${money(c.typicalAmountPence)})</option>`).join('');
}

function caseCard(item, canPlea, canCourt) {
  const div = document.createElement('div');
  div.className = 'card';
  div.innerHTML = `<p><span class="badge">${STAGE_LABELS[item.stage] || item.stage}</span></p><p>Clause: ${item.clauseId}</p><p>Brief: ${item.brief || '—'}</p><p>Base: ${money(item.baseAmountPence)} | Final: ${money(item.finalAmountPence || 0)}</p>`;

  if (canPlea && item.stage === 'awaiting_plea') {
    const actions = document.createElement('div');
    actions.className = 'actions';
    const guilty = document.createElement('button');
    guilty.textContent = 'Plead Guilty';
    guilty.onclick = async () => { await resolvePlea({ scnId: item.id, action: 'guilty' }); await refreshCases(); };
    const court = document.createElement('button');
    court.className = 'secondary';
    court.textContent = 'Elect Kangaroo Court';
    court.onclick = async () => { await resolvePlea({ scnId: item.id, action: 'court' }); await refreshCases(); };
    actions.append(guilty, court);
    div.appendChild(actions);
  }

  if (canCourt && item.stage === 'court_requested') {
    const actions = document.createElement('div');
    actions.className = 'actions';
    const convicted = document.createElement('button');
    convicted.className = 'danger';
    convicted.textContent = 'Convicted (Double Fine)';
    convicted.onclick = async () => { await resolveCourt({ scnId: item.id, convicted: true }); await refreshCases(); };
    const acquitted = document.createElement('button');
    acquitted.className = 'secondary';
    acquitted.textContent = 'Acquitted';
    acquitted.onclick = async () => { await resolveCourt({ scnId: item.id, convicted: false }); await refreshCases(); };
    actions.append(convicted, acquitted);
    div.appendChild(actions);
  }

  return div;
}

function renderPreviewCards() {
  const sections = getPreviewRecentActivityFromArchive();
  const against = document.getElementById('againstMe');
  const raised = document.getElementById('iRaised');
  const resolved = document.getElementById('resolved');

  against.innerHTML = '';
  raised.innerHTML = '';
  resolved.innerHTML = '';

  sections.slice(0, 2).forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-preview-gate', 'case-preview');
    card.innerHTML = `<p><span class="badge">Awaiting Plea</span></p><p>${entry}</p>`;
    against.appendChild(card);
  });

  sections.slice(2, 4).forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-preview-gate', 'case-preview');
    card.innerHTML = `<p><span class="badge">Court Requested</span></p><p>${entry}</p>`;
    raised.appendChild(card);
  });

  sections.slice(4, 6).forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-preview-gate', 'case-preview');
    card.innerHTML = `<p><span class="badge">Resolved</span></p><p>${entry}</p>`;
    resolved.appendChild(card);
  });

  initPreviewGates();
}

async function refreshCases() {
  const data = await getCasesForUser(currentUser.uid);
  const against = document.getElementById('againstMe');
  const raised = document.getElementById('iRaised');
  const resolved = document.getElementById('resolved');

  against.innerHTML = '';
  data.allegationsAgainstMe.forEach((item) => against.appendChild(caseCard(item, true, membership.role === 'admin')));
  raised.innerHTML = '';
  data.allegationsIRaised.forEach((item) => raised.appendChild(caseCard(item, false, membership.role === 'admin')));
  resolved.innerHTML = '';
  data.resolvedCases.forEach((item) => resolved.appendChild(caseCard(item, false, false)));
}

bootProtectedPage(async (ctx) => {
  currentUser = ctx.user;
  membership = ctx.membership;
  clauses = await loadAct().then(flattenClauses);

  fillClauses(document.getElementById('confessClause'));
  fillClauses(document.getElementById('allegeClause'));

  const accusedSelect = document.getElementById('accusedUser');

  if (PREVIEW_MODE) {
    const previewMembers = Object.values(TEAM).map((m) => ({ uid: m.id, displayName: m.name }));
    accusedSelect.innerHTML = previewMembers.map((m) => `<option value="${m.uid}">${m.displayName}</option>`).join('');

    document.querySelectorAll('#confessForm button, #allegeForm button').forEach((button) => {
      button.setAttribute('data-preview-gate', 'issue-scn');
    });

    document.querySelectorAll('#confessForm, #allegeForm').forEach((form) => {
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        window.location.href = '/under-construction/';
      });
    });

    renderPreviewCards();
    initPreviewGates();
    return;
  }

  members = await getMembers();
  accusedSelect.innerHTML = [...members.values()].map((m) => `<option value="${m.uid}">${m.displayName}</option>`).join('');

  document.getElementById('confessForm').onsubmit = async (e) => {
    e.preventDefault();
    const clause = clauses.find((c) => c.id === document.getElementById('confessClause').value);
    await createScn({ issuedByUserId: currentUser.uid, accusedUserId: currentUser.uid, clauseId: clause.id, brief: document.getElementById('confessBrief').value, baseAmountPence: clause.typicalAmountPence });
    e.target.reset();
    fillClauses(document.getElementById('confessClause'));
    await refreshCases();
  };

  document.getElementById('allegeForm').onsubmit = async (e) => {
    e.preventDefault();
    const clause = clauses.find((c) => c.id === document.getElementById('allegeClause').value);
    await createScn({ issuedByUserId: currentUser.uid, accusedUserId: accusedSelect.value, clauseId: clause.id, brief: document.getElementById('allegeBrief').value, baseAmountPence: clause.typicalAmountPence });
    e.target.reset();
    fillClauses(document.getElementById('allegeClause'));
    await refreshCases();
  };

  await refreshCases();
});
