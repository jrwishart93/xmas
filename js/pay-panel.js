// Pay panel: pick an amount (or the offence it's for) and open the matching Monzo link.
// Used on the dashboard and the leaderboard.
import { MONZO_LINKS, OFFENCES } from '/js/quick-pay-monzo.js';

const AMOUNTS = [1, 2, 3, 4, 5];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function buildOffenceOptions() {
  const groups = new Map();
  OFFENCES.forEach((offence) => {
    if (!groups.has(offence.partNumber)) groups.set(offence.partNumber, { title: offence.partTitle, items: [] });
    groups.get(offence.partNumber).items.push(offence);
  });

  let html = '<option value="">Not sure? Pick what it’s for…</option>';
  groups.forEach((group, partNumber) => {
    html += `<optgroup label="Part ${partNumber} — ${escapeHtml(group.title)}">`;
    group.items.forEach((offence) => {
      html += `<option value="${escapeHtml(offence.code)}">${escapeHtml(offence.code)} ${escapeHtml(offence.title)} — £${offence.amountGBP}</option>`;
    });
    html += '</optgroup>';
  });
  return html;
}

const JAR_SVG = `
  <svg class="pay-panel__jar" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="payJarGlass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="rgba(140,170,255,0.35)" />
        <stop offset="1" stop-color="rgba(60,90,200,0.15)" />
      </linearGradient>
      <linearGradient id="payCoinFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffe69a" />
        <stop offset="1" stop-color="#f0a92a" />
      </linearGradient>
    </defs>
    <g class="pay-panel__coin">
      <circle cx="60" cy="22" r="11" fill="url(#payCoinFill)" stroke="#b97a12" stroke-width="2" />
      <text x="60" y="27" text-anchor="middle" font-size="13" font-weight="800" fill="#8a5a08">£</text>
    </g>
    <rect x="44" y="40" width="32" height="6" rx="3" fill="rgba(170,190,255,0.55)" />
    <path d="M34 48 h52 a8 8 0 0 1 8 8 v40 a14 14 0 0 1 -14 14 h-40 a14 14 0 0 1 -14 -14 v-40 a8 8 0 0 1 8 -8z"
      fill="url(#payJarGlass)" stroke="rgba(170,190,255,0.6)" stroke-width="2" />
    <g class="pay-panel__pile">
      <ellipse cx="50" cy="100" rx="11" ry="4" fill="#f0a92a" />
      <ellipse cx="70" cy="100" rx="11" ry="4" fill="#e39a1f" />
      <ellipse cx="60" cy="94" rx="11" ry="4" fill="#ffd56b" />
    </g>
  </svg>
`;

export function renderPayPanel(container, { onAmountChosen } = {}) {
  if (!container) return;

  container.classList.add('pay-panel');
  container.innerHTML = `
    <div class="pay-panel__intro">
      ${JAR_SVG}
      <div>
        <p class="eyebrow">Pay into the team fund</p>
        <h2 class="pay-panel__title">Pay in two taps</h2>
        <p class="pay-panel__lead">Choose an amount, then confirm in Monzo. No account details to type.</p>
      </div>
    </div>

    <label class="pay-panel__label" for="payPanelOffence">What’s it for? <span class="muted">(optional)</span></label>
    <select id="payPanelOffence" class="pay-panel__select">${buildOffenceOptions()}</select>

    <div class="pay-panel__amounts" role="radiogroup" aria-label="Amount">
      ${AMOUNTS.map((amount) => `
        <button type="button" class="pay-panel__chip" role="radio" aria-checked="false" data-amount="${amount}">£${amount}</button>
      `).join('')}
    </div>

    <a class="pay-panel__cta" href="${escapeHtml(MONZO_LINKS[1])}" target="_blank" rel="noopener noreferrer" aria-disabled="true">
      <span class="pay-panel__cta-label">Choose an amount</span>
      <span class="pay-panel__cta-arrow" aria-hidden="true">→</span>
    </a>
    <p class="pay-panel__hint muted">Opens Monzo in a new tab. Your payment shows in the history once the fund is next updated.</p>
  `;

  const select = container.querySelector('.pay-panel__select');
  const chips = [...container.querySelectorAll('.pay-panel__chip')];
  const cta = container.querySelector('.pay-panel__cta');
  const ctaLabel = container.querySelector('.pay-panel__cta-label');
  let selectedAmount = null;

  const selectAmount = (amount, reason = '') => {
    selectedAmount = amount;
    chips.forEach((chip) => {
      const isSelected = Number(chip.dataset.amount) === amount;
      chip.setAttribute('aria-checked', String(isSelected));
      chip.classList.toggle('is-selected', isSelected);
    });
    cta.href = MONZO_LINKS[amount];
    cta.removeAttribute('aria-disabled');
    cta.classList.add('is-ready');
    ctaLabel.textContent = reason ? `Pay £${amount} for ${reason}` : `Pay £${amount} with Monzo`;
  };

  chips.forEach((chip) => {
    chip.addEventListener('click', () => {
      select.value = '';
      selectAmount(Number(chip.dataset.amount));
    });
  });

  select.addEventListener('change', () => {
    const offence = OFFENCES.find((item) => item.code === select.value);
    if (offence && MONZO_LINKS[offence.amountGBP]) selectAmount(offence.amountGBP, offence.title);
  });

  cta.addEventListener('click', (event) => {
    if (!selectedAmount) {
      event.preventDefault();
      container.querySelector('.pay-panel__amounts').classList.remove('is-nudged');
      void container.offsetWidth;
      container.querySelector('.pay-panel__amounts').classList.add('is-nudged');
      return;
    }
    container.classList.remove('is-paying');
    void container.offsetWidth;
    container.classList.add('is-paying');
    onAmountChosen?.(selectedAmount);
  });
}
