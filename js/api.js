// Authenticated calls to the app's server API (which reads and writes Firestore with admin rights).
export function createApi(user) {
  return async function api(path, { method = 'GET', body } = {}) {
    const idToken = await user.getIdToken();
    const response = await fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${idToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Something went wrong. Please try again.');
    return payload;
  };
}

export function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

export function formatDate(ms) {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
