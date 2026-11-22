import React from 'react';
import {
  IndianRupee,
  Clock,
  TrendingUp,
  AlertCircle,
  DownloadCloud,
  UploadCloud,
  Search,
  Bell,
  ChevronLeft,
  Users,
  ClipboardList,
  FileText,
  MessageSquare,
  UserPlus,
  Calendar,
  LayoutDashboard,
} from 'lucide-react';
import Logo from '../Logo';

/**
 * Normalized High-fidelity visual preview of the CrestFlow application dashboard.
 * Designed to touch flush towards the bottom of the promo page.
 * Follows GEMINI.md design tokens: flat graphite/slate palette, restrained typography.
 */
export const DashboardPreviewMock: React.FC = () => {
  return (
    <div className="relative mx-auto mt-6 sm:mt-10 w-full max-w-6xl xl:max-w-7xl text-left select-none flex-1 flex flex-col justify-end">
      {/* Outer framing shell - rounded top, flush bottom */}
      <div className="rounded-t-xl sm:rounded-t-2xl border-t border-x border-[#2b2b2b] bg-[#121212] overflow-hidden shadow-2xl flex flex-col w-full flex-1 min-h-[460px] sm:min-h-[520px] lg:min-h-[560px]">
        <div className="flex flex-1 bg-[#141414] overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="hidden md:flex w-48 shrink-0 flex-col justify-between border-r border-[#242424] bg-[#161616] p-3 text-xs">
            <div className="space-y-4">
              {/* Sidebar Header */}
              <div>
                <div className="flex items-center gap-1.5 px-1 py-0.5">
                  <Logo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-white tracking-tight text-xs">CrestFlow</span>
                  <span className="text-[9px] font-mono uppercase bg-[#282828] text-slate-300 px-1.5 py-0.5 rounded font-semibold ml-auto">
                    PRO
                  </span>
                  <ChevronLeft className="size-3.5 text-slate-500 ml-1" />
                </div>
                <p className="text-[10px] text-slate-500 px-1 mt-0.5">Freelancing Client Manager</p>
              </div>

              {/* Navigation Items - Normalized to CrestFlow Sidebar */}
              <div className="space-y-0.5 text-slate-400 font-medium text-[11px]">
                <div className="flex h-7 items-center gap-2 rounded-md bg-[#222222] px-2 text-white font-medium">
                  <LayoutDashboard className="size-3.5 text-white" />
                  <span>Dashboard</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <Users className="size-3.5" />
                  <span>Clients</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <ClipboardList className="size-3.5" />
                  <span>Work Log</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <FileText className="size-3.5" />
                  <span>Invoices</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <MessageSquare className="size-3.5" />
                  <span>Reviews</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <UserPlus className="size-3.5" />
                  <span>Onboarding</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main App Workspace */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#121212]">
            {/* Global Header Bar */}
            <div className="h-10 sm:h-11 border-b border-[#242424] px-3 sm:px-4 flex items-center justify-between gap-3 text-xs bg-[#161616]">
              {/* Search Bar */}
              <div className="flex-1 max-w-sm sm:max-w-md bg-[#1d1d1d] border border-[#2b2b2b] rounded-md px-2.5 py-1 flex items-center gap-2 text-slate-400 text-[11px]">
                <Search className="size-3 shrink-0 text-slate-500" />
                <span className="truncate">Search clients, work items, video links, invoices...</span>
                <span className="ml-auto text-[10px] font-mono text-slate-500 bg-[#262626] px-1 rounded">⌘K</span>
              </div>

              {/* Header Right Tools: Normalized to GlobalHeader */}
              <div className="flex items-center gap-2 sm:gap-2.5 text-slate-400 text-[11px] shrink-0">
                <Bell className="size-3.5 text-slate-400 hover:text-white" />
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Calendar className="size-3.5 text-slate-400" />
                  <span>280 days worked</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono bg-[#222222] px-1.5 py-0.5 rounded border border-[#2e2e2e]">
                  Pro • 999d
                </span>
              </div>
            </div>

            {/* Dashboard Content Canvas */}
            <div className="flex-1 p-3.5 sm:p-5 overflow-hidden flex flex-col justify-between space-y-3">
              {/* Page Title & Action Controls */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Dashboard</h2>
                  <p className="text-[10px] sm:text-[11px] text-slate-400">Financial overview & payment cycles.</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" className="px-2.5 py-1 text-[11px] bg-[#222222] hover:bg-[#2a2a2a] text-slate-300 rounded inline-flex items-center gap-1 border-none cursor-pointer">
                    <DownloadCloud className="size-3" /> Export
                  </button>
                  <button type="button" className="px-2.5 py-1 text-[11px] bg-[#222222] hover:bg-[#2a2a2a] text-slate-300 rounded inline-flex items-center gap-1 border-none cursor-pointer">
                    <UploadCloud className="size-3" /> Import
                  </button>
                </div>
              </div>

              {/* 4 Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <div className="bg-[#181818] border border-[#262626] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>TOTAL EARNED THIS MONTH</span>
                    <IndianRupee className="size-3 text-slate-500" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">₹10,000</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">1 invoice this month</p>
                </div>

                <div className="bg-[#181818] border border-[#262626] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>TOTAL DUE</span>
                    <Clock className="size-3 text-slate-500" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">₹0</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Across active clients</p>
                </div>

                <div className="hidden sm:block bg-[#181818] border border-[#262626] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>OVERDUE AMOUNT</span>
                    <AlertCircle className="size-3 text-slate-500" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">₹0</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">All invoices current</p>
                </div>

                <div className="hidden sm:block bg-[#181818] border border-[#262626] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                    <span>INVOICES ISSUED</span>
                    <TrendingUp className="size-3 text-slate-500" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">1</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Issued this month</p>
                </div>
              </div>

              {/* Net Revenue Comparison Chart */}
              <div className="flex-1 bg-[#181818] border border-[#262626] rounded-lg p-3 sm:p-4 flex flex-col justify-between min-h-[140px]">
                {/* Chart Header */}
                <div className="flex items-start justify-between gap-2 pb-1">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      NET REVENUE BY MONTH, INR
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white tracking-tight mt-0.5">
                      Collected ₹36,700 of ₹36,700 invoiced (100% matched)
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-slate-400">
                      ₹36,700 across the last 10 months (since Feb 2026) against ₹36,700 in invoiced.
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1 text-white">
                      <span className="w-2.5 h-0.5 bg-white inline-block"></span> Last 10 months
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2.5 h-0.5 border-t border-dashed border-slate-400 inline-block"></span> Total Invoiced
                    </span>
                  </div>
                </div>

                {/* SVG Graph */}
                <div className="relative w-full h-24 sm:h-32 my-1">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 100" preserveAspectRatio="none">
                    {/* Horizontal Grid lines */}
                    <line x1="40" y1="20" x2="590" y2="20" stroke="#262626" strokeWidth="1" />
                    <line x1="40" y1="50" x2="590" y2="50" stroke="#262626" strokeWidth="1" />
                    <line x1="40" y1="80" x2="590" y2="80" stroke="#262626" strokeWidth="1" />

                    {/* Y Axis Labels */}
                    <text x="35" y="24" fill="#666666" fontSize="9" textAnchor="end">₹36k</text>
                    <text x="35" y="54" fill="#666666" fontSize="9" textAnchor="end">₹20k</text>
                    <text x="35" y="84" fill="#666666" fontSize="9" textAnchor="end">₹0k</text>

                    {/* Dashed Total Invoiced Line */}
                    <path
                      d="M 60 80 L 115 80 L 170 80 L 225 80 L 280 80 L 335 78 L 390 55 L 445 68 L 500 80 L 560 20"
                      fill="none"
                      stroke="#555555"
                      strokeWidth="1.5"
                      strokeDasharray="3 3"
                    />

                    {/* Solid Net Revenue Line */}
                    <path
                      d="M 60 80 L 115 80 L 170 80 L 225 80 L 280 80 L 335 80 L 390 80 L 445 80 L 500 80 L 560 20"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Peak Point on Nov */}
                    <circle cx="560" cy="20" r="3.5" fill="#ffffff" />
                    <rect x="535" y="6" width="32" height="14" rx="3" fill="#242424" stroke="#383838" strokeWidth="1" />
                    <text x="551" y="16" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">₹36k</text>
                  </svg>
                </div>

                {/* X Axis Month Labels */}
                <div className="flex justify-between pl-8 pr-3 text-[9px] text-slate-500 font-mono">
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                  <span className="text-white font-bold">Nov</span>
                </div>

                {/* Chart Footer Sub-bar */}
                <div className="flex items-center justify-between pt-1 border-t border-[#222222] text-[9px] text-slate-500">
                  <span>CrestFlow • Paid invoices, net of refunds • Updated 21 Nov 2026</span>
                  <span className="text-slate-400 hover:text-white cursor-pointer">View as table</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Black fade overlay covering the portal preview from bottom */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-48 sm:h-64 md:h-80 bg-gradient-to-t from-black via-black/80 to-transparent z-20"
        aria-hidden="true"
      />
    </div>
  );
};

export default DashboardPreviewMock;
