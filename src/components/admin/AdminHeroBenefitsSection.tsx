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
    <div className="bg-[#131318] border border-[#2A2A33] rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>Feature &amp; Benefit Chips</span>
            {!showBenefits && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#FFB020]/10 text-[#FFB020] font-medium normal-case">
                Hidden on Landing
              </span>
            )}
          </h3>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
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
                  ? 'bg-[#1B1B22] hover:bg-[#2A2A33] text-[#F7F7F8] border-[#2A2A33]'
                  : 'bg-[#FFB020]/15 text-amber-300 border-[#FFB020]/30'
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
              className="px-2.5 py-1.5 bg-[#1B1B22] hover:bg-red-950/40 text-[#A1A1AA] hover:text-[#F0607A] rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer border border-[#2A2A33]"
              title="Remove all benefit chips"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddBenefit}
            className="px-3 py-1.5 bg-[#1B1B22] hover:bg-[#2A2A33] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Benefit</span>
          </button>
        </div>
      </div>

      {!showBenefits ? (
        <div className="p-4 bg-[#0B0B0E] border border-dashed border-[#2A2A33] rounded-lg text-center space-y-2">
          <p className="text-xs text-[#A1A1AA]">
            Feature &amp; benefit cards are currently <strong className="text-white">completely hidden</strong> from the landing page for a clean, minimal look.
          </p>
          {onToggleShowBenefits && (
            <button
              type="button"
              onClick={() => onToggleShowBenefits(true)}
              className="px-3 py-1 bg-[#1B1B22] hover:bg-[#2A2A33] text-white text-xs rounded font-medium cursor-pointer border-0"
            >
              Show Cards on Hero
            </button>
          )}
        </div>
      ) : benefits.length === 0 ? (
        <div className="p-4 bg-[#0B0B0E] border border-dashed border-[#2A2A33] rounded-lg text-center space-y-2">
          <p className="text-xs text-[#A1A1AA]">
            All benefit chips have been removed. The landing hero will display without any cards.
          </p>
          <button
            type="button"
            onClick={onAddBenefit}
            className="px-3 py-1 bg-[#1B1B22] hover:bg-[#2A2A33] text-white text-xs rounded font-medium inline-flex items-center gap-1 cursor-pointer border-0"
          >
            <Plus className="w-3 h-3" />
            <span>Add a Benefit</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {benefits.map((b, idx) => (
            <div key={b.id} className="bg-[#0B0B0E] border border-[#2A2A33] p-3 rounded-lg space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#A1A1AA] font-semibold">#{idx + 1}</span>
                <button
                  type="button"
                  onClick={() => onRemoveBenefit(b.id)}
                  title="Remove this benefit"
                  className="text-[#A1A1AA] hover:text-[#F0607A] p-1 rounded transition-colors cursor-pointer border-0 bg-transparent inline-flex items-center gap-1 text-[11px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#A1A1AA] mb-0.5">Benefit Title</label>
                <input
                  type="text"
                  value={b.title}
                  onChange={(e) => onUpdateBenefit(b.id, 'title', e.target.value)}
                  className="w-full bg-[#131318] border border-[#2A2A33] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#2A2A33]"
                  placeholder="Feature name..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#A1A1AA] mb-0.5">Description</label>
                <textarea
                  rows={2}
                  value={b.description}
                  onChange={(e) => onUpdateBenefit(b.id, 'description', e.target.value)}
                  className="w-full bg-[#131318] border border-[#2A2A33] rounded p-2 text-xs text-white outline-none focus:border-[#2A2A33] leading-relaxed"
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