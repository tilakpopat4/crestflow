import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? `${local[0]}***` : `${local[0]}***${local[local.length - 1]}`;
  const dParts = domain.split('.');
  const maskedDomain = dParts.map(p => (p.length <= 2 ? `${p[0]}*` : `${p[0]}***${p[p.length - 1]}`)).join('.');
  return `${maskedLocal}@${maskedDomain}`;
}

// Confirmed beta users list or pass via CLI/file
const BETA_USERS: string[] = [
  // Provide user emails here when executing in production
];

async function grandfatherBetaUsers(execute = false) {
  console.log(`[Grandfather Beta Users] Mode: ${execute ? 'EXECUTE' : 'DRY-RUN (Default)'}`);
  
  if (BETA_USERS.length === 0) {
    console.log('No beta users explicitly configured in BETA_USERS array. Add user emails before running with --execute.');
    return;
  }

  const thirtyDaysFromNow = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

  for (const email of BETA_USERS) {
    try {
      const user = await admin.auth().getUserByEmail(email.toLowerCase().trim());
      const currentClaims = user.customClaims || {};
      const newClaims = {
        ...currentClaims,
        crestflow_tier: 'pro',
        crestflow_status: 'active',
        crestflow_valid_until: thirtyDaysFromNow
      };

      console.log(`[User ${user.uid}] (${maskEmail(email)}) -> Setting claims:`, {
        crestflow_tier: 'pro',
        crestflow_status: 'active',
        crestflow_valid_until: new Date(thirtyDaysFromNow * 1000).toISOString()
      });

      if (execute) {
        await admin.auth().setCustomUserClaims(user.uid, newClaims);
        console.log(`[User ${user.uid}] Claims successfully applied.`);
      }
    } catch (err: any) {
      console.error(`Failed to process user ${maskEmail(email)}:`, err.message);
    }
  }

  console.log('[Grandfather Beta Users] Complete.');
}

const executeMode = process.argv.includes('--execute');
grandfatherBetaUsers(executeMode).catch(err => {
  console.error('[Grandfather Beta Users] Error:', err);
  process.exit(1);
});
