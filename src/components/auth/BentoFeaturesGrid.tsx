import React from 'react';
import { Layers, QrCode, MessageSquare, CheckCircle2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * BentoFeaturesGrid renders a compact 4-tile bento grid with static mini visuals
 * demonstrating CrestFlow core features.
 */
export const BentoFeaturesGrid: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 pt-2 select-none">
      {/* Tile 1: Deliverable Tracking (7 cols on desktop) */}
      <div className="lg:col-span-7 rounded-xl bg-[#212121] border border-[#333333] p-4 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-accent-indigo" />
            <h3 className="text-xs font-semibold text-white">Deliverable Tracking</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">v2.4 active</span>
        </div>

        {/* Mini Visual: List with status chips */}
        <div className="space-y-1.5 bg-[#1b1b1b] p-2.5 rounded-lg border border-[#2a2a2a]">
          <div className="flex items-center justify-between text-[11px] text-slate-200">
            <span className="font-medium truncate pr-2">Teaser Cut v1</span>
            <span className="text-[10px] font-medium text-slate-300 bg-[#262626] px-1.5 py-0.5 rounded border border-[#383838]">
              In Review
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-200">
            <span className="font-medium truncate pr-2">Brand Identity System</span>
            <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
              Paid
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-normal">
          Track deliverables, revision rounds, and milestone approvals in one view.
        </p>
      </div>

      {/* Tile 2: UPI QR Invoices (5 cols on desktop) */}
      <div className="lg:col-span-5 rounded-xl bg-[#212121] border border-[#333333] p-4 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-accent-indigo" />
            <h3 className="text-xs font-semibold text-white">UPI QR Invoices</h3>
          </div>
          <span className="text-[10px] font-semibold text-accent-indigo bg-[#282828] px-1.5 py-0.5 rounded border border-[#383838]">
            0% Fee
          </span>
        </div>

        {/* Mini Visual: QR Thumbnail */}
        <div className="flex items-center gap-2.5 bg-[#1b1b1b] p-2 rounded-lg border border-[#2a2a2a]">
          <div className="p-1 bg-white rounded shadow-xs shrink-0">
            <QRCodeSVG value="upi://pay?pa=demo@upi" size={32} level="L" />
          </div>
          <div className="text-[11px] leading-tight">
            <p className="font-semibold text-white">Instant UPI Settlement</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Direct to your bank</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-normal">
          Every invoice carries an embedded UPI QR for direct, instant bank payments.
        </p>
      </div>

      {/* Tile 3: Automated Reminders (5 cols on desktop) */}
      <div className="lg:col-span-5 rounded-xl bg-[#212121] border border-[#333333] p-4 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent-indigo" />
            <h3 className="text-xs font-semibold text-white">Auto Reminders</h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">6:00 AM</span>
        </div>

        {/* Mini Visual: WhatsApp Chat Bubble */}
        <div className="bg-[#1b1b1b] p-2.5 rounded-lg border border-[#2a2a2a]">
          <div className="bg-[#1e2a22] border border-[#2e4033] p-2 rounded-lg text-[11px] text-slate-200">
            <p className="line-clamp-2">"Hey Kunal, sharing INV-004 due today with direct UPI QR."</p>
            <span className="text-[9px] text-slate-400 block text-right mt-1">Delivered ✓✓</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-normal">
          1-click WhatsApp prompts and automated morning email delivery.
        </p>
      </div>

      {/* Tile 4: Client Portal (7 cols on desktop) */}
      <div className="lg:col-span-7 rounded-xl bg-[#212121] border border-[#333333] p-4 flex flex-col justify-between space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-indigo" />
            <h3 className="text-xs font-semibold text-white">Client Portal</h3>
          </div>
          <span className="text-[10px] text-slate-300 font-medium">No login needed</span>
        </div>

        {/* Mini Visual: Progress Bar & Approval Pill */}
        <div className="bg-[#1b1b1b] p-2.5 rounded-lg border border-[#2a2a2a] space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-300 font-medium">Project Progress</span>
            <span className="text-accent-indigo font-mono font-semibold">75%</span>
          </div>
          <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div className="w-3/4 h-full bg-accent-indigo rounded-full" />
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-normal">
          Dedicated portal where clients review media and approve deliverables in 1 click.
        </p>
      </div>
    </div>
  );
};
