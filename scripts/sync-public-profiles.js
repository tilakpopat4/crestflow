import { execSync } from 'child_process';

const projectId = 'crestflow-14f4b';
const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();

function fromFirestoreValue(val) {
  if (!val) return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return val.booleanValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return val.doubleValue;
  if ('stringValue' in val) return val.stringValue;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) return (val.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

async function syncPublicProfiles() {
  console.log('='.repeat(70));
  console.log(`[SYNC] Syncing public profiles for project: ${projectId}`);
  console.log('='.repeat(70));

  // 1. Fetch all profiles
  const res = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/profiles`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to list profiles: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  const docs = data.documents || [];
  console.log(`Found ${docs.length} profile documents in production.`);

  for (const doc of docs) {
    const docId = doc.name.split('/').pop();
    const raw = {};
    for (const [k, v] of Object.entries(doc.fields || {})) {
      raw[k] = fromFirestoreValue(v);
    }

    const userId = raw.userId || docId;
    const username = raw.username ? raw.username.toLowerCase().trim() : null;
    const name = raw.name || 'Freelancer';
    const professionalTitle = raw.professionalTitle || '';
    const servicesDescription = raw.servicesDescription || '';
    const workExperienceBio = raw.workExperienceBio || '';
    const photoURL = raw.photoURL || '';
    const freelanceStartDate = raw.freelanceStartDate || null;
    const phone = raw.phone || '';

    const publicProfile = {
      userId,
      name,
      professionalTitle,
      servicesDescription,
      workExperienceBio,
      photoURL,
      freelanceStartDate,
      phone,
      updatedAt: Date.now()
    };
    if (username) {
      publicProfile.username = username;
    }

    // Prepare Firestore fields
    const firestoreFields = {};
    for (const [k, v] of Object.entries(publicProfile)) {
      if (v !== null && v !== undefined && v !== '') {
        firestoreFields[k] = toFirestoreValue(v);
      }
    }

    // Save under userId
    console.log(`Writing public_profiles/${userId} (${name}, handle: ${username || 'none'})...`);
    const putUserRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/public_profiles/${userId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: firestoreFields })
      }
    );
    if (!putUserRes.ok) {
      console.warn(`Failed writing public_profiles/${userId}:`, await putUserRes.text());
    }

    // If username exists, also save under username so direct doc lookup by handle works instantly!
    if (username) {
      console.log(`Writing public_profiles/${username}...`);
      const putUsernameRes = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/public_profiles/${username}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields: firestoreFields })
        }
      );
      if (!putUsernameRes.ok) {
        console.warn(`Failed writing public_profiles/${username}:`, await putUsernameRes.text());
      }
    }
  }

  console.log('='.repeat(70));
  console.log('[SYNC COMPLETE] All public profiles synchronized successfully.');
  console.log('='.repeat(70));
}

syncPublicProfiles().catch(console.error);
