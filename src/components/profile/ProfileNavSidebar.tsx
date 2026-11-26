import React from 'react';
import { User, QrCode, KeyRound, ShieldCheck, Trash2, LayoutTemplate } from 'lucide-react';
import { useAiSummarizerConfig } from '../../lib/aiConfig';

export type SettingsSectionId = 'profile' | 'invoicing' | 'ai' | 'billing' | 'danger' | 'landing';

interface ProfileNavSidebarProps {
  activeSection: SettingsSectionId;
  onSelectSection: (id: SettingsSectionId) => void;
  hasSubscription: boolean;
  isAdmin?: boolean;
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
  isAdmin,
}) => {
  const { isEnabled: isAiEnabled } = useAiSummarizerConfig();

  const accountLinks = [
    { id: 'profile' as const, label: 'Public Profile', icon: User },
    { id: 'invoicing' as const, label: 'Invoicing & Payouts', icon: QrCode },
    { id: 'danger' as const, label: 'Delete Account', icon: Trash2 },
  ];

  const systemLinks = [
    ...(isAiEnabled ? [{ id: 'ai' as const, label: 'AI & Automations', icon: KeyRound }] : []),
    ...(hasSubscription ? [{ id: 'billing' as const, label: 'Plan & Billing', icon: ShieldCheck }] : []),
  ];

  const adminLinks = [
    ...(isAdmin ? [{ id: 'landing' as const, label: 'Landing Page', icon: LayoutTemplate }] : []),
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
          className={`flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors duration-120 cursor-pointer text-left lg:h-8.5 lg:px-2.5 border-0 ${
            isActive
              ? 'bg-[#1B1B22] text-white font-semibold'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#1B1B22]'
          }`}
        >
          <Icon className={`size-4 shrink-0 ${isActive ? 'text-white' : 'text-[#A1A1AA]'}`} strokeWidth={1.75} />
          <span>{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <nav aria-label="Settings Navigation" className="min-w-0">
      <div className="flex flex-col gap-3 md:flex-row md:gap-4 lg:sticky lg:top-6 lg:flex-col lg:gap-6">
        <div className="min-w-0">
          <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#A1A1AA]">
            Account
          </p>
          <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-1">
            {accountLinks.map(renderLink)}
          </ul>
        </div>

        {systemLinks.length > 0 && (
          <div className="min-w-0 md:border-l md:border-[#2A2A33] md:pl-4 lg:border-l-0 lg:pl-0 dark:md:border-[#2A2A33]">
            <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#A1A1AA]">
              Workspace
            </p>
            <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-1">
              {systemLinks.map(renderLink)}
            </ul>
          </div>
        )}

        {adminLinks.length > 0 && (
          <div className="min-w-0 md:border-l md:border-[#2A2A33] md:pl-4 lg:border-l-0 lg:pl-0 dark:md:border-[#2A2A33]">
            <p className="px-2.5 pb-1.5 text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] dark:text-[#A1A1AA]">
              Admin
            </p>
            <ul className="flex flex-wrap gap-1 lg:flex-col lg:gap-1">
              {adminLinks.map(renderLink)}
            </ul>
          </div>
        )}
      </div>
    </nav>
  );
};

export default ProfileNavSidebar;
