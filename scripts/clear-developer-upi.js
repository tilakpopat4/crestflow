#!/usr/bin/env node
/**
 * scripts/clear-developer-upi.js
 *
 * Migration script to identify and clear hardcoded developer UPI IDs from
 * user profile documents in Cloud Firestore.
 *
 * Defaults to DRY-RUN mode.
 *
 * Usage:
 *   node scripts/clear-developer-upi.js            # Dry-run mode (read-only, reports matches)
 *   node scripts/clear-developer-upi.js --dry-run  # Explicit dry-run
 *   node scripts/clear-developer-upi.js --apply    # Applies the changes in Firestore
 */

const DEVELOPER_UPI_TARGET = 'tilakpopat2007-1@okaxis';
const isApply = process.argv.includes('--apply');
const isDryRun = !isApply || process.argv.includes('--dry-run');

console.log('='.repeat(70));
console.log('CrestFlow Developer UPI Cleanup Migration');
console.log(`Target UPI to clear: "${DEVELOPER_UPI_TARGET}"`);
console.log(`Execution Mode: ${isDryRun ? 'DRY-RUN (No changes will be written)' : 'LIVE APPLY (Firestore will be updated)'}`);
console.log('='.repeat(70));

async function main() {
  let admin;
  try {
    admin = (await import('firebase-admin')).default;
  } catch {
    console.log('\n[INFO] "firebase-admin" is not installed in the local project.');
    console.log('To run this migration against your production Firestore project, run:');
    console.log('  npx -p firebase-admin node scripts/clear-developer-upi.js --dry-run');
    console.log('  npx -p firebase-admin node scripts/clear-developer-upi.js --apply\n');
    console.log('Ensure GOOGLE_APPLICATION_CREDENTIALS points to your Firebase service account key.');
    process.exit(0);
  }

  if (!admin.apps.length) {
    try {
      admin.initializeApp();
    } catch (err) {
      console.error('Failed to initialize Firebase Admin SDK. Ensure GOOGLE_APPLICATION_CREDENTIALS is set.');
      console.error(err.message);
      process.exit(1);
    }
  }

  const db = admin.firestore();
  console.log('\nScanning "profiles" collection for legacy developer UPI ID...');
  const snapshot = await db.collection('profiles').where('upiId', '==', DEVELOPER_UPI_TARGET).get();

  if (snapshot.empty) {
    console.log(`\nNo profile documents found with upiId = "${DEVELOPER_UPI_TARGET}".`);
    console.log('Migration complete - database is clean.');
    process.exit(0);
  }

  console.log(`\nFound ${snapshot.size} profile(s) with the legacy developer UPI ID:\n`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    console.log(`  - Profile ID: ${doc.id} (name: "${data.name || 'N/A'}", email: "${data.email || 'N/A'}")`);

    if (!isDryRun) {
      await doc.ref.update({
        upiId: '',
        updatedAt: Date.now(),
      });
      console.log(`    -> Cleared upiId for profile ${doc.id}`);
    }
  }

  if (isDryRun) {
    console.log(`\n[DRY-RUN COMPLETE] Found ${snapshot.size} document(s) that would be updated.`);
    console.log('To apply these changes, re-run with: node scripts/clear-developer-upi.js --apply\n');
  } else {
    console.log(`\n[APPLY COMPLETE] Successfully cleared developer UPI from ${snapshot.size} document(s).\n`);
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
