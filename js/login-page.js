import { initMobileNav } from '/js/app-common.js';
import { auth, onAuthStateChanged } from '/firebase.js';
import { assertTeamMembership, login, register, requestPasswordReset } from '/js/auth.js';

const authCard = document.querySelector('[data-auth-card]');
const tabButtons = [...document.querySelectorAll('[data-auth-tab]')];
const panes = [...document.querySelectorAll('[data-auth-pane]')];
const formStateMessage = document.querySelector('[data-auth-status]');
const signInForm = document.querySelector('[data-sign-in-form]');
const signUpForm = document.querySelector('[data-sign-up-form]');
const forgotPasswordLink = document.querySelector('[data-forgot-password]');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DASHBOARD_PATH = '/app/dashboard/';
let authSubmissionInFlight = false;

initMobileNav();

function setStatus(message = '', type = 'info') {
  formStateMessage.textContent = message;
  formStateMessage.dataset.state = type;
}

function setLoading(form, loading, label) {
  const button = form.querySelector('button[type="submit"]');
  button.disabled = loading;
  button.dataset.loading = loading ? 'true' : 'false';
  button.querySelector('[data-btn-label]').textContent = loading ? label : button.dataset.defaultLabel;
}

function setActiveTab(mode) {
  tabButtons.forEach((button) => {
    const active = button.dataset.authTab === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });

  panes.forEach((pane) => {
    const active = pane.dataset.authPane === mode;
    pane.hidden = !active;
  });

  authCard.dataset.mode = mode;
  setStatus('');
}

function validatePasswordLength(password) {
  return password.trim().length >= 8;
}

function validateEmail(email) {
  return EMAIL_REGEX.test(email);
}

function toAuthMessage(error) {
  const code = error?.code || '';
  const fallback = error?.message || 'Authentication failed. Please try again.';

  if (code.includes('invalid-email')) return 'Please enter a valid email address.';
  if (code.includes('user-not-found') || code.includes('invalid-credential')) return 'Incorrect email or password.';
  if (code.includes('wrong-password')) return 'Incorrect email or password.';
  if (code.includes('email-already-in-use')) return 'An account already exists with this email. Please sign in instead.';
  if (code.includes('existing-account-password-required')) return 'An account already exists with this email. Sign in with the same password or reset it first.';
  if (code.includes('team-membership-required')) return 'This account is not linked to the team fund yet. Use Sign Up with the team access code to join.';
  if (code.includes('permission-denied')) return 'We could not verify your team membership. Try Sign Up with the team access code.';
  if (code.includes('weak-password')) return 'Use a stronger password (minimum 8 characters).';
  if (code.includes('too-many-requests')) return 'Too many attempts. Please wait a minute and try again.';
  if (code.includes('network-request-failed')) return 'Network error. Check your connection and try again.';

  return fallback;
}

function shakeForm(form) {
  form.classList.add('form-shake');
  setTimeout(() => form.classList.remove('form-shake'), 350);
}

onAuthStateChanged(auth, async (user) => {
  if (authSubmissionInFlight || !user) return;

  try {
    await assertTeamMembership(user);
    window.location.replace(DASHBOARD_PATH);
  } catch (error) {
    setStatus(error?.message || 'Unable to verify your team membership.', 'error');
  }
});

signInForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(signInForm);
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const remember = formData.get('remember') === 'on';

  if (!email || !password) {
    setStatus('Please enter your email and password.', 'error');
    shakeForm(signInForm);
    return;
  }

  if (!validateEmail(email)) {
    setStatus('Please enter a valid email address.', 'error');
    shakeForm(signInForm);
    return;
  }

  setStatus('');
  authSubmissionInFlight = true;
  setLoading(signInForm, true, 'Signing in...');

  try {
    await login(email, password, remember);
    setStatus('Signed in successfully. Redirecting...', 'success');
    window.location.href = DASHBOARD_PATH;
  } catch (error) {
    setStatus(toAuthMessage(error), 'error');
    shakeForm(signInForm);
  } finally {
    authSubmissionInFlight = false;
    setLoading(signInForm, false);
  }
});

signUpForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(signUpForm);
  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');
  const accessCode = String(formData.get('accessCode') || '').trim();
  const remember = formData.get('remember') === 'on';

  if (!fullName || !email || !password || !confirmPassword || !accessCode) {
    setStatus('Please complete all sign-up fields.', 'error');
    shakeForm(signUpForm);
    return;
  }

  if (!validateEmail(email)) {
    setStatus('Please enter a valid email address.', 'error');
    return;
  }

  if (!validatePasswordLength(password)) {
    setStatus('Password must be at least 8 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    setStatus('Passwords do not match.', 'error');
    return;
  }

  setStatus('');
  authSubmissionInFlight = true;
  setLoading(signUpForm, true, 'Creating account...');

  try {
    await register({ fullName, email, password, accessCode, remember });
    setStatus('Account ready. Redirecting...', 'success');
    window.location.href = DASHBOARD_PATH;
  } catch (error) {
    setStatus(toAuthMessage(error), 'error');
    shakeForm(signUpForm);
  } finally {
    authSubmissionInFlight = false;
    setLoading(signUpForm, false);
  }
});

forgotPasswordLink?.addEventListener('click', async (event) => {
  event.preventDefault();
  const email = String(signInForm.querySelector('input[name="email"]').value || '').trim().toLowerCase();

  if (!validateEmail(email)) {
    setStatus('Enter your email in the sign-in form first, then click Forgot password.', 'error');
    return;
  }

  try {
    await requestPasswordReset(email);
    setStatus('Password reset email sent. Check your inbox.', 'success');
  } catch (error) {
    setStatus(toAuthMessage(error), 'error');
  }
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.authTab));
});

setActiveTab('sign-in');
