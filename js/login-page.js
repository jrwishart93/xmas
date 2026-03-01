import { login, register } from '/js/auth.js';

const authCard = document.querySelector('[data-auth-card]');
const tabButtons = [...document.querySelectorAll('[data-auth-tab]')];
const panes = [...document.querySelectorAll('[data-auth-pane]')];
const formStateMessage = document.querySelector('[data-auth-status]');
const signInForm = document.querySelector('[data-sign-in-form]');
const signUpForm = document.querySelector('[data-sign-up-form]');

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

signInForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(signInForm);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const remember = formData.get('remember') === 'on';

  if (!email || !password) {
    setStatus('Please enter your email and password.', 'error');
    signInForm.classList.add('form-shake');
    setTimeout(() => signInForm.classList.remove('form-shake'), 350);
    return;
  }

  setStatus('');
  setLoading(signInForm, true, 'Signing in...');

  try {
    await login(email, password, remember);
    setStatus('Signed in successfully. Redirecting...', 'success');
    window.location.href = '/dashboard/';
  } catch (error) {
    setStatus(error?.message || 'Sign in failed. Please try again.', 'error');
    signInForm.classList.add('form-shake');
    setTimeout(() => signInForm.classList.remove('form-shake'), 350);
  } finally {
    setLoading(signInForm, false);
  }
});

signUpForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(signUpForm);
  const fullName = String(formData.get('fullName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');
  const remember = formData.get('remember') === 'on';

  if (!fullName || !email || !password || !confirmPassword) {
    setStatus('Please complete all sign-up fields.', 'error');
    signUpForm.classList.add('form-shake');
    setTimeout(() => signUpForm.classList.remove('form-shake'), 350);
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
  setLoading(signUpForm, true, 'Creating account...');

  try {
    await register({ fullName, email, password, remember });
    setStatus('Account created successfully. Redirecting...', 'success');
    window.location.href = '/dashboard/';
  } catch (error) {
    setStatus(error?.message || 'Could not create account.', 'error');
    signUpForm.classList.add('form-shake');
    setTimeout(() => signUpForm.classList.remove('form-shake'), 350);
  } finally {
    setLoading(signUpForm, false);
  }
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => setActiveTab(button.dataset.authTab));
});

setActiveTab('sign-in');
