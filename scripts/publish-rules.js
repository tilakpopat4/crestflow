import fs from 'fs';
import { execSync } from 'child_process';

const projectId = 'crestflow-14f4b';
const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const rulesContent = fs.readFileSync('firestore.rules', 'utf-8');

async function publishRules() {
  console.log('='.repeat(70));
  console.log(`[PUBLISH] Publishing firestore.rules to project ${projectId}`);
  console.log('='.repeat(70));

  // Step 1: Create ruleset
  console.log('1. Creating new ruleset via Firebase Rules API...');
  const createRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent
          }
        ]
      }
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create ruleset: ${createRes.status} ${errText}`);
  }

  const rulesetData = await createRes.json();
  console.log('Ruleset created successfully:', rulesetData.name);

  // Step 2: Release ruleset to cloud.firestore
  console.log('2. Releasing ruleset to live cloud.firestore release...');
  const releaseRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/releases/cloud.firestore`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      release: {
        name: `projects/${projectId}/releases/cloud.firestore`,
        rulesetName: rulesetData.name
      }
    })
  });

  if (!releaseRes.ok) {
    const errText = await releaseRes.text();
    throw new Error(`Failed to release ruleset: ${releaseRes.status} ${errText}`);
  }

  const releaseData = await releaseRes.json();
  console.log('Release updated successfully!');
  console.log(JSON.stringify(releaseData, null, 2));
  console.log('='.repeat(70));
}

publishRules().catch(console.error);
