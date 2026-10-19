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

async function splitProfiles(execute = false) {
  console.log(`[Profile Split Migration] Mode: ${execute ? 'EXECUTE' : 'DRY-RUN (Default)'}`);
  const snap = await db.collection('profiles').get();
  let batch = db.batch();
  let ops = 0;
  let totalMigrated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const privateData: Record<string, any> = {};
    if (data.geminiApiKey) privateData.geminiApiKey = data.geminiApiKey;
    if (data.accountNumber) privateData.accountNumber = data.accountNumber;
    if (data.ifscCode) privateData.ifscCode = data.ifscCode;
    if (data.bankName) privateData.bankName = data.bankName;
    if (data.upiId) privateData.upiId = data.upiId;

    if (Object.keys(privateData).length > 0) {
      totalMigrated++;
      console.log(`[Profile ${doc.id}] (${maskEmail(data.email)}) -> Moving [${Object.keys(privateData).join(', ')}] to private/settings subdoc`);
      
      if (execute) {
        const privateRef = doc.ref.collection('private').doc('settings');
        batch.set(privateRef, { ...privateData, updatedAt: Date.now() }, { merge: true });
        
        // Strip private fields from root profile document
        batch.update(doc.ref, {
          geminiApiKey: admin.firestore.FieldValue.delete(),
          accountNumber: admin.firestore.FieldValue.delete(),
          ifscCode: admin.firestore.FieldValue.delete(),
          bankName: admin.firestore.FieldValue.delete()
        });
        ops += 2;

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
  console.log(`[Profile Split Complete] ${totalMigrated} profile(s) processed. Execute mode was ${execute ? 'ACTIVE' : 'INACTIVE (Dry run)'}.`);
}

const isExecute = process.argv.includes('--execute');
splitProfiles(isExecute).catch(console.error);
