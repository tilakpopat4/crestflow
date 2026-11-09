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
        <linearGradient id="cfLogoBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#404040" />
          <stop offset="100%" stopColor="#242424" />
        </linearGradient>
        <linearGradient id="cfLogoAccent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cccccc" />
        </linearGradient>
      </defs>

      {/* Visible squircle container with defined graphite border */}
      <rect x="8" y="8" width="496" height="496" rx="108" fill="url(#cfLogoBg)" stroke="#555555" strokeWidth="14" />

      <g>
        <rect x="116" y="186" width="280" height="190" rx="28" fill="#ffffff" />
        <path d="M126 146 L186 106 H386 L326 146 Z" fill="url(#cfLogoAccent)" />
        <path d="M146 146 h220 v20 H146 z" fill="#ffffff" />
        
        <path d="M190 106 L170 146" stroke="#242424" strokeWidth="8" strokeLinecap="round" />
        <path d="M250 106 L230 146" stroke="#242424" strokeWidth="8" strokeLinecap="round" />
        <path d="M310 106 L290 146" stroke="#242424" strokeWidth="8" strokeLinecap="round" />

        <circle cx="256" cy="281" r="44" fill="#242424" />
        <polygon points="246,261 278,281 246,301" fill="#ffffff" />
      </g>
    </svg>
  );
}

