/**
 * CrestFlow Migration: Remove Stored Gemini API Keys
 *
 * Scans `profiles` root documents and `profiles/{id}/private/settings` documents,
 * detects any legacy stored `geminiApiKey` fields, and deletes them.
 *
 * SAFETY:
 * - Defaults to DRY-RUN mode. Lists documents that would be modified without mutating.
 * - Only modifies Firestore when invoked with `--execute`.
 * - Never prints API keys in console output.
 *
 * Usage:
 *   node scripts/remove-stored-gemini-keys.js           # Dry-run
 *   node scripts/remove-stored-gemini-keys.js --execute # Real update
 */

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const isExecute = process.argv.includes('--execute');

async function removeStoredGeminiKeys() {
  console.log('='.repeat(70));
  console.log(`[MIGRATION] Purge Gemini API Keys from Firestore`);
  console.log(`[MODE] ${isExecute ? '⚠️ EXECUTE (Live Changes)' : '🛡️ DRY RUN (No writes)'}`);
  console.log('='.repeat(70));

  const profilesSnap = await db.collection('profiles').get();
  let rootFound = 0;
  let subdocFound = 0;
  let batch = db.batch();
  let opsCount = 0;

  for (const doc of profilesSnap.docs) {
    const data = doc.data();

    // Check root document
    if (data.geminiApiKey) {
      rootFound++;
      console.log(`[FOUND - ROOT] Profile ${doc.id}: contains stored geminiApiKey`);
      if (isExecute) {
        batch.update(doc.ref, {
          geminiApiKey: admin.firestore.FieldValue.delete(),
          updatedAt: Date.now(),
        });
        opsCount++;
      }
    }

    // Check private/settings subdocument
    const privateDocRef = doc.ref.collection('private').doc('settings');
    const privateDocSnap = await privateDocRef.get();
    if (privateDocSnap.exists) {
      const privateData = privateDocSnap.data();
      if (privateData?.geminiApiKey) {
        subdocFound++;
        console.log(`[FOUND - SUBCOLLECTION] Profile ${doc.id}/private/settings: contains stored geminiApiKey`);
        if (isExecute) {
          batch.update(privateDocRef, {
            geminiApiKey: admin.firestore.FieldValue.delete(),
            updatedAt: Date.now(),
          });
          opsCount++;
        }
      }
    }

    if (isExecute && opsCount >= 400) {
      await batch.commit();
      batch = db.batch();
      opsCount = 0;
    }
  }

  if (isExecute && opsCount > 0) {
    await batch.commit();
  }

  console.log('-'.repeat(70));
  console.log(`Summary:`);
  console.log(`- Root profile docs with stored key: ${rootFound}`);
  console.log(`- Private settings subdocs with stored key: ${subdocFound}`);
  console.log(`- Action: ${isExecute ? `Successfully removed stored keys.` : 'Dry-run complete. Re-run with --execute to commit.'}`);
  console.log('='.repeat(70));
}

removeStoredGeminiKeys().catch(console.error);
