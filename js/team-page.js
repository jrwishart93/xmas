import { TEAM } from '/archive/brewhemia-2025/team.js';
import { bootProtectedPage, initIcons } from '/js/app-common.js';
import { PREVIEW_MODE } from '/js/config.js';
import { subscribeMembers } from '/js/data.js';

const TEAM_FUND_ENTRIES = [
  { name: 'Jamie', amount: 1, reason: 'Amend rules' },
  { name: 'Jamie', amount: 1, reason: 'Punctured tyre' },
  { name: 'Paul', amount: 3, reason: 'Annual leave' },
  { name: 'Chris', amount: 3, reason: 'Annual leave' },
];

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
  return ctx.membership?.displayName || ctx.user?.displayName || 'Team Member';
}

function previewMembers() {
  return Object.values(TEAM)
    .map((member) => ({
      uid: member.id,
      displayName: member.name,
      role: 'member',
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

bootProtectedPage(async (ctx) => {
  const searchInput = document.getElementById('teamSearchInput');
  const directory = document.getElementById('teamDirectory');
  const emptyState = document.getElementById('teamDirectoryEmpty');
  const directoryMeta = document.getElementById('teamDirectoryMeta');
  const totalCount = document.getElementById('teamTotalCount');
  const visibleCount = document.getElementById('teamVisibleCount');
  const currentRole = document.getElementById('teamCurrentRole');
  const currentIdentity = document.getElementById('teamCurrentIdentity');
  const teamFundTotal = document.getElementById('teamFundTotal');
  const teamFundBreakdown = document.getElementById('teamFundBreakdown');
  const teamFundMeta = document.getElementById('teamFundMeta');
  let members = [];

  currentRole.textContent = formatRole(ctx.membership?.role);
  currentIdentity.textContent = getUserDisplayName(ctx);

  const renderTeamFund = () => {
    const total = TEAM_FUND_ENTRIES.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const byMember = TEAM_FUND_ENTRIES.reduce((accumulator, entry) => {
      const key = String(entry.name || 'Unknown');
      const current = accumulator.get(key) || { name: key, total: 0, entries: [] };
      current.total += Number(entry.amount || 0);
      current.entries.push(entry);
      accumulator.set(key, current);
      return accumulator;
    }, new Map());

    const memberRows = Array.from(byMember.values()).sort((left, right) => right.total - left.total);
    const highestTotal = memberRows[0]?.total || 1;

    teamFundBreakdown.innerHTML = '';
    memberRows.forEach((member) => {
      const row = document.createElement('article');
      row.className = 'team-fund-person';

      const reasons = member.entries.map((entry) => `${entry.reason} (£${entry.amount})`).join(' • ');
      const percentage = Math.max(14, Math.round((member.total / highestTotal) * 100));
      row.innerHTML = `
        <div class="team-fund-person__head">
          <p>${escapeHtml(member.name)}</p>
          <strong>£${member.total}</strong>
        </div>
        <div class="team-fund-person__bar" role="presentation">
          <span style="width: ${percentage}%"></span>
        </div>
        <p class="team-fund-person__meta">${escapeHtml(reasons)}</p>
      `;
      teamFundBreakdown.appendChild(row);
    });

    teamFundMeta.textContent = `${TEAM_FUND_ENTRIES.length} manual entries recorded.`;

    animateNumber(teamFundTotal, total, { duration: 1300, formatter: (value) => `£${value}` });
  };

  const render = () => {
    const membersForDirectory = members.filter((member) => String(member.role || '').toLowerCase() !== 'admin');
    const term = String(searchInput.value || '').trim().toLowerCase();
    const filteredMembers = membersForDirectory.filter((member) => {
      const haystack = [member.displayName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !term || haystack.includes(term);
    });

    totalCount.textContent = String(membersForDirectory.length);
    visibleCount.textContent = String(filteredMembers.length);
    directoryMeta.textContent = filteredMembers.length === membersForDirectory.length
      ? `${membersForDirectory.length} team member${membersForDirectory.length === 1 ? '' : 's'} in the directory.`
      : `Showing ${filteredMembers.length} of ${membersForDirectory.length} team members.`;

    directory.innerHTML = '';
    emptyState.hidden = filteredMembers.length !== 0;

    filteredMembers.forEach((member) => {
      const displayName = member.displayName || 'Team Member';
      const card = document.createElement('article');
      card.className = 'member-card member-card--directory';
      card.innerHTML = `
        <div class="member-card__head">
          <span class="member-card__avatar" aria-hidden="true">${escapeHtml(initialsFromName(displayName))}</span>
          <div class="member-card__meta">
            <strong>${escapeHtml(displayName)}</strong>
            <span>Active member</span>
          </div>
        </div>
      `;
      directory.appendChild(card);
    });

    initIcons();
  };

  searchInput.addEventListener('input', render);
  renderTeamFund();

  if (PREVIEW_MODE) {
    members = previewMembers();
    render();
    return;
  }

  const unsubscribe = subscribeMembers((nextMembers) => {
    members = nextMembers;
    render();
  });

  window.addEventListener(
    'beforeunload',
    () => {
      unsubscribe?.();
    },
    { once: true }
  );
});

function animateNumber(element, endValue, options = {}) {
  if (!element) return;
  const duration = Number(options.duration || 1000);
  const formatter = typeof options.formatter === 'function' ? options.formatter : (value) => String(value);
  const startTime = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const easedProgress = 1 - Math.pow(1 - progress, 3);
    const currentValue = Math.round(endValue * easedProgress);
    element.textContent = formatter(currentValue);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = formatter(endValue);
    }
  };

  requestAnimationFrame(tick);
}
