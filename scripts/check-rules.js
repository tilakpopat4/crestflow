import { execSync } from 'child_process';

const token = execSync('gcloud auth print-access-token', { encoding: 'utf-8' }).trim();
const projectId = 'crestflow-14f4b';

async function main() {
  const rulesetRes = await fetch(`https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets/65f2c31e-5e87-4594-8025-6f6d90f8c75a`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const rulesetData = await rulesetRes.json();
  console.log(rulesetData.source?.files?.[0]?.content);
}

main().catch(console.error);
