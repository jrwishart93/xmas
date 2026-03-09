const admin = require('firebase-admin');

const TEAM_ID = 'rpu-social-fund';

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin.firestore();
}

module.exports = async (req, res) => {
  try {
    const db = getDb();
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [scns, members] = await Promise.all([
      db.collection(`teams/${TEAM_ID}/scns`).where('stage', 'in', ['pleaded_guilty', 'court_convicted']).get(),
      db.collection(`teams/${TEAM_ID}/members`).get(),
    ]);

    const memberNames = new Map();
    members.forEach((doc) => memberNames.set(doc.id, doc.data().displayName || doc.id));

    const totals = new Map();
    let socialFundTotalPence = 0;
    scns.forEach((doc) => {
      const data = doc.data();
      const finalAmountPence = Number(data.finalAmountPence || 0);
      socialFundTotalPence += finalAmountPence;

      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      if (!createdAt || createdAt < ninetyDaysAgo) return;

      totals.set(data.accusedUserId, (totals.get(data.accusedUserId) || 0) + finalAmountPence);
    });

    const leaderboard = [...totals.entries()]
      .map(([uid, totalPence]) => ({ displayName: memberNames.get(uid) || uid, totalPence }))
      .sort((a, b) => b.totalPence - a.totalPence)
      .slice(0, 5);

    res.status(200).json({ socialFundTotalPence, leaderboard });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
