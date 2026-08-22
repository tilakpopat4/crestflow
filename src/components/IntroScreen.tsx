import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Scissors, Sparkles, Sliders } from 'lucide-react';

interface IntroScreenProps {
  onComplete: () => void;
}

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  const [percent, setPercent] = useState(0);
  const [clapped, setClapped] = useState(false);
  const [playheadActive, setPlayheadActive] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 4800; // 4.8 seconds total for main animation

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(Math.round((elapsed / duration) * 100), 100);
      setPercent(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 400);
      }
    }, 30);

    const clapTimeout = setTimeout(() => {
      setClapped(true);
    }, 500);

    const playheadTimeout = setTimeout(() => {
      setPlayheadActive(true);
    }, 800);

    return () => {
      clearInterval(interval);
      clearTimeout(clapTimeout);
      clearTimeout(playheadTimeout);
    };
  }, [onComplete]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const skipIntro = () => {
    onComplete();
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="fixed inset-0 bg-slate-50 flex flex-col justify-between p-6 md:p-12 z-[100] text-slate-800 select-none overflow-hidden font-sans"
    >
      {/* Decorative background grids and blobs */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none opacity-60 z-0"></div>
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-200/25 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-200/25 rounded-full blur-[120px] pointer-events-none z-0"></div>

      {/* Safe zone guides (Video Editor Overlay) */}
      <div className="absolute inset-8 border border-slate-200/80 pointer-events-none z-10 flex flex-col justify-between p-2">
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>REC [AUTO]</span>
          <span>TC 00:00:0{Math.floor(percent / 20)}:24</span>
        </div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400">
          <span>1080p 60fps</span>
          <span>SAFE AREA 90%</span>
        </div>
        {/* Safe zone corner hooks */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-slate-300"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-slate-300"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-slate-300"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-slate-300"></div>
      </div>

      {/* Header with Skip button */}
      <div className="flex justify-between items-center z-20">
        <div className="flex items-center gap-2 text-xs font-mono text-indigo-600 tracking-widest uppercase">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Rendering Engine v3.5
        </div>
        <button
          onClick={skipIntro}
          className="px-4 py-1.5 bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-semibold tracking-wider uppercase transition-all duration-200 shadow-xs"
        >
          Skip Intro
        </button>
      </div>

      {/* Interactive Crosshair & Colour Ring Following Mouse */}
      <div
        className="hidden md:block absolute w-24 h-24 pointer-events-none z-30 transition-all duration-200 ease-out -translate-x-12 -translate-y-12"
        style={{ left: mousePos.x, top: mousePos.y }}
      >
        <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-spin-slow"></div>
        <div className="absolute inset-2 rounded-full border border-dashed border-purple-500/20"></div>
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-indigo-500/10"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-indigo-500/10"></div>
        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-mono text-indigo-500">
          X: {Math.round(mousePos.x)} Y: {Math.round(mousePos.y)}
        </span>
      </div>

      {/* Main Animation Workspace */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 z-20 relative">
        {/* SVG Clapperboard Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative cursor-pointer"
          onClick={() => setClapped(!clapped)}
        >
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="filter drop-shadow-md">
            {/* Hinge Joint */}
            <circle cx="20" cy="55" r="4" fill="#6366f1" />

            {/* Clapperboard Top Bar */}
            <motion.g
              initial={{ rotate: -28 }}
              animate={{ rotate: clapped ? 0 : -28 }}
              transition={{ type: 'spring', stiffness: 350, damping: 15 }}
              style={{ originX: '20px', originY: '55px' }}
            >
              <rect x="15" y="38" width="90" height="12" rx="3" fill="#1e293b" stroke="#e2e8f0" strokeWidth="2.5" />
              <path d="M30 38 L42 50 M50 38 L62 50 M70 38 L82 50 M90 38 L102 50" stroke="#f1f5f9" strokeWidth="3" />
            </motion.g>

            {/* Clapperboard Base */}
            <g>
              <rect x="15" y="55" width="90" height="35" rx="4" fill="#334155" stroke="#e2e8f0" strokeWidth="2.5" />
              <path d="M15 55 L25 65 M35 55 L45 65 M55 55 L65 65 M75 55 L85 65" stroke="#f1f5f9" strokeWidth="3" />
              <text x="32" y="77" fill="#c7d2fe" fontSize="6" fontWeight="bold" fontFamily="monospace">SCENE</text>
              <text x="36" y="86" fill="#f1f5f9" fontSize="8" fontWeight="bold" fontFamily="monospace">01</text>
              <text x="62" y="77" fill="#c7d2fe" fontSize="6" fontWeight="bold" fontFamily="monospace">TAKE</text>
              <text x="65" y="86" fill="#f1f5f9" fontSize="8" fontWeight="bold" fontFamily="monospace">35</text>
            </g>
          </svg>

          {/* Action Ripple Wave */}
          <AnimatePresence>
            {clapped && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="absolute inset-0 rounded-full border-2 border-indigo-500/40 pointer-events-none"
              ></motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Cinematic Title Reveal */}
        <div className="flex flex-col items-center text-center">
          <div className="flex overflow-hidden">
            {"CRESTFLOW".split("").map((letter, index) => (
              <motion.span
                key={index}
                initial={{ y: 80, filter: 'blur(10px)', opacity: 0 }}
                animate={
                  playheadActive 
                    ? { y: 0, filter: 'blur(0px)', opacity: 1 }
                    : { y: 80, filter: 'blur(10px)', opacity: 0 }
                }
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  type: 'spring',
                  stiffness: 120,
                  damping: 14
                }}
                className="font-display font-extrabold text-5xl md:text-7xl tracking-wider bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-600 bg-clip-text text-transparent"
              >
                {letter}
              </motion.span>
            ))}
          </div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={playheadActive ? { opacity: 1, y: 0 } : { opacity: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="text-xs md:text-sm font-semibold uppercase tracking-widest text-slate-400 mt-2 font-display flex items-center gap-1.5"
          >
            Creative Workspace
            <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            Client Directory
          </motion.p>
        </div>
      </div>

      {/* Bottom Timeline & Export Progress Controls */}
      <div className="w-full max-w-4xl mx-auto space-y-6 z-20">
        {/* 1. Interactive Video Editor Timeline Tracks */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3 shadow-xs relative overflow-hidden">
          
          {/* Moving Playhead Line */}
          {playheadActive && (
            <motion.div
              initial={{ left: '0%' }}
              animate={{ left: '100%' }}
              transition={{ duration: 3.8, ease: 'linear' }}
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-30 shadow-[0_0_8px_#ef4444]"
            >
              {/* Playhead Handle */}
              <div className="absolute -top-1.5 -left-2 w-4.5 h-3 bg-red-500 rounded-sm clip-playhead"></div>
            </motion.div>
          )}

          {/* Track 1: Video Track */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 w-6 flex-shrink-0 flex items-center gap-1">
              <Film className="w-3 h-3 text-slate-400" />
              V1
            </span>
            <div className="flex-1 bg-slate-50 rounded-md h-8 relative overflow-hidden border border-slate-100 flex items-center p-1 gap-2">
              <div className="w-1/3 bg-indigo-50 border border-indigo-100 rounded h-full flex items-center px-2 text-[9px] font-mono text-indigo-700 font-medium">
                A_Roll_01.mp4
              </div>
              <div className="w-1/4 bg-indigo-600 border border-indigo-750 rounded h-full flex items-center px-2 text-[9px] font-mono text-white font-medium shadow-xs">
                <Scissors className="w-2.5 h-2.5 mr-1" />
                Cut_Scene.mp4
              </div>
              <div className="w-1/3 bg-indigo-50 border border-indigo-100 rounded h-full flex items-center px-2 text-[9px] font-mono text-indigo-700 font-medium">
                A_Roll_02.mp4
              </div>
            </div>
          </div>

          {/* Track 2: Audio Track */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-400 w-6 flex-shrink-0 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-slate-400" />
              A1
            </span>
            <div className="flex-1 bg-slate-50 rounded-md h-8 relative overflow-hidden border border-slate-100 flex items-center p-1 gap-2">
              <div className="w-full bg-emerald-50 border border-emerald-100 rounded h-full flex items-center px-2 justify-between">
                <span className="text-[9px] font-mono text-emerald-700 font-medium">Background_Synth.wav</span>
                {/* Decorative audio waves */}
                <div className="flex items-end gap-0.5 h-4 opacity-75">
                  <div className="w-0.5 bg-emerald-500 animate-wave-1 h-3"></div>
                  <div className="w-0.5 bg-emerald-500 animate-wave-2 h-4"></div>
                  <div className="w-0.5 bg-emerald-500 animate-wave-3 h-2"></div>
                  <div className="w-0.5 bg-emerald-500 animate-wave-4 h-3.5"></div>
                  <div className="w-0.5 bg-emerald-500 animate-wave-2 h-1.5"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Export / Loading Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono text-slate-500">
            <span>Exporting "CrestFlow_Launch_Teaser.mp4"</span>
            <span className="text-indigo-600 font-bold">{percent}%</span>
          </div>
          {/* Progress bar track */}
          <div className="w-full bg-slate-200 border border-slate-300 rounded-full h-2 relative overflow-hidden">
            <motion.div 
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 h-full rounded-full"
              style={{ width: `${percent}%` }}
              transition={{ ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Encoding: ProRes 422 HQ</span>
            <span>Target: Login Screen</span>
          </div>
        </div>
      </div>

      <style>{`
        .clip-playhead {
          clip-path: polygon(0% 0%, 100% 0%, 100% 60%, 50% 100%, 0% 60%);
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 15s linear infinite;
        }
        @keyframes wave {
          0%, 100% { transform: scaleY(0.4); }
          50% { transform: scaleY(1.2); }
        }
        .animate-wave-1 { animation: wave 1.2s ease-in-out infinite; }
        .animate-wave-2 { animation: wave 0.8s ease-in-out infinite 0.2s; }
        .animate-wave-3 { animation: wave 1.4s ease-in-out infinite 0.4s; }
        .animate-wave-4 { animation: wave 1s ease-in-out infinite 0.1s; }
      `}</style>
    </div>
  );
}
