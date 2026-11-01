import React from 'react';
import { User, QrCode, KeyRound, ShieldCheck } from 'lucide-react';

export type SettingsSectionId = 'profile' | 'invoicing' | 'ai' | 'billing';

interface ProfileNavSidebarProps {
  activeSection: SettingsSectionId;
  onSelectSection: (id: SettingsSectionId) => void;
  hasSubscription: boolean;
}

/**
 * Settings sidebar navigation inspired by modern workspace tools.
 * Responsive: Horizontal tab strip on mobile, sticky vertical sidebar on desktop.
 * Adheres strictly to GEMINI.md design standards: slate neutrals, steel blue accents.
 */
export const ProfileNavSidebar: React.FC<ProfileNavSidebarProps> = ({
  activeSection,
  onSelectSection,
  hasSubscription,
}) => {
  const accountLinks = [
    { id: 'profile' as const, label: 'Public Profile', icon: User },
    { id: 'invoicing' as const, label: 'Invoicing & Payouts', icon: QrCode },
  ];

  const systemLinks = [
    { id: 'ai' as const, label: 'AI & Automations', icon: KeyRound },
    ...(hasSubscription ? [{ id: 'billing' as const, label: 'Plan & Billing', icon: ShieldCheck }] : []),
  ];

  const renderLink = (item: { id: SettingsSectionId; label: string; icon: React.ElementType }) => {
    const Icon = item.icon;
    const isActive = activeSection === item.id;

    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => onSelectSection(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors duration-120 border-0 cursor-pointer text-left lg:h-8.5 lg:px-2.5 ${
            isActive
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-slate-200 dark:ring-slate-800'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Icon className="size-4 shrink-0" strokeWidth={1.75} />
          <span>{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Settings Navigation" className="min-w-0">
      <div className="flex flex-col gap-3 md:flex-row md:gap-4 lg:sticky lg:top-6 lg:flex-col lg:gap-6">
        <div className="min-w-0">
          <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Account
          </p>
          <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-1">
            {accountLinks.map(renderLink)}
          </ul>
        </div>

        <div className="min-w-0 md:border-l md:border-slate-200 md:pl-4 lg:border-l-0 lg:pl-0 dark:md:border-slate-800">
          <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Workspace
          </p>
          <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-1">
            {systemLinks.map(renderLink)}
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default ProfileNavSidebar;
