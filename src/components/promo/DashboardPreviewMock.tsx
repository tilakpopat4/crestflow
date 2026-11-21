import React from 'react';
import { IndianRupee, Clock, TrendingUp, CheckCircle, FileText, Users, Briefcase } from 'lucide-react';

/**
 * Realistic mock preview of the CrestFlow workspace dashboard for unauthenticated promo visitors.
 * Follows GEMINI.md design tokens: studio dark canvas (#0f0f0f / #181818), plain text status dots,
 * and clean typography.
 */
export const DashboardPreviewMock: React.FC = () => {
  return (
    <div className="relative mx-auto mt-12 sm:mt-16 max-w-5xl text-left select-none">
      {/* Outer framing container */}
      <div className="rounded-2xl sm:rounded-3xl bg-[#1e1e1e] p-2 sm:p-3 shadow-2xl ring-1 ring-white/10 dark:ring-neutral-800">
        <div className="flex h-80 sm:h-[420px] rounded-xl sm:rounded-2xl bg-[#141414] overflow-hidden border border-[#2a2a2a]">
          {/* Mock Left Mini-Sidebar */}
          <div className="hidden sm:flex w-44 shrink-0 flex-col justify-between border-r border-[#2a2a2a] bg-[#181818] p-3 text-xs">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-1 py-1">
                <span className="flex size-6 items-center justify-center rounded-md bg-[#e1002d] text-white font-bold text-xs">
                  C
                </span>
                <span className="font-semibold text-white tracking-tight">CrestFlow</span>
                <span className="ml-auto text-[9px] font-mono uppercase bg-[#282828] text-slate-300 px-1 py-0.5 rounded">
                  Pro
                </span>
              </div>

              <div className="space-y-1 text-slate-400 font-medium">
                <div className="flex h-7 items-center gap-2 rounded-md bg-[#242424] px-2 text-white">
                  <TrendingUp className="size-3.5 shrink-0 text-white" />
                  <span>Dashboard</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <Users className="size-3.5 shrink-0" />
                  <span>Clients</span>
                  <span className="ml-auto text-[10px] tabular-nums text-slate-500">6</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <Briefcase className="size-3.5 shrink-0" />
                  <span>Work Log</span>
                  <span className="ml-auto text-[10px] tabular-nums text-slate-500">14</span>
                </div>
                <div className="flex h-7 items-center gap-2 px-2 hover:text-white transition-colors">
                  <FileText className="size-3.5 shrink-0" />
                  <span>Invoices</span>
                  <span className="ml-auto text-[10px] tabular-nums text-slate-500">8</span>
                </div>
              </div>
            </div>

            {/* Profile footer snippet */}
            <div className="pt-2 border-t border-[#2a2a2a] flex items-center gap-2">
              <div className="size-6 rounded-full bg-[#333333] flex items-center justify-center text-[10px] text-white font-semibold">
                TP
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-white truncate">Tilak Studio</p>
                <p className="text-[9px] text-slate-500 truncate">tilak@crestflow.space</p>
              </div>
            </div>
          </div>

          {/* Main Dashboard Canvas Preview */}
          <div className="flex-1 flex flex-col p-4 sm:p-5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#2a2a2a]">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-white">Financial Dashboard</h3>
                <p className="text-[11px] text-slate-400">Monthly revenue pulse & active client deliverables</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 bg-[#222222] px-2.5 py-1 rounded-md border border-[#333333]">
                <span className="size-1.5 rounded-full bg-emerald-400"></span>
                <span>November 2026</span>
              </span>
            </div>

            {/* Top Stat Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 my-3">
              <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-2.5 sm:p-3">
                <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <IndianRupee className="size-3 text-slate-400" /> Total Earned
                </span>
                <p className="mt-1 text-sm sm:text-lg font-bold text-white tabular-nums tracking-tight">₹1,48,500</p>
                <span className="text-[10px] text-slate-500">8 invoices this month</span>
              </div>

              <div className="bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-2.5 sm:p-3">
                <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <Clock className="size-3 text-slate-400" /> Total Due
                </span>
                <p className="mt-1 text-sm sm:text-lg font-bold text-white tabular-nums tracking-tight">₹32,000</p>
                <span className="text-[10px] text-slate-500">2 pending clients</span>
              </div>

              <div className="hidden sm:block bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-2.5 sm:p-3">
                <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <CheckCircle className="size-3 text-slate-400" /> Overdue
                </span>
                <p className="mt-1 text-sm sm:text-lg font-bold text-white tabular-nums tracking-tight">₹0</p>
                <span className="text-[10px] text-slate-500">All invoices on time</span>
              </div>

              <div className="hidden sm:block bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-2.5 sm:p-3">
                <span className="text-[10px] sm:text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                  <TrendingUp className="size-3 text-slate-400" /> Invoices Issued
                </span>
                <p className="mt-1 text-sm sm:text-lg font-bold text-white tabular-nums tracking-tight">8</p>
                <span className="text-[10px] text-slate-500">Direct UPI & Bank</span>
              </div>
            </div>

            {/* Invoices & Work Delivery Table Preview */}
            <div className="flex-1 min-h-0 bg-[#181818] border border-[#282828] rounded-lg p-2.5 sm:p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-[#252525]">
                <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Recent Deliverables & Invoices
                </span>
                <span className="text-[10px] text-slate-500">Automated 6:00 AM WhatsApp Invoicing</span>
              </div>

              <div className="divide-y divide-[#252525] text-xs">
                {/* Row 1 */}
                <div className="flex items-center justify-between py-2 gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">Acme Media Corp</p>
                    <p className="text-[10px] text-slate-400 truncate">4K Commercial Edit & VFX Finishing</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-medium tabular-nums">₹45,000</p>
                    <span className="text-[11px] text-indigo-400 font-medium inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-indigo-500"></span>Paid
                    </span>
                  </div>
                </div>

                {/* Row 2 */}
                <div className="flex items-center justify-between py-2 gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">Zenflow Design Studio</p>
                    <p className="text-[10px] text-slate-400 truncate">Mobile App Design System & Tokens</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-medium tabular-nums">₹32,000</p>
                    <span className="text-[11px] text-slate-300 font-medium inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-slate-400"></span>Invoiced
                    </span>
                  </div>
                </div>

                {/* Row 3 */}
                <div className="flex items-center justify-between py-2 gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">Apex Digital Agency</p>
                    <p className="text-[10px] text-slate-400 truncate">Monthly Retainer • 12 Video Deliverables</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-white font-medium tabular-nums">₹60,000</p>
                    <span className="text-[11px] text-indigo-400 font-medium inline-flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-indigo-500"></span>Paid
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPreviewMock;
