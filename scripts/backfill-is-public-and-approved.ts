import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? `${local[0]}***` : `${local[0]}***${local[local.length - 1]}`;
  const dParts = domain.split('.');
  const maskedDomain = dParts.map(p => (p.length <= 2 ? `${p[0]}*` : `${p[0]}***${p[p.length - 1]}`)).join('.');
  return `${maskedLocal}@${maskedDomain}`;
}

async function backfillFlags(execute = false) {
  console.log(`[Backfill Flags] Mode: ${execute ? 'EXECUTE' : 'DRY-RUN (Default)'}`);
  let batch = db.batch();
  let ops = 0;
  let profCount = 0;
  let revCount = 0;

  // 1. Profiles: Ensure isPublicProfile is set
  const profSnap = await db.collection('profiles').get();
  for (const doc of profSnap.docs) {
    if (doc.data().isPublicProfile === undefined) {
      profCount++;
      console.log(`[Profile ${doc.id}] (${maskEmail(doc.data().email)}) -> Setting isPublicProfile = true`);
      if (execute) {
        batch.update(doc.ref, { isPublicProfile: true });
        ops++;
        if (ops >= 450) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
    }
  }

  // 2. Reviews: Ensure isApproved is set (historical approved = true, new defaults to false)
  const revSnap = await db.collection('reviews').get();
  for (const doc of revSnap.docs) {
    if (doc.data().isApproved === undefined) {
      revCount++;
      console.log(`[Review ${doc.id}] -> Setting isApproved = true for historical review`);
      if (execute) {
        batch.update(doc.ref, { isApproved: true });
        ops++;
        if (ops >= 450) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
    }
  }

  if (execute && ops > 0) {
    await batch.commit();
  }
  console.log(`[Backfill Flags Complete] Profiles: ${profCount}, Reviews: ${revCount}. Execute mode was ${execute ? 'ACTIVE' : 'INACTIVE (Dry run)'}.`);
}

const isExecute = process.argv.includes('--execute');
backfillFlags(isExecute).catch(console.error);
