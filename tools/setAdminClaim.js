const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const envPath = process.env.SERVICE_ACCOUNT_PATH;
const possiblePaths = [
  envPath,
  path.join(__dirname, '..', 'functions', 'serviceAccountKey.json'),
  path.join(__dirname, '..', 'functionsserviceAccountKey.json'),
  path.join(__dirname, '..', 'serviceAccountKey.json'),
  path.join(__dirname, 'serviceAccountKey.json'),
].filter(Boolean);

const keyPath = possiblePaths.find(p => p && fs.existsSync(p));

if (!keyPath) {
  console.error('Service account key not found. Provide path via SERVICE_ACCOUNT_PATH or place the JSON key in one of:\n', possiblePaths.join('\n'));
  process.exit(1);
}

const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node tools/setAdminClaim.js <USER_UID>');
  process.exit(1);
}

(async () => {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    console.log(`Success: set admin=true for UID ${uid}`);
    console.log('Note: the user must sign out and sign in (or refresh token) to see new claims.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to set custom claims:', err);
    process.exit(1);
  }
})();