import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, Globe } from 'lucide-react';
import { useFooterConfig, FooterConfig, FooterLink, FooterSocialLink, DEFAULT_FOOTER_CONFIG } from '../../lib/footerConfig';
import AdminFooterLinksSection from './AdminFooterLinksSection';
import AdminFooterSocialSection from './AdminFooterSocialSection';

/**
 * Admin component for customizing footer links, names, social icons, and branding.
 * Changes are persisted directly to Firestore (`system_settings/footer_config`) and synced real-time.
 */
export default function AdminFooterManager() {
  const { config, saveConfig, resetConfig, loading } = useFooterConfig();
  const [draft, setDraft] = useState<FooterConfig>(config);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) setDraft(config);
  }, [loading, config]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await saveConfig(draft);
      showStatus('Footer updated and published live!');
    } catch (err: any) {
      alert('Error saving footer: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset all footer links and settings back to default?')) return;
    setSaving(true);
    try {
      await resetConfig();
      setDraft(DEFAULT_FOOTER_CONFIG);
      showStatus('Footer reset to defaults.');
    } catch (err: any) {
      alert('Error resetting footer: ' + (err?.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with actions */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>Footer Links &amp; Navigation Editor</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage links, labels, routes, legal documents, and social media icons across all application footers.
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {statusMessage && (
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>{statusMessage}</span>
            </span>
          )}
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg cursor-pointer border-0 inline-flex items-center gap-1.5 transition-colors duration-120"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg cursor-pointer border-0 inline-flex items-center gap-1.5 transition-colors duration-120 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'Publishing…' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>

      {/* 1. Branding & Meta */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Branding &amp; Meta Text</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Brand Name</label>
            <input
              type="text"
              value={draft.brandName}
              onChange={(e) => setDraft({ ...draft, brandName: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Copyright Notice</label>
            <input
              type="text"
              value={draft.copyrightText}
              onChange={(e) => setDraft({ ...draft, copyrightText: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">App Version</label>
            <input
              type="text"
              value={draft.versionText}
              onChange={(e) => setDraft({ ...draft, versionText: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* 2. Primary Navigation Links */}
      <AdminFooterLinksSection
        title="Primary Navigation Hyperlinks"
        description="Top-row links for Product, Features, Pricing, and custom sections."
        addButtonLabel="Add Nav Link"
        links={draft.primaryLinks}
        onAdd={() =>
          setDraft((prev) => ({
            ...prev,
            primaryLinks: [...prev.primaryLinks, { id: `p_${Date.now()}`, name: 'New Link', url: '/' }],
          }))
        }
        onUpdate={(id, field, val) =>
          setDraft((prev) => ({
            ...prev,
            primaryLinks: prev.primaryLinks.map((l) => (l.id === id ? { ...l, [field]: val } : l)),
          }))
        }
        onRemove={(id) =>
          setDraft((prev) => ({
            ...prev,
            primaryLinks: prev.primaryLinks.filter((l) => l.id !== id),
          }))
        }
      />

      {/* 3. Legal & Policy Links */}
      <AdminFooterLinksSection
        title="Legal &amp; Policy Hyperlinks"
        description="Bottom row links for Privacy, Terms, Cancellation, Cookies, etc."
        addButtonLabel="Add Policy Link"
        links={draft.legalLinks}
        onAdd={() =>
          setDraft((prev) => ({
            ...prev,
            legalLinks: [...prev.legalLinks, { id: `l_${Date.now()}`, name: 'New Policy', url: '/terms' }],
          }))
        }
        onUpdate={(id, field, val) =>
          setDraft((prev) => ({
            ...prev,
            legalLinks: prev.legalLinks.map((l) => (l.id === id ? { ...l, [field]: val } : l)),
          }))
        }
        onRemove={(id) =>
          setDraft((prev) => ({
            ...prev,
            legalLinks: prev.legalLinks.filter((l) => l.id !== id),
          }))
        }
      />

      {/* 4. Social Media Hyperlinks */}
      <AdminFooterSocialSection
        socialLinks={draft.socialLinks}
        onAdd={() =>
          setDraft((prev) => ({
            ...prev,
            socialLinks: [
              ...prev.socialLinks,
              { id: `s_${Date.now()}`, platform: 'custom', name: 'New Social', url: 'https://' },
            ],
          }))
        }
        onUpdate={(id, field, val) =>
          setDraft((prev) => ({
            ...prev,
            socialLinks: prev.socialLinks.map((s) => (s.id === id ? { ...s, [field]: val } : s)),
          }))
        }
        onRemove={(id) =>
          setDraft((prev) => ({
            ...prev,
            socialLinks: prev.socialLinks.filter((s) => s.id !== id),
          }))
        }
      />
    </div>
  );
}
