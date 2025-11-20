import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";
import { createAvatarElement, createAvatarName } from './src/utils/avatarMap.js';

const avatarGrid = document.getElementById('avatarGrid');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');
const errorP = document.getElementById('loginError');
const selectedUserCard = document.getElementById('selectedUserCard');
const selectedUserAnnouncement = document.getElementById('selectedUserAnnouncement');
const pinSection = document.getElementById('pinSection');
const loginForm = document.getElementById('loginForm');

let activeCard = null;
let selectedUserId = '';
let selectedUserName = '';

function renderSelectedUser(name) {
    if (!selectedUserCard) return;
    selectedUserCard.innerHTML = '';

    if (!name) {
        selectedUserCard.classList.add('hidden');
        return;
    }

    const intro = document.createElement('p');
    intro.className = 'muted-text selected-user-subtitle';
    intro.textContent = 'You are logging in as';

    const avatarRow = createAvatarName(name, 46);
    avatarRow.classList.add('selected-user-row');

    selectedUserCard.append(intro, avatarRow);
    selectedUserCard.classList.remove('hidden');
}

async function populateUsers() {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (userList.length === 0) {
            errorP.textContent = 'No users found in the database.';
            return;
        }

        if (!avatarGrid) {
            errorP.textContent = 'Unable to load avatars.';
            return;
        }

        avatarGrid.innerHTML = '';
        userList.forEach(user => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'user-avatar-card';
            card.dataset.userId = user.id;
            card.dataset.userName = user.name;
            card.setAttribute('role', 'listitem');
            card.setAttribute('aria-pressed', 'false');
            card.setAttribute('aria-label', `Select ${user.name}`);

            const avatar = createAvatarElement(user.name, 88);
            const nameLabel = document.createElement('span');
            nameLabel.className = 'user-avatar-card__name';
            nameLabel.textContent = user.name;

            card.append(avatar, nameLabel);
            avatarGrid.appendChild(card);
        });

        renderSelectedUser('');
    } catch (err) {
        console.error(err);
        errorP.textContent = 'Failed to load users from Firestore.';
    }
}

loginBtn.addEventListener('click', async () => {
    const userId = loginForm?.dataset.selectedUserId || selectedUserId;
    const pin = pinInput.value;
    errorP.textContent = '';

    if (!userId) {
        errorP.textContent = 'Please select your name.';
        return;
    }

    try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists() && userSnap.data().password === pin) {
            localStorage.setItem("xmasUser", userSnap.id);
            // Keep a secondary key for compatibility with older pages/modules
            localStorage.setItem("currentUser", userSnap.id);
            window.location.href = 'choices.html';
        } else {
            errorP.textContent = 'Invalid PIN.';
        }
    } catch (err) {
        console.error(err);
        errorP.textContent = 'An error occurred during login.';
    }
});

avatarGrid?.addEventListener('click', (event) => {
    const card = event.target.closest('.user-avatar-card');
    if (!card) return;

    if (activeCard) {
        activeCard.classList.remove('user-avatar-card--selected');
        activeCard.setAttribute('aria-pressed', 'false');
    }

    activeCard = card;
    activeCard.classList.add('user-avatar-card--selected');
    activeCard.setAttribute('aria-pressed', 'true');

    selectedUserId = card.dataset.userId;
    selectedUserName = card.dataset.userName;

    if (loginForm) {
        loginForm.dataset.selectedUserId = selectedUserId;
        loginForm.dataset.selectedUserName = selectedUserName;
    }

    if (pinSection) {
        pinSection.classList.remove('hidden');
    }

    errorP.textContent = '';
    renderSelectedUser(selectedUserName);

    if (selectedUserAnnouncement) {
        selectedUserAnnouncement.textContent = selectedUserName
            ? `Selected user: ${selectedUserName}`
            : '';
    }

    document.dispatchEvent(new CustomEvent('userSelectionChanged'));
    pinInput?.focus();
});

populateUsers();
