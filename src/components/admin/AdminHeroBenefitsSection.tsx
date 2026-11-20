import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { HeroBenefit } from '../../lib/heroConfig';

interface AdminHeroBenefitsSectionProps {
  benefits: HeroBenefit[];
  onAddBenefit: () => void;
  onUpdateBenefit: (id: string, field: 'title' | 'description', value: string) => void;
  onRemoveBenefit: (id: string) => void;
}

/**
 * Sub-component for managing the key feature & benefit chips on the landing hero.
 */
export const AdminHeroBenefitsSection: React.FC<AdminHeroBenefitsSectionProps> = ({
  benefits,
  onAddBenefit,
  onUpdateBenefit,
  onRemoveBenefit,
}) => {
  return (
    <div className="bg-[#212121] border border-[#333333] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Feature &amp; Benefit Chips</h3>
          <p className="text-xs text-slate-400 mt-0.5">Add, edit, or remove the key benefit cards shown on the hero.</p>
        </div>
        <button
          type="button"
          onClick={onAddBenefit}
          className="px-3 py-1.5 bg-[#282828] hover:bg-[#333333] text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer border-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Benefit</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {benefits.map((b, idx) => (
          <div key={b.id} className="bg-[#181818] border border-[#383838] p-3 rounded-lg space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-500 font-semibold">#{idx + 1}</span>
              <button
                type="button"
                onClick={() => onRemoveBenefit(b.id)}
                title="Remove this benefit"
                className="text-slate-500 hover:text-red-400 p-1 rounded transition-colors cursor-pointer border-0 bg-transparent"
              >
                <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};

export default AdminHeroBenefitsSection;
