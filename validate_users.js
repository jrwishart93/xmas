import { db } from './firebase.js';
import { collection, getDocs, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js";

const requiredUsers = {
    'derek': { name: 'Derek N', password: '7006' },
    'lawrie': { name: 'Lawrie C', password: '1024' },
    'jo': { name: 'Jo M', password: '0175' },
    'paul': { name: 'Paul E', password: '6571' },
    'chris': { name: 'Chris B', password: '2181' },
    'steve': { name: 'Steve H', password: '4545' },
    'adamj': { name: 'Adam J', password: '2287' },
    'adamb': { name: 'Adam B', password: '7120' },
    'jamie': { name: 'Jamie W', password: '3393' },
};

async function validateUsers() {
    console.log('Starting user validation...');
    const usersColRef = collection(db, 'users');
    const userSnapshot = await getDocs(usersColRef);
    const existingUsers = {};
    userSnapshot.docs.forEach(doc => {
        existingUsers[doc.id] = doc.data();
    });

    const requiredUserIds = Object.keys(requiredUsers);
    const existingUserIds = Object.keys(existingUsers);

    // Users to delete
    const usersToDelete = existingUserIds.filter(id => !requiredUserIds.includes(id));
    for (const userId of usersToDelete) {
        console.log(`Deleting extra user: ${userId}`);
        await deleteDoc(doc(db, "users", userId));
    }

    // Users to add or update
    for (const userId of requiredUserIds) {
        const requiredData = requiredUsers[userId];
        const existingData = existingUsers[userId];
        const docRef = doc(db, "users", userId);

        if (!existingData || 
            existingData.name !== requiredData.name || 
            existingData.password !== requiredData.password ||
            existingData.pin !== undefined) {
            
            console.log(`Creating/updating user: ${userId}`);
            await setDoc(docRef, {
                name: requiredData.name,
                password: requiredData.password,
                hasSubmitted: false,
                choices: {}
            });
        }
    }

    console.log('User validation complete.');
}

// To run this script, open index.html in your browser,
// open the developer console, and paste the content of this file.
// Then call validateUsers();