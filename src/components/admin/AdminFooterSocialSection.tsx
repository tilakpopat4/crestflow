import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FooterSocialLink } from '../../lib/footerConfig';

interface AdminFooterSocialSectionProps {
  socialLinks: FooterSocialLink[];
  onAdd: () => void;
  onUpdate: (id: string, field: keyof FooterSocialLink, val: any) => void;
  onRemove: (id: string) => void;
}

/**
 * Editor section for footer social media hyperlinks.
 */
export const AdminFooterSocialSection: React.FC<AdminFooterSocialSectionProps> = ({
  socialLinks,
  onAdd,
  onUpdate,
  onRemove,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-2xs">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Social Media Hyperlinks</h3>
          <p className="text-xs text-slate-500 mt-0.5">Icon links for X, GitHub, LinkedIn, YouTube, Instagram, etc.</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg cursor-pointer border-0 inline-flex items-center gap-1 transition-colors duration-120"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Social Link</span>
        </button>
      </div>

      <div className="space-y-2">
        {socialLinks.map((social) => (
          <div
            key={social.id}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
          >
            <select
              value={social.platform}
              onChange={(e) => onUpdate(social.id, 'platform', e.target.value)}
              className="w-full sm:w-1/4 text-xs p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 cursor-pointer"
            >
              <option value="x">X / Twitter</option>
              <option value="github">GitHub</option>
              <option value="linkedin">LinkedIn</option>
              <option value="youtube">YouTube</option>
              <option value="instagram">Instagram</option>
              <option value="custom">Custom / Other</option>
            </select>
            <input
              type="text"
              placeholder="Accessible Label (e.g. CrestFlow on X)"
              value={social.name}
              onChange={(e) => onUpdate(social.id, 'name', e.target.value)}
              className="w-full sm:w-1/3 text-xs p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600"
            />
            <input
              type="text"
              placeholder="Profile URL"
              value={social.url}
              onChange={(e) => onUpdate(social.id, 'url', e.target.value)}
              className="w-full sm:w-1/3 text-xs p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-600 font-mono"
            />
            <button
              type="button"
              onClick={() => onRemove(social.id)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md cursor-pointer border-0 transition-colors ml-auto"
              title="Remove social link"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminFooterSocialSection;

