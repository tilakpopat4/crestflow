import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { MessageSquare, ArrowUpRight, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

/**
 * HeroProductMock displays a realistic, static preview of an actual CrestFlow
 * invoice with a pending payment status, matching WhatsApp reminder trigger card,
 * and decorative non-resolving UPI QR graphic.
 */
export const HeroProductMock: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative w-full select-none pt-2 pb-6 sm:pb-8">
      {/* Main Invoice Card */}
      <motion.div
        whileHover={shouldReduceMotion ? undefined : { y: -4, transition: { duration: 0.2 } }}
        className="hero-border-beam rounded-2xl bg-[#212121] border border-[#333333] p-5 sm:p-6 shadow-2xl relative z-10 space-y-4 max-w-xl mx-auto"
      >
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4 pb-3.5 border-b border-[#2c2c2c]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-slate-300">INV-2026-11-004</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-[#282828] px-2 py-0.5 rounded border border-[#383838]">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Pending</span>
              </span>
            </div>
            <p className="text-sm font-semibold text-white">Northlight Studio</p>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">Due Today</span>
            <span className="text-base sm:text-lg font-bold text-white tracking-tight">₹47,200</span>
          </div>
        </div>

        {/* Invoice Line Items */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300 py-1 border-b border-[#2a2a2a]/60">
            <div>
              <p className="font-medium text-slate-100">Reel edit batch (x4)</p>
              <p className="text-[11px] text-slate-400">Color grading, captions &amp; motion graphics</p>
            </div>
            <span className="font-mono font-medium text-slate-200">₹16,000</span>
          </div>

          <div className="flex items-center justify-between text-slate-300 py-1 border-b border-[#2a2a2a]/60">
            <div>
              <p className="font-medium text-slate-100">YouTube documentary cut (x2)</p>
              <p className="text-[11px] text-slate-400">Multi-cam timeline edit &amp; sound mix</p>
            </div>
            <span className="font-mono font-medium text-slate-200">₹24,000</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>GST (18%)</span>
            <span className="font-mono">₹7,200</span>
          </div>
        </div>

        {/* UPI QR & Payment Target Details */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#1c1c1c] p-3 rounded-xl border border-[#2c2c2c]">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-white rounded-lg shadow-xs shrink-0" title="Demo Static QR">
              <QRCodeSVG
                value="upi://pay?pa=demo@upi&pn=CrestFlowDemo&am=47200"
                size={54}
                level="L"
              />
            </div>
            <div className="space-y-0.5 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                Instant UPI Settlement
              </span>
              <p className="font-mono text-xs text-slate-200 font-medium">demo@upi</p>
              <p className="text-[10px] text-slate-400">Scan via GPay, PhonePe, Paytm, BHIM</p>
            </div>
          </div>
          <div className="text-right shrink-0 w-full sm:w-auto">
            <span className="text-[11px] font-medium text-slate-300 inline-flex items-center gap-1">
              <span>Direct Bank Credit</span>
              <ArrowUpRight className="w-3 h-3 text-accent-indigo" />
            </span>
          </div>
        </div>
      </motion.div>

      {/* Floating Secondary Reminder Card */}
      <motion.div
        initial={shouldReduceMotion ? undefined : { opacity: 0, y: 12 }}
        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="mt-3 sm:mt-0 sm:absolute sm:-bottom-4 sm:-right-2 z-20 bg-[#282828] border border-[#3d3d3d] rounded-xl p-3.5 shadow-xl max-w-xs sm:w-72"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent-indigo animate-pulse" />
            <span className="text-xs font-semibold text-white">Payment Reminder</span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Due Today</span>
        </div>
        <p className="text-xs text-slate-300 leading-snug">
          ₹47,200 balance ready to collect from Northlight Studio.
        </p>
        <div className="mt-2.5">
          <div className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1f2937] border border-slate-700 hover:bg-[#2b3544] transition-colors cursor-default">
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Send WhatsApp reminder</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
