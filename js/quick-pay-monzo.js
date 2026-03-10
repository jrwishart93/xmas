// Quick Pay via Monzo — temporary payment widget for the member dashboard.
// No imports. All offence data is embedded to avoid a runtime HTTP request.
// This module is intentionally temporary while TrueLayer/Open Banking is integrated.

const MONZO_LINKS = {
  1: 'https://monzo.com/pay/r/team-funds_aRlKSNC7qhSOwp?from_qr=true',
  2: 'https://monzo.com/pay/r/team-funds_CPB94nTOohBqbA?from_qr=true',
  3: 'https://monzo.com/pay/r/team-funds_y4u0pUaquscHIr?from_qr=true',
  4: 'https://monzo.com/pay/r/team-funds_gULPWd7vCdIgI0?from_qr=true',
  5: 'https://monzo.com/pay/r/team-funds_ic1AXddsyKMpjz?from_qr=true',
};

// Embedded from data/act.json — update if the Act is amended.
const OFFENCES = [
  // Part 1 — Administrative & Attendance Breaches
  { code: '1.1',    title: 'Late for Duty',                           amountGBP: 1, partNumber: 1, partTitle: 'Administrative & Attendance Breaches' },
  { code: '1.2',    title: 'Attendance on Incorrect Day',             amountGBP: 2, partNumber: 1, partTitle: 'Administrative & Attendance Breaches' },
  { code: '1.3',    title: 'Pre-Annual Leave Contribution',           amountGBP: 1, partNumber: 1, partTitle: 'Administrative & Attendance Breaches' },
  { code: '1.4',    title: 'Transfer Out Contribution',               amountGBP: 3, partNumber: 1, partTitle: 'Administrative & Attendance Breaches' },
  { code: '1.5',    title: 'Arrival from Elsewhere Contribution',     amountGBP: 2, partNumber: 1, partTitle: 'Administrative & Attendance Breaches' },
  // Part 2 — Life Events & Personal Milestones
  { code: '2.1',    title: 'Birthday (Personal)',                     amountGBP: 2, partNumber: 2, partTitle: 'Life Events & Personal Milestones' },
  { code: '2.2',    title: 'Birthday (Work Anniversary)',             amountGBP: 1, partNumber: 2, partTitle: 'Life Events & Personal Milestones' },
  { code: '2.3',    title: 'Return from Prolonged Absence',          amountGBP: 2, partNumber: 2, partTitle: 'Life Events & Personal Milestones' },
  { code: '2.4',    title: 'Relationship Status Alteration',         amountGBP: 3, partNumber: 2, partTitle: 'Life Events & Personal Milestones' },
  { code: '2.5',    title: 'Birth of Child',                         amountGBP: 5, partNumber: 2, partTitle: 'Life Events & Personal Milestones' },
  // Part 3 — Operational Conduct & Performance
  { code: '3.1',    title: 'Resolved Complaint',                     amountGBP: 2, partNumber: 3, partTitle: 'Operational Conduct & Performance' },
  { code: '3.2',    title: 'Unlawful or Regrettable Arrest',         amountGBP: 3, partNumber: 3, partTitle: 'Operational Conduct & Performance' },
  { code: '3.3',    title: 'General Operational Error',              amountGBP: 1, partNumber: 3, partTitle: 'Operational Conduct & Performance' },
  { code: '3.4',    title: 'Speeding Notice (On or Off Duty)',       amountGBP: 2, partNumber: 3, partTitle: 'Operational Conduct & Performance' },
  { code: '3.5',    title: 'Excessive Personal Calls',               amountGBP: 1, partNumber: 3, partTitle: 'Operational Conduct & Performance' },
  // Part 4 — Operational Incidents & Tactical Events
  { code: '4.1',    title: 'False Activation of Emergency Button',   amountGBP: 3, partNumber: 4, partTitle: 'Operational Incidents & Tactical Events' },
  { code: '4.2',    title: 'Tactical Deployment (Stinger)',          amountGBP: 3, partNumber: 4, partTitle: 'Operational Incidents & Tactical Events' },
  { code: '4.3',    title: 'Vehicle Collision',                      amountGBP: 2, partNumber: 4, partTitle: 'Operational Incidents & Tactical Events' },
  { code: '4.4',    title: 'Escape of Detainee',                    amountGBP: 3, partNumber: 4, partTitle: 'Operational Incidents & Tactical Events' },
  { code: '4.5',    title: 'Loss of Equipment',                      amountGBP: 2, partNumber: 4, partTitle: 'Operational Incidents & Tactical Events' },
  { code: '4.6',    title: 'Vehicle Recovery or Puncture Incident',  amountGBP: 2, partNumber: 4, partTitle: 'Operational Incidents & Tactical Events' },
  { code: '4.6(b)', title: 'Multiple Tyre Destruction',              amountGBP: 3, partNumber: 4, partTitle: 'Operational Incidents & Tactical Events' },
  // Part 5 — Significant Incidents & Notable Events
  { code: '5.1',    title: 'Notable Death Attendance',               amountGBP: 2, partNumber: 5, partTitle: 'Significant Incidents & Notable Events' },
  { code: '5.2',    title: 'Saving of Life',                         amountGBP: 3, partNumber: 5, partTitle: 'Significant Incidents & Notable Events' },
  { code: '5.3',    title: 'Serious or Complex Arrest',              amountGBP: 3, partNumber: 5, partTitle: 'Significant Incidents & Notable Events' },
  { code: '5.4',    title: 'PAVA or Taser Deployment',              amountGBP: 3, partNumber: 5, partTitle: 'Significant Incidents & Notable Events' },
  // Part 6 — Recognition, Opportunity & Advantage
  { code: '6.1',    title: 'Lottery or Financial Windfall',          amountGBP: 5, partNumber: 6, partTitle: 'Recognition, Opportunity & Advantage' },
  { code: '6.2',    title: 'Award or Commendation',                  amountGBP: 3, partNumber: 6, partTitle: 'Recognition, Opportunity & Advantage' },
  { code: '6.3',    title: 'Promotion',                              amountGBP: 5, partNumber: 6, partTitle: 'Recognition, Opportunity & Advantage' },
  // Part 7 — Miscellaneous & Conduct Matters
  { code: '7.1',    title: 'Amendment of the Act',                   amountGBP: 1, partNumber: 7, partTitle: 'Miscellaneous & Conduct Matters' },
  { code: '7.2',    title: 'COVID-Related Absence',                  amountGBP: 1, partNumber: 7, partTitle: 'Miscellaneous & Conduct Matters' },
  { code: '7.3',    title: 'Minor Fabrication (Non-Serious Context)', amountGBP: 1, partNumber: 7, partTitle: 'Miscellaneous & Conduct Matters' },
];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch] || ch));
}

function buildSelectOptions() {
  const groups = new Map();
  for (const offence of OFFENCES) {
    if (!groups.has(offence.partNumber)) {
      groups.set(offence.partNumber, { partTitle: offence.partTitle, offences: [] });
    }
    groups.get(offence.partNumber).offences.push(offence);
  }

  let html = '<option value="">— Select an offence —</option>';
  for (const [partNumber, group] of groups) {
    html += `<optgroup label="Part ${partNumber} — ${escapeHtml(group.partTitle)}">`;
    for (const o of group.offences) {
      html += `<option value="${escapeHtml(o.code)}">${escapeHtml(o.code)} — ${escapeHtml(o.title)} (£${o.amountGBP})</option>`;
    }
    html += '</optgroup>';
  }
  return html;
}

function buildQuickButtons() {
  return [1, 2, 3, 4, 5].map((amount) => `
    <a
      href="${escapeHtml(MONZO_LINKS[amount])}"
      target="_blank"
      rel="noopener noreferrer"
      class="btn secondary monzo-pay-quick-btn"
    >£${amount}</a>
  `).join('');
}

function buildCardHtml() {
  return `
    <div class="panel-header">
      <div>
        <p class="eyebrow">Quick Payment</p>
        <h2 class="section-header">
          <i data-lucide="banknote" class="icon"></i>Pay a Fine via Monzo
        </h2>
      </div>
    </div>

    <div class="monzo-pay-body">
      <div class="monzo-pay-select-wrap">
        <label class="monzo-pay-label" for="monzoOffenceSelect">Select the offence you are paying for</label>
        <select id="monzoOffenceSelect" class="monzo-pay-select">
          ${buildSelectOptions()}
        </select>
      </div>

      <div id="monzoPayPreview" class="monzo-pay-preview" hidden>
        <div class="monzo-pay-preview-inner">
          <div class="monzo-pay-preview-meta">
            <span class="badge" id="monzoPreviewCode"></span>
            <span id="monzoPreviewTitle" class="monzo-pay-preview-title"></span>
          </div>
          <p class="monzo-pay-preview-amount" id="monzoPreviewAmount"></p>
        </div>
        <div class="actions">
          <a
            id="monzoPayBtn"
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            class="btn monzo-pay-btn"
          >
            <i data-lucide="external-link" class="icon icon-btn"></i>
            <span id="monzoPayBtnLabel">Pay via Monzo</span>
          </a>
        </div>
      </div>

      <details class="monzo-pay-fallback">
        <summary>Or pay a specific amount directly</summary>
        <div class="monzo-pay-quick-grid">
          ${buildQuickButtons()}
        </div>
      </details>

      <p class="monzo-pay-disclaimer muted">
        <i data-lucide="info" class="icon icon-btn" aria-hidden="true"></i>
        Payments are made directly via Monzo. Your bank app may open to confirm the transfer.
        No payment data is stored by this application.
      </p>
    </div>
  `;
}

export function initQuickPayMonzo(section) {
  if (!section) return;

  section.innerHTML = buildCardHtml();

  const select = section.querySelector('#monzoOffenceSelect');
  const preview = section.querySelector('#monzoPayPreview');
  const codeEl = section.querySelector('#monzoPreviewCode');
  const titleEl = section.querySelector('#monzoPreviewTitle');
  const amountEl = section.querySelector('#monzoPreviewAmount');
  const payBtn = section.querySelector('#monzoPayBtn');
  const payBtnLabel = section.querySelector('#monzoPayBtnLabel');

  function updatePreview() {
    const code = select.value;
    if (!code) {
      preview.hidden = true;
      return;
    }

    const offence = OFFENCES.find((o) => o.code === code);
    if (!offence) {
      preview.hidden = true;
      return;
    }

    codeEl.textContent = offence.code;
    titleEl.textContent = offence.title;
    amountEl.textContent = `£${offence.amountGBP}.00`;
    payBtn.href = MONZO_LINKS[offence.amountGBP] ?? '#';
    payBtnLabel.textContent = `Pay £${offence.amountGBP} via Monzo`;
    preview.hidden = false;
  }

  select.addEventListener('change', updatePreview);
}
