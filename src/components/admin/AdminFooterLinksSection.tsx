import React from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { FooterLink } from '../../lib/footerConfig';

interface AdminFooterLinksSectionProps {
  title: string;
  description: string;
  addButtonLabel: string;
  links: FooterLink[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof FooterLink, val: any) => void;
  onRemove: (id: string) => void;
}

/**
 * Reusable editor section for a list of footer hyperlinks (primary navigation or legal documents).
 */
export const AdminFooterLinksSection: React.FC<AdminFooterLinksSectionProps> = ({
  title,
  description,
  addButtonLabel,
  links,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg cursor-pointer border-0 inline-flex items-center gap-1 transition-colors duration-120"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{addButtonLabel}</span>
        </button>
      </div>

      <div className="space-y-2">
        {links.map((link) => (
          <div
            key={link.id}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
          >
            <input
              type="text"
              placeholder="Link Name"
              value={link.name}
              onChange={(e) => onUpdate(link.id, 'name', e.target.value)}
              className="w-full sm:w-1/3 text-xs p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
            />
            <input
              type="text"
              placeholder="Target URL (e.g. /pricing or https://...)"
              value={link.url}
              onChange={(e) => onUpdate(link.id, 'url', e.target.value)}
              className="w-full sm:w-1/2 text-xs p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 font-mono"
            />
            <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 shrink-0 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={Boolean(link.openInNewTab)}
                onChange={(e) => onUpdate(link.id, 'openInNewTab', e.target.checked)}
                className="rounded text-indigo-600 focus:ring-0"
              />
              <ExternalLink className="w-3 h-3" />
              <span>New Tab</span>
            </label>
            <button
              type="button"
              onClick={() => onRemove(link.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md cursor-pointer border-0 transition-colors ml-auto"
              title="Remove link"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminFooterLinksSection;

