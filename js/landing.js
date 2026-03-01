import { login } from '/js/auth.js';
import { money } from '/js/constants.js';

const form = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const fundTotal = document.getElementById('fundTotal');
const leaderboard = document.getElementById('leaderboard');

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';
  try {
    await login(document.getElementById('email').value, document.getElementById('password').value);
    window.location.href = '/app/dashboard/';
  } catch (error) {
    loginError.textContent = error.message;
  }
});

async function loadPublicSummary() {
  const response = await fetch('/api/public-summary');
  const data = await response.json();
  fundTotal.textContent = money(data.socialFundTotalPence);
  leaderboard.innerHTML = '';
  data.leaderboard.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${entry.displayName}: ${money(entry.totalPence)}`;
    leaderboard.appendChild(li);
  });
}

loadPublicSummary().catch((error) => {
  leaderboard.innerHTML = `<li>Unable to load summary: ${error.message}</li>`;
});
