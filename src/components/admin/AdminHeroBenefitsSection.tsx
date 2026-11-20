import React from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { HeroBenefit } from '../../lib/heroConfig';

interface AdminHeroBenefitsSectionProps {
  benefits: HeroBenefit[];
  showBenefits?: boolean;
  onToggleShowBenefits?: (enabled: boolean) => void;
  onAddBenefit: () => void;
  onUpdateBenefit: (id: string, field: 'title' | 'description', value: string) => void;
  onRemoveBenefit: (id: string) => void;
  onRemoveAllBenefits?: () => void;
}

/**
 * Sub-component for managing the key feature & benefit chips on the landing hero:
 * - Master toggle to show/hide benefit cards entirely from the landing page
 * - Remove individual chips or clear all cards with one click
 * - Add and customize feature titles and descriptions
 */
export const AdminHeroBenefitsSection: React.FC<AdminHeroBenefitsSectionProps> = ({
  benefits,
  showBenefits = true,
  onToggleShowBenefits,
  onAddBenefit,
  onUpdateBenefit,
  onRemoveBenefit,
  onRemoveAllBenefits,
}) => {
  return (
    <div className="bg-[#212121] border border-[#333333] rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Feature &amp; Benefit Chips</span>
            {!showBenefits && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-medium normal-case">
                Hidden on Landing
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Add, edit, or completely remove the feature cards shown on the hero.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onToggleShowBenefits && (
            <button
              type="button"
              onClick={() => onToggleShowBenefits(!showBenefits)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border ${
                showBenefits
                  ? 'bg-[#282828] hover:bg-[#333333] text-slate-200 border-[#383838]'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              {showBenefits ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showBenefits ? 'Visible on Hero' : 'Hidden on Hero'}</span>
            </button>
          )}

          {benefits.length > 0 && onRemoveAllBenefits && (
            <button
              type="button"
              onClick={onRemoveAllBenefits}
              className="px-2.5 py-1.5 bg-[#282828] hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-[#383838]"
              title="Remove all benefit chips"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddBenefit}
            className="px-3 py-1.5 bg-[#282828] hover:bg-[#333333] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Benefit</span>
          </button>
        </div>
      </div>

      {!showBenefits ? (
        <div className="p-4 bg-[#181818] border border-dashed border-[#383838] rounded-lg text-center space-y-2">
          <p className="text-xs text-slate-400">
            Feature &amp; benefit cards are currently <strong className="text-white">completely hidden</strong> from the landing page for a clean, minimal look.
          </p>
          {onToggleShowBenefits && (
            <button
              type="button"
              onClick={() => onToggleShowBenefits(true)}
              className="px-3 py-1 bg-[#282828] hover:bg-[#333333] text-white text-xs rounded font-medium cursor-pointer border-0"
            >
              Show Cards on Hero
            </button>
          )}
        </div>
      ) : benefits.length === 0 ? (
        <div className="p-4 bg-[#181818] border border-dashed border-[#383838] rounded-lg text-center space-y-2">
          <p className="text-xs text-slate-400">
            All benefit chips have been removed. The landing hero will display without any cards.
          </p>
          <button
            type="button"
            onClick={onAddBenefit}
            className="px-3 py-1 bg-[#282828] hover:bg-[#333333] text-white text-xs rounded font-medium inline-flex items-center gap-1 cursor-pointer border-0"
          >
            <Plus className="w-3 h-3" />
            <span>Add a Benefit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {benefits.map((b, idx) => (
            <div key={b.id} className="bg-[#181818] border border-[#383838] p-3 rounded-lg space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500 font-semibold">#{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => onRemoveBenefit(b.id)}
                  title="Remove this benefit"
                  className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Benefit Title</label>
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => onUpdateBenefit(b.id, 'title', e.target.value)}
                  className="w-full bg-[#222222] border border-[#383838] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-slate-500"
                  placeholder="Feature name..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-0.5">Description</label>
                <textarea
                  rows={2}
                  value={b.description}
                  onChange={(e) => onUpdateBenefit(b.id, 'description', e.target.value)}
                  className="w-full bg-[#222222] border border-[#383838] rounded p-2 text-xs text-white outline-none focus:border-slate-500 leading-relaxed"
                  placeholder="Short explanation..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminHeroBenefitsSection;