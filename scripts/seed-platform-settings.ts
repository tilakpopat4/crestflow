import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function seedPlatformSettings(execute = false) {
  console.log(`[Seed Platform Settings] Mode: ${execute ? 'EXECUTE' : 'DRY-RUN (Default)'}`);
  const settingsRef = db.collection('platform_settings').doc('billing');
  const snap = await settingsRef.get();

  if (!snap.exists) {
    console.log('[platform_settings/billing] Document missing. Will initialize with { enabled: false }');
    if (execute) {
      await settingsRef.set({
        enabled: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('[platform_settings/billing] Successfully initialized.');
    }
  } else {
    console.log('[platform_settings/billing] Document already exists:', snap.data());
  }
}

const executeMode = process.argv.includes('--execute');
seedPlatformSettings(executeMode).catch(err => {
  console.error('[Seed Platform Settings] Error:', err);
  process.exit(1);
});
