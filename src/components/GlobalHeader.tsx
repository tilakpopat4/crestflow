import React from 'react';
import { Search, X, LogOut, PanelLeft } from 'lucide-react';
import { User } from 'firebase/auth';
import { useFirestore } from '../hooks/useFirestore';
import { Client, WorkItem, Invoice, UserProfile } from '../types';
import { Tab } from '../App';
import Logo from './Logo';
import { calculateWorkJourney } from '../lib/anniversary';
import { SubscriptionState } from '../hooks/useSubscription';
import { useAccess } from '../hooks/useAccess';
import { SAMPLE_CLIENTS, SAMPLE_INVOICES, SAMPLE_WORK_ITEMS } from '../data/sampleWorkspaceData';
import { useGlobalHeaderSearch } from '../hooks/useGlobalHeaderSearch';
import NotificationBellPopover from './notifications/NotificationBellPopover';
import GlobalSearchDropdown from './header/GlobalSearchDropdown';
import JourneyStatusPopover from './header/JourneyStatusPopover';
import AccessStatusBadgeButton from './header/AccessStatusBadgeButton';

interface GlobalHeaderProps {
  user: User | null;
  activeTab: Tab;
  setActiveTab: (tab: Tab, query?: string) => void;
  onSearchSelect?: (type: 'client' | 'work' | 'invoice', id: string, query?: string) => void;
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  profile?: UserProfile | null;
  onEditProfile?: () => void;
  onOpenAnniversaryModal?: () => void;
  onLogout?: () => void;
  subscriptionState?: SubscriptionState;
  onOpenSubscriptionModal?: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export default function GlobalHeader({
  user,
  setActiveTab,
  onSearchSelect,
  globalQuery,
  setGlobalQuery,
  profile,
  onEditProfile,
  onOpenAnniversaryModal,
  onLogout,
  onOpenSubscriptionModal,
  isSidebarCollapsed = false,
  onToggleSidebar,
}: GlobalHeaderProps) {
  const journey = calculateWorkJourney(profile?.freelanceStartDate);
  const access = useAccess();
  const isExploring = access.state === 'none';
  const liveUid = !isExploring ? user?.uid : undefined;

  const { data: fsClients } = useFirestore<Client>('clients', liveUid);
  const { data: fsWorkItems } = useFirestore<WorkItem>('workItems', liveUid);
  const { data: fsInvoices } = useFirestore<Invoice>('invoices', liveUid);

  const clients = isExploring ? SAMPLE_CLIENTS : fsClients;
  const workItems = isExploring ? SAMPLE_WORK_ITEMS : fsWorkItems;
  const invoices = isExploring ? SAMPLE_INVOICES : fsInvoices;

  const search = useGlobalHeaderSearch({
    clients,
    workItems,
    invoices,
    globalQuery,
    setActiveTab,
    onSearchSelect,
  });

  return (
    <header className="sticky top-0 z-30 bg-[#131318] border-b border-[#2A2A33] px-3 py-2.5 md:px-8 md:py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:hidden shrink-0">
          <Logo className="w-7 h-7" />
          <span className="font-bold text-[#F7F7F8] tracking-tight text-sm">
            {access.state === 'active' || access.state === 'grace' ? (
              <span className="inline-flex items-center gap-1.5">
                <span>CrestFlow</span>
                <span className="px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase rounded bg-[#1B1B22] border border-[#FFC145]/40 text-[#FFC145] shrink-0">
                  PRO
                </span>
              </span>
            ) : (
              'CrestFlow'
            )}
          </span>
        </div>

        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden md:flex items-center justify-center p-2 rounded-lg text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] transition-colors cursor-pointer border-0 bg-transparent"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            <PanelLeft size={18} />
          </button>
        )}

        <div ref={search.searchRef} className="relative w-full md:w-auto md:flex-1 md:max-w-2xl mx-auto md:mx-0 order-last md:order-none min-w-0">
          <div className="relative flex items-center">
            <Search size={16} className="absolute left-3 text-[#A1A1AA] pointer-events-none shrink-0" />
            <input
              ref={search.inputRef}
              type="text"
              value={globalQuery}
              onChange={(e) => {
                setGlobalQuery(e.target.value);
                search.setIsOpen(true);
              }}
              onFocus={() => search.setIsOpen(true)}
              placeholder="Search clients, work items, video links, invoices..."
              className="w-full bg-[#1B1B22] focus:bg-[#131318] text-[#F7F7F8] text-xs md:text-sm pl-9 pr-10 md:pr-20 py-2 md:py-2.5 rounded-xl border border-[#2A2A33] focus:border-[#F7F7F8]/40 outline-none transition-colors placeholder:text-[#A1A1AA]"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {globalQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalQuery('');
                    search.setIsOpen(false);
                  }}
                  className="p-1 hover:bg-[#2A2A33] rounded-full text-[#A1A1AA] hover:text-[#F7F7F8] transition-colors cursor-pointer"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-semibold text-[#A1A1AA] bg-[#131318] border border-[#2A2A33] rounded-md pointer-events-none">
                  ⌘K
                </kbd>
              )}
            </div>
          </div>

          {search.isOpen && search.cleanQuery.length > 0 && (
            <GlobalSearchDropdown
              activeCategory={search.activeCategory}
              setActiveCategory={search.setActiveCategory}
              clients={clients}
              filteredClients={search.filteredClients}
              filteredWork={search.filteredWork}
              filteredInvoices={search.filteredInvoices}
              invoices={invoices}
              onSelectClient={search.handleSelectClient}
              onSelectWork={search.handleSelectWork}
              onSelectInvoice={search.handleSelectInvoice}
            />
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 shrink-0 ml-auto md:ml-0">
          <NotificationBellPopover
            user={user}
            clients={clients}
            invoices={invoices}
            workItems={workItems}
            onNavigateToClients={() => setActiveTab('clients')}
          />

          <JourneyStatusPopover
            journey={journey}
            isOpen={search.showJourneyMenu}
            onToggle={() => search.setShowJourneyMenu((v) => !v)}
            onClose={() => search.setShowJourneyMenu(false)}
            onEditProfile={onEditProfile}
            onOpenAnniversaryModal={onOpenAnniversaryModal}
            menuRef={search.journeyMenuRef}
          />

          <AccessStatusBadgeButton onOpenSubscriptionModal={onOpenSubscriptionModal} />

          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {onEditProfile && (
              <button
                type="button"
                onClick={onEditProfile}
                className="p-1 rounded-full hover:bg-[#1B1B22] transition-colors cursor-pointer border-0 bg-transparent"
                title="Open Profile Settings"
                aria-label="Open Profile Settings"
              >
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-7 h-7 rounded-full object-cover border border-[#2A2A33]"
                    referrerPolicy="no-referrer"
                    decoding="async"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#1B1B22] border border-[#2A2A33] text-[#F7F7F8] flex items-center justify-center text-xs font-semibold">
                    {(profile?.name || user?.displayName)?.charAt(0) || 'U'}
                  </div>
                )}
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F7F7F8] hover:bg-[#1B1B22] transition-colors cursor-pointer border-0 bg-transparent"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
