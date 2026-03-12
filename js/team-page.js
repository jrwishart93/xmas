import { TEAM } from '/archive/brewhemia-2025/team.js';
import { bootProtectedPage, initIcons } from '/js/app-common.js';
import { PREVIEW_MODE } from '/js/config.js';
import { subscribeMembers } from '/js/data.js';

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
    .map((member, index) => ({
      uid: member.id,
      displayName: member.name,
      role: index === 0 ? 'admin' : 'member',
    }))
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

bootProtectedPage(async (ctx) => {
  const searchInput = document.getElementById('teamSearchInput');
  const directory = document.getElementById('teamDirectory');
  const emptyState = document.getElementById('teamDirectoryEmpty');
  const directoryMeta = document.getElementById('teamDirectoryMeta');
  const totalCount = document.getElementById('teamTotalCount');
  const adminCount = document.getElementById('teamAdminCount');
  const currentRole = document.getElementById('teamCurrentRole');
  const currentIdentity = document.getElementById('teamCurrentIdentity');
  let members = [];

  currentRole.textContent = formatRole(ctx.membership?.role);
  currentIdentity.textContent = getUserDisplayName(ctx);

  const render = () => {
    const term = String(searchInput.value || '').trim().toLowerCase();
    const filteredMembers = members.filter((member) => {
      const haystack = [
        member.displayName,
        formatRole(member.role),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !term || haystack.includes(term);
    });

    totalCount.textContent = String(members.length);
    adminCount.textContent = String(members.filter((member) => String(member.role || '').toLowerCase() === 'admin').length);
    directoryMeta.textContent = filteredMembers.length === members.length
      ? `${members.length} team member${members.length === 1 ? '' : 's'} in the directory.`
      : `Showing ${filteredMembers.length} of ${members.length} team members.`;

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
            <span>${escapeHtml(formatRole(member.role))}</span>
          </div>
        </div>
      `;
      directory.appendChild(card);
    });

    initIcons();
  };

  searchInput.addEventListener('input', render);

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
