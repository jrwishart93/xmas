import { bootProtectedPage } from '/js/app-common.js';
import { logout, requestPasswordReset } from '/js/auth.js';
import { createApi } from '/js/api.js';

function showStatus(id, message, isError = false) {
  const status = document.getElementById(id);
  status.textContent = message;
  status.hidden = false;
  status.classList.toggle('is-error', isError);
}

bootProtectedPage(async (ctx) => {
  const api = createApi(ctx.user);
  const nameInput = document.getElementById('profileName');
  nameInput.value = ctx.membership?.displayName || ctx.user?.displayName || '';
  document.getElementById('accountEmail').textContent = ctx.user?.email || '—';
  document.getElementById('accountRole').textContent = ctx.membership?.role === 'admin' ? 'Admin' : 'Member';

  document.getElementById('profileForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submit = document.getElementById('profileSubmit');
    submit.disabled = true;
    try {
      const result = await api('/api/me', { method: 'PATCH', body: { displayName: nameInput.value } });
      nameInput.value = result.displayName;
      showStatus('profileStatus', 'Saved. Your new name shows everywhere next time a page loads.');
    } catch (error) {
      showStatus('profileStatus', error.message, true);
    } finally {
      submit.disabled = false;
    }
  });

  document.getElementById('resetPassword').addEventListener('click', async () => {
    if (!ctx.user?.email) return;
    try {
      await requestPasswordReset(ctx.user.email);
      showStatus('accountStatus', `Reset link sent to ${ctx.user.email}.`);
    } catch (error) {
      showStatus('accountStatus', error.message || 'Unable to send the reset email.', true);
    }
  });

  document.getElementById('settingsLogout').addEventListener('click', async () => {
    try {
      await logout();
    } finally {
      window.location.href = '/';
    }
  });
});
