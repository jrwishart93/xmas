import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const nameSelect = document.getElementById('nameSelect');
const pinInput = document.getElementById('pinInput');
const loginBtn = document.getElementById('loginBtn');
const errorP = document.getElementById('loginError');

async function populateUsers() {
    try {
        const usersCol = collection(db, 'users');
        const userSnapshot = await getDocs(usersCol);
        const userList = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (userList.length === 0) {
            errorP.textContent = 'No users found in the database.';
            return;
        }

        nameSelect.innerHTML = '<option value="">Select your name</option>';
        userList.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            nameSelect.appendChild(option);
        });
    } catch (err) {
        console.error(err);
        errorP.textContent = 'Failed to load users from Firestore.';
    }
}

loginBtn.addEventListener('click', async () => {
    const userId = nameSelect.value;
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
            window.location.href = 'choices.html';
        } else {
            errorP.textContent = 'Invalid PIN.';
        }
    } catch (err) {
        console.error(err);
        errorP.textContent = 'An error occurred during login.';
    }
});

populateUsers();