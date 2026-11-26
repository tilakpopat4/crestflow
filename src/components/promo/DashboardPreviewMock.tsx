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
      <div className="rounded-t-xl sm:rounded-t-2xl border-t border-x border-[#2A2A33] bg-[#0B0B0E] overflow-hidden shadow-2xl flex flex-col w-full flex-1 min-h-[460px] sm:min-h-[520px] lg:min-h-[560px]">
        <div className="flex flex-1 bg-[#0B0B0E] overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="hidden md:flex w-48 shrink-0 flex-col justify-between border-r border-[#2A2A33] bg-[#131318] p-3 text-xs">
            <div className="space-y-4">
              {/* Sidebar Header */}
              <div>
                <div className="flex items-center gap-1.5 px-1 py-0.5">
                  <Logo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-[#F7F7F8] tracking-tight text-xs">CrestFlow</span>
                  <span className="text-[9px] font-mono uppercase bg-[#1B1B22] border border-[#FFC145]/40 text-[#FFC145] px-1.5 py-0.5 rounded font-semibold ml-auto">
                    PRO
                  </span>
                  <ChevronLeft className="size-3.5 text-[#A1A1AA] ml-1" />
                </div>
                <p className="text-[10px] text-[#A1A1AA] px-1 mt-0.5">Freelancing Client Manager</p>
              </div>

              {/* Navigation Items - Normalized to CrestFlow Sidebar */}
              <div className="space-y-0.5 text-[#A1A1AA] font-medium text-[11px]">
                <div className="flex h-7 items-center gap-2 rounded-md bg-[#1B1B22] px-2 text-[#F7F7F8] font-medium">
                  <LayoutDashboard className="size-3.5 text-[#F7F7F8]" />
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
          <div className="flex-1 flex flex-col min-w-0 bg-[#0B0B0E]">
            {/* Global Header Bar - Simplified */}
            <div className="h-10 sm:h-11 border-b border-[#2A2A33] px-3 sm:px-4 flex items-center justify-between gap-3 text-xs bg-[#131318]">
              {/* Search Bar */}
              <div className="flex-1 max-w-xs sm:max-w-sm bg-[#1B1B22] border border-[#2A2A33] rounded-md px-2.5 py-1 flex items-center gap-2 text-[#A1A1AA] text-[11px]">
                <Search className="size-3 shrink-0 text-[#A1A1AA]" />
                <span className="truncate">Search clients, invoices...</span>
                <span className="ml-auto text-[10px] font-mono text-[#A1A1AA] bg-[#131318] px-1 rounded">⌘K</span>
              </div>

              {/* Header Right Tools: Clean Status */}
              <div className="flex items-center gap-2 text-[#A1A1AA] text-[11px] shrink-0">
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[#A1A1AA]">
                  <Calendar className="size-3 text-[#A1A1AA]" />
                  <span>280 days worked</span>
                </span>
                <span className="text-[10px] text-[#FFC145] font-mono bg-[#1B1B22] border border-[#FFC145]/30 px-1.5 py-0.5 rounded">
                  Pro: 22 days left
                </span>
              </div>
            </div>

            {/* Dashboard Content Canvas */}
            <div className="flex-1 p-3.5 sm:p-5 overflow-hidden flex flex-col justify-between space-y-3">
              {/* Page Title */}
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Dashboard</h2>
                <p className="text-[10px] sm:text-[11px] text-[#A1A1AA]">Financial overview & payment cycles</p>
              </div>

              {/* 4 Stat Cards - Clean & Focused */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <div className="bg-[#0B0B0E] border border-[#1B1B22] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] font-medium">
                    <span>TOTAL EARNED THIS MONTH</span>
                    <IndianRupee className="size-3 text-[#A1A1AA]" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">₹10,000</p>
                </div>

                <div className="bg-[#0B0B0E] border border-[#1B1B22] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] font-medium">
                    <span>TOTAL DUE</span>
                    <Clock className="size-3 text-[#A1A1AA]" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">₹0</p>
                </div>

                <div className="hidden sm:block bg-[#0B0B0E] border border-[#1B1B22] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] font-medium">
                    <span>OVERDUE AMOUNT</span>
                    <AlertCircle className="size-3 text-[#A1A1AA]" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">₹0</p>
                </div>

                <div className="hidden sm:block bg-[#0B0B0E] border border-[#1B1B22] rounded-lg p-2.5 sm:p-3">
                  <div className="flex items-center justify-between text-[10px] text-[#A1A1AA] font-medium">
                    <span>INVOICES ISSUED</span>
                    <TrendingUp className="size-3 text-[#A1A1AA]" />
                  </div>
                  <p className="mt-1 text-sm sm:text-base font-bold text-white tabular-nums tracking-tight">1</p>
                </div>
              </div>

              {/* Net Revenue Comparison Chart - Calm & Uncluttered */}
              <div className="flex-1 bg-[#0B0B0E] border border-[#1B1B22] rounded-lg p-3 sm:p-4 flex flex-col justify-between min-h-[140px]">
                {/* Chart Header */}
                <div className="flex items-start justify-between gap-2 pb-1">
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-semibold text-[#A1A1AA] uppercase tracking-wider block">
                      NET REVENUE BY MONTH, INR
                    </span>
                    <p className="text-xs sm:text-sm font-semibold text-white tracking-tight mt-0.5">
                      Collected ₹36,700 of ₹36,700 invoiced (100% matched)
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[10px] text-[#A1A1AA]">
                    <span className="flex items-center gap-1 text-white">
                      <span className="w-2.5 h-0.5 bg-[#131318] inline-block"></span> Net Revenue
                    </span>
                    <span className="flex items-center gap-1 text-[#A1A1AA]">
                      <span className="w-2.5 h-0.5 border-t border-dashed border-[#2A2A33] inline-block"></span> Invoiced
                    </span>
                  </div>
                </div>

                {/* SVG Graph */}
                <div className="relative w-full h-24 sm:h-32 my-1">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 600 100" preserveAspectRatio="none">
                    {/* Horizontal Grid lines */}
                    <line x1="40" y1="20" x2="590" y2="20" stroke="#1B1B22" strokeWidth="1" />
                    <line x1="40" y1="50" x2="590" y2="50" stroke="#1B1B22" strokeWidth="1" />
                    <line x1="40" y1="80" x2="590" y2="80" stroke="#1B1B22" strokeWidth="1" />

                    {/* Y Axis Labels */}
                    <text x="35" y="24" fill="#A1A1AA" fontSize="9" textAnchor="end">₹36k</text>
                    <text x="35" y="54" fill="#A1A1AA" fontSize="9" textAnchor="end">₹20k</text>
                    <text x="35" y="84" fill="#A1A1AA" fontSize="9" textAnchor="end">₹0k</text>

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
                    <rect x="535" y="6" width="32" height="14" rx="3" fill="#1B1B22" stroke="#2A2A33" strokeWidth="1" />
                    <text x="551" y="16" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">₹36k</text>
                  </svg>
                </div>

                {/* X Axis Month Labels */}
                <div className="flex justify-between pl-8 pr-3 text-[9px] text-[#A1A1AA] font-mono">
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
