import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-8 h-8" }: LogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 512 512" 
      className={`${className} shrink-0`}
    >
      <defs>
        <linearGradient id="clapperBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#181818" />
        </linearGradient>
        <linearGradient id="clapperAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e8ecf2" />
        </linearGradient>
      </defs>

      {/* Clean, Full-Frame Clapperboard Symbol (Zero Artificial Outer White/Black Box) */}
      <g>
        {/* Main Clapperboard Body */}
        <rect x="48" y="172" width="416" height="292" rx="44" fill="url(#clapperBody)" stroke="#484848" strokeWidth="9" />

        {/* Lower Hinge Stick */}
        <rect x="64" y="124" width="384" height="40" rx="10" fill="#1e1e1e" stroke="#484848" strokeWidth="7" />

        {/* Top Angled Clapper Stick */}
        <path d="M52 118 L132 44 H460 L380 118 Z" fill="url(#clapperAccent)" stroke="#484848" strokeWidth="7" />

        {/* Clapper Diagonal Stripes */}
        <path d="M132 44 L98 118" stroke="#1c1c1c" strokeWidth="22" strokeLinecap="round" />
        <path d="M214 44 L180 118" stroke="#1c1c1c" strokeWidth="22" strokeLinecap="round" />
        <path d="M296 44 L262 118" stroke="#1c1c1c" strokeWidth="22" strokeLinecap="round" />
        <path d="M378 44 L344 118" stroke="#1c1c1c" strokeWidth="22" strokeLinecap="round" />

        {/* Center Play Action Button */}
        <circle cx="256" cy="318" r="72" fill="#ffffff" />
        <polygon points="238,286 290,318 238,350" fill="#1c1c1c" />
      </g>
    </svg>
  );
}
