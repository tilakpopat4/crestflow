/**
 * CrestFlow Migration: Build Public Profile Documents
 *
 * Scans `profiles` collection and ensures each public profile has appropriate
 * sanitized fields in `public_profiles/{username}` or verified root doc state.
 *
 * SAFETY:
 * - Defaults to DRY-RUN mode.
 * - Only modifies Firestore when invoked with `--execute`.
 * - Excludes sensitive billing/admin fields.
 *
 * Usage:
 *   node scripts/build-public-profiles.js           # Dry-run
 *   node scripts/build-public-profiles.js --execute # Real update
 */

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const isExecute = process.argv.includes('--execute');

async function buildPublicProfiles() {
  console.log('='.repeat(70));
  console.log(`[MIGRATION] Build / Verify Public Profile Documents`);
  console.log(`[MODE] ${isExecute ? '⚠️ EXECUTE (Live Changes)' : '🛡️ DRY RUN (No writes)'}`);
  console.log('='.repeat(70));

  const profilesSnap = await db.collection('profiles').get();
  let candidateCount = 0;
  let batch = db.batch();
  let opsCount = 0;

  for (const doc of profilesSnap.docs) {
    const data = doc.data();
    if (data.isPublicProfile !== false && (data.username || data.name)) {
      candidateCount++;
      const username = (data.username || doc.id).toLowerCase();
      console.log(`[PUBLIC CANDIDATE] Profile ${doc.id} -> username: ${username}, name: ${data.name || 'Anonymous'}`);

      if (isExecute) {
        const publicDocRef = db.collection('public_profiles').doc(username);
        batch.set(publicDocRef, {
          userId: doc.id,
          username,
          name: data.name || '',
          professionalTitle: data.professionalTitle || '',
          servicesDescription: data.servicesDescription || '',
          freelanceStartDate: data.freelanceStartDate || null,
          workExperienceBio: data.workExperienceBio || '',
          photoURL: data.photoURL || '',
          updatedAt: Date.now(),
        }, { merge: true });
        opsCount++;

        if (opsCount >= 400) {
          await batch.commit();
          batch = db.batch();
          opsCount = 0;
        }
      }
    }
  }

  if (isExecute && opsCount > 0) {
    await batch.commit();
  }

  console.log('-'.repeat(70));
  console.log(`Summary:`);
  console.log(`- Profiles processed: ${candidateCount}`);
  console.log(`- Action: ${isExecute ? 'Successfully synchronized public profiles.' : 'Dry-run complete. Re-run with --execute to commit.'}`);
  console.log('='.repeat(70));
}

buildPublicProfiles().catch(console.error);
