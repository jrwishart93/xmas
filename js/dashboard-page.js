import { bootProtectedPage, initIcons, initPreviewGates } from '/js/app-common.js';

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
  return ctx.membership?.displayName || ctx.user?.displayName || ctx.user?.email?.split('@')[0] || 'Team Member';
}

function setText(id, value) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}


function initBreachInfoModal() {
  const trigger = document.getElementById('openBreachModal');
  const modal = document.getElementById('breachInfoModal');
  const closeBtn = document.getElementById('closeBreachModal');

  if (!(trigger && modal)) return;

  const openModal = () => {
    if (typeof modal.showModal === 'function') {
      modal.showModal();
      return;
    }

    modal.setAttribute('open', 'open');
  };

  const closeModal = () => {
    if (typeof modal.close === 'function') {
      modal.close();
      return;
    }

    modal.removeAttribute('open');
  };

  trigger.addEventListener('click', openModal);
  closeBtn?.addEventListener('click', closeModal);

  modal.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains('dashboard-info-modal__backdrop')) closeModal();
  });

  modal.addEventListener('cancel', () => {
    modal.removeAttribute('open');
  });
}

bootProtectedPage(async (ctx) => {
  const displayName = getUserDisplayName(ctx);
  const roleLabel = formatRole(ctx.membership?.role);
  const email = ctx.user?.email || 'Signed-in account';

  setText('dashboardGreeting', `Welcome back, ${displayName}`);
  setText('dashboardIdentity', 'Only Quick Monzo Payment is live right now. Everything else is coming soon.');
  setText('dashboardStatusText', 'Secure session active');
  setText('dashboardUserName', displayName);
  setText('dashboardEmail', email);
  const initials = initialsFromName(displayName);

  setText('dashboardRoleBadge', roleLabel);
  setText('dashboardAvatar', initials);
  setText('headerProfileAvatar', initials);

  initPreviewGates();
  initBreachInfoModal();
  initIcons();
});
