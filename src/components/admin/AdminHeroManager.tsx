import React, { useState, useEffect } from 'react';
import { RotateCcw, Check, LayoutTemplate } from 'lucide-react';
import { useHeroConfig, HeroConfig, DEFAULT_HERO_CONFIG } from '../../lib/heroConfig';
import { generateUUID } from '../../lib/utils';
import AdminHeroBenefitsSection from './AdminHeroBenefitsSection';
import AdminHeroMediaSection from './AdminHeroMediaSection';

/**
 * Admin manager for the hero section:
 * - Edit headline, highlighted text, and description
 * - Add, edit, and remove benefit feature chips
 * - Configure custom photo, video, or solid color background
 * - Control alignment of the sign-in / sign-up card
 */
export default function AdminHeroManager() {
  const { config, saveConfig, resetConfig, loading } = useHeroConfig();
  const [draft, setDraft] = useState<HeroConfig>(config);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) setDraft(config);
  }, [loading, config]);

  const showStatus = (msg: string) => {
    setErrorMessage(null);
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const saved = await saveConfig(draft);
      setDraft(saved);
      showStatus('Hero section configuration published live.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save hero configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset hero section copy, background, and alignment back to default?')) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const reset = await resetConfig();
      setDraft(reset || DEFAULT_HERO_CONFIG);
      showStatus('Hero section reset to defaults.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to reset hero configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddBenefit = () => {
    setDraft({
      ...draft,
      showBenefits: true,
      benefits: [
        ...draft.benefits,
        { id: generateUUID(), title: 'New Feature Benefit', description: 'Describe what this feature offers to freelancers.' },
      ],
    });
  };

  const handleUpdateBenefit = (id: string, field: 'title' | 'description', value: string) => {
    setDraft({
      ...draft,
      benefits: draft.benefits.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    });
  };

  const handleRemoveBenefit = (id: string) => {
    const remaining = draft.benefits.filter((b) => b.id !== id);
    setDraft({
      ...draft,
      benefits: remaining,
      ...(remaining.length === 0 ? { showBenefits: false } : {}),
    });
  };

  const handleRemoveAllBenefits = () => {
    setDraft({
      ...draft,
      benefits: [],
      showBenefits: false,
    });
  };

  const handleToggleShowBenefits = (enabled: boolean) => {
    setDraft({
      ...draft,
      showBenefits: enabled,
    });
  };

  return (
    <div className="space-y-6 text-[#F7F7F8]">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#131318] border border-[#2A2A33] p-4 sm:p-5 rounded-xl">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-accent" />
            <span>Hero &amp; Landing Page Manager</span>
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Customize the landing hero copy, background media (photo/video), and auth box alignment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="px-3 py-1.5 bg-[#1B1B22] hover:bg-[#2A2A33] text-[#A1A1AA] rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0 shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{saving ? 'Publishing...' : 'Save & Publish Live'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-lg text-xs">
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-lg text-xs">
          {errorMessage}
        </div>
      )}

      {/* Grid: Left Column (Text & Benefits), Right Column (Media & Alignment) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Headline, Highlight & Subtitle */}
        <div className="bg-[#131318] border border-[#2A2A33] rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Hero Text &amp; Copy</h3>
          
          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Headline Text</label>
            <input
              type="text"
              value={draft.headline}
              onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
              className="w-full bg-[#0B0B0E] border border-[#2A2A33] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#2A2A33]"
              placeholder="e.g. Invoice. Scan. Get Paid."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1">
              Highlighted Substring (Styled in Indigo Accent)
            </label>
            <input
              type="text"
              value={draft.headlineHighlight}
              onChange={(e) => setDraft({ ...draft, headlineHighlight: e.target.value })}
              className="w-full bg-[#0B0B0E] border border-[#2A2A33] rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-[#2A2A33]"
              placeholder="e.g. Get Paid."
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#A1A1AA] mb-1">Subtitle / Supporting Copy</label>
            <textarea
              rows={3}
              value={draft.subtitle}
              onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
              className="w-full bg-[#0B0B0E] border border-[#2A2A33] rounded-lg p-3 text-xs text-white outline-none focus:border-[#2A2A33] leading-relaxed"
              placeholder="Describe your platform value proposition..."
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#2A2A33]">
            <div>
              <p className="text-xs font-medium text-white">Show Workflow Illustration Diagram</p>
              <p className="text-[11px] text-[#A1A1AA]">Renders the graphic showing deliverable and invoice cycle.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.showWorkflowIllustration}
              onClick={() => setDraft({ ...draft, showWorkflowIllustration: !draft.showWorkflowIllustration })}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-150 border-0 ${
                draft.showWorkflowIllustration ? 'bg-accent' : 'bg-[#2A2A33]'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[#131318] transition-transform duration-150 mt-0.5 ml-0.5 ${
                draft.showWorkflowIllustration ? 'translate-x-4' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

        {/* Card 2: Background Media & Box Alignment */}
        <AdminHeroMediaSection draft={draft} setDraft={setDraft} />
      </div>

      {/* Feature Benefit Chips Section */}
      <AdminHeroBenefitsSection
        benefits={draft.benefits}
        showBenefits={draft.showBenefits !== false}
        onToggleShowBenefits={handleToggleShowBenefits}
        onAddBenefit={handleAddBenefit}
        onUpdateBenefit={handleUpdateBenefit}
        onRemoveBenefit={handleRemoveBenefit}
        onRemoveAllBenefits={handleRemoveAllBenefits}
      />
    </div>
  );
}
