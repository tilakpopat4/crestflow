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

async function backfillClientEmails(execute = false) {
  console.log(`[Backfill Client Emails & Payee Info] Mode: ${execute ? 'EXECUTE' : 'DRY-RUN (Default)'}`);

  // 1. Build client ID -> email map
  console.log('Loading clients...');
  const clientsSnap = await db.collection('clients').get();
  const clientEmailMap = new Map<string, string>();
  for (const doc of clientsSnap.docs) {
    const data = doc.data();
    if (data.email && typeof data.email === 'string') {
      clientEmailMap.set(doc.id, data.email.toLowerCase().trim());
    }
  }
  console.log(`Loaded ${clientEmailMap.size} client email mappings.`);

  // 2. Build profile ID -> payee info map
  console.log('Loading profiles...');
  const profilesSnap = await db.collection('profiles').get();
  const payeeMap = new Map<string, { payeeName?: string; payeeUpiId?: string }>();
  for (const doc of profilesSnap.docs) {
    const data = doc.data();
    payeeMap.set(doc.id, {
      payeeName: data.name || '',
      payeeUpiId: data.upiId || ''
    });
  }
  console.log(`Loaded ${payeeMap.size} user profile payee mappings.`);

  let batch = db.batch();
  let ops = 0;
  let invoicesUpdated = 0;
  let workItemsUpdated = 0;

  // 3. Process invoices
  console.log('Processing invoices...');
  const invoicesSnap = await db.collection('invoices').get();
  for (const doc of invoicesSnap.docs) {
    const data = doc.data();
    const updates: Record<string, any> = {};

    const targetEmail = clientEmailMap.get(data.clientId);
    if (targetEmail && (!data.clientEmail || data.clientEmail !== targetEmail)) {
      updates.clientEmail = targetEmail;
    }

    const payeeInfo = payeeMap.get(data.userId);
    if (payeeInfo) {
      if (!data.payeeName && payeeInfo.payeeName) {
        updates.payeeName = payeeInfo.payeeName;
      }
      if (!data.payeeUpiId && payeeInfo.payeeUpiId) {
        updates.payeeUpiId = payeeInfo.payeeUpiId;
      }
    }

    if (Object.keys(updates).length > 0) {
      invoicesUpdated++;
      const logEmail = updates.clientEmail ? maskEmail(updates.clientEmail) : '(no email change)';
      console.log(`[Invoice ${doc.id}] Updating fields: ${JSON.stringify({ ...updates, clientEmail: logEmail })}`);

      if (execute) {
        batch.update(doc.ref, updates);
        ops++;
        if (ops >= 450) {
          await batch.commit();
          batch = db.batch();
          ops = 0;
        }
      }
    }
  }

  // 4. Process workItems
  console.log('Processing workItems...');
  const workItemsSnap = await db.collection('workItems').get();
  for (const doc of workItemsSnap.docs) {
    const data = doc.data();
    const targetEmail = clientEmailMap.get(data.clientId);

    if (targetEmail && (!data.clientEmail || data.clientEmail !== targetEmail)) {
      workItemsUpdated++;
      console.log(`[WorkItem ${doc.id}] Setting clientEmail -> ${maskEmail(targetEmail)}`);

      if (execute) {
        batch.update(doc.ref, { clientEmail: targetEmail });
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

  console.log(`[Backfill Complete] Invoices updated: ${invoicesUpdated}, WorkItems updated: ${workItemsUpdated}`);
}

const executeMode = process.argv.includes('--execute');
backfillClientEmails(executeMode).catch(err => {
  console.error('[Backfill Client Emails] Error:', err);
  process.exit(1);
});
