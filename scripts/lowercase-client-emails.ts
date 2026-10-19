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

async function lowercaseClientEmails(execute = false) {
  console.log(`[Lowercase Client Emails] Mode: ${execute ? 'EXECUTE' : 'DRY-RUN (Default)'}`);
  const snap = await db.collection('clients').get();
  let batch = db.batch();
  let ops = 0;
  let changed = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (typeof data.email === 'string') {
      const normalized = data.email.toLowerCase().trim();
      if (normalized !== data.email) {
        changed++;
        console.log(`[Client ${doc.id}] Normalizing: ${maskEmail(data.email)} -> ${maskEmail(normalized)}`);
        if (execute) {
          batch.update(doc.ref, { email: normalized });
          ops++;
          if (ops >= 450) {
            await batch.commit();
            batch = db.batch();
            ops = 0;
          }
        }
      }
    }
  }

  if (execute && ops > 0) {
    await batch.commit();
  }

  console.log(`[Lowercase Client Emails] Complete. Total changed: ${changed} of ${snap.size} clients.`);
}

const executeMode = process.argv.includes('--execute');
lowercaseClientEmails(executeMode).catch(err => {
  console.error('[Lowercase Client Emails] Error:', err);
  process.exit(1);
});
