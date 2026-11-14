import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Visual & Copy Fixes Verification Suite', () => {
  it('1. Logo Pro Badge: Sidebar and GlobalHeader render separate styled PRO badge without clipping', () => {
    const sidebarPath = path.resolve(__dirname, '../src/components/Sidebar.tsx');
    const headerPath = path.resolve(__dirname, '../src/components/GlobalHeader.tsx');

    const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
    const headerContent = fs.readFileSync(headerPath, 'utf-8');

    // Make sure neither file concatenates CrestFlowPro into raw text that gets clipped
    assert.ok(!sidebarContent.includes('<>CrestFlow<span'), 'Sidebar must not concatenate raw CrestFlowPro');
    assert.ok(!headerContent.includes('<>CrestFlow<span'), 'GlobalHeader must not concatenate raw CrestFlowPro');

    // Both files render CrestFlow and a distinct PRO badge
    assert.ok(sidebarContent.includes('<span>CrestFlow</span>') && sidebarContent.includes('PRO'));
    assert.ok(headerContent.includes('<span>CrestFlow</span>') && headerContent.includes('PRO'));
  });

  it('2. Dark Chart Theme: Dashboard chart components enforce dark theme tokens', () => {
    const dashboardTabPath = path.resolve(__dirname, '../src/components/DashboardTab.tsx');
    const revChartPath = path.resolve(__dirname, '../src/components/dashboard/RevenueComparisonChart.tsx');

    const dashboardContent = fs.readFileSync(dashboardTabPath, 'utf-8');
    const revChartContent = fs.readFileSync(revChartPath, 'utf-8');

    // Card background #282828 and dark tooltip styles
    assert.ok(dashboardContent.includes("backgroundColor: '#282828'"));
    assert.ok(dashboardContent.includes("stroke=\"#444444\""));

    // RevenueComparisonChart uses #282828 card and #444444 border
    assert.ok(revChartContent.includes("stroke-[#282828]"));
  });

  it('3. Social Links: Filters empty URLs and correctly supports Instagram', () => {
    const footerPath = path.resolve(__dirname, '../src/components/Footer.tsx');
    const footerConfigPath = path.resolve(__dirname, '../src/lib/footerConfig.ts');

    const footerContent = fs.readFileSync(footerPath, 'utf-8');
    const footerConfigContent = fs.readFileSync(footerConfigPath, 'utf-8');

    // Empty URL filtering
    assert.ok(footerContent.includes('.filter((item) => Boolean(item.url && item.url.trim() && item.url !== \'#\'))'));

    // Instagram platform support
    assert.ok(footerContent.includes("case 'instagram':"));
    assert.ok(footerConfigContent.includes("platform: 'instagram'"));
  });

  it('4. Footer Copyright & Origin: Replaces CrestFlow Inc with Built in India by Tilak Popat', () => {
    const publicPrivacy = fs.readFileSync(path.resolve(__dirname, '../public/privacy-policy.html'), 'utf-8');
    const publicRefund = fs.readFileSync(path.resolve(__dirname, '../public/refund-policy.html'), 'utf-8');
    const publicTerms = fs.readFileSync(path.resolve(__dirname, '../public/terms-of-service.html'), 'utf-8');

    const expectedCopyright = '© 2026 CrestFlow. Built in India by Tilak Popat.';

    assert.ok(publicPrivacy.includes(expectedCopyright));
    assert.ok(!publicPrivacy.includes('CrestFlow Inc.'));

    assert.ok(publicRefund.includes(expectedCopyright));
    assert.ok(!publicRefund.includes('CrestFlow Inc.'));

    assert.ok(publicTerms.includes(expectedCopyright));
    assert.ok(!publicTerms.includes('CrestFlow Inc.'));
  });

  it('5. Meta & SEO Claims: #1 claims purged in favor of descriptive freelancer copy', () => {
    const indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');

    assert.ok(!indexHtml.includes('#1 Freelance'));
    assert.ok(!indexHtml.includes('#1 Freelancer'));
    assert.ok(indexHtml.includes('CrestFlow | UPI invoicing and client management for freelancers'));
  });
});
