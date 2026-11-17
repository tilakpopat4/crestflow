import React from 'react';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "w-8 h-8" }: LogoProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="209.522 209.522 580.955 580.955" 
      className={`${className} shrink-0`}
      style={{ fillRule: 'evenodd', clipRule: 'evenodd' }}
    >
      <defs>
        <linearGradient 
          id="cfFinalLinear2" 
          x1="0" 
          y1="0" 
          x2="1" 
          y2="0" 
          gradientUnits="userSpaceOnUse" 
          gradientTransform="matrix(562.800409,562.800409,-562.800409,562.800409,218.599796,218.599796)"
        >
          <stop offset="0" style={{ stopColor: '#404040', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: '#242424', stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient 
          id="cfFinalLinear3" 
          x1="0" 
          y1="0" 
          x2="1" 
          y2="0" 
          gradientUnits="userSpaceOnUse" 
          gradientTransform="matrix(295.016343,45.38713,-45.38713,295.016343,352.491828,329.798264)"
        >
          <stop offset="0" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
          <stop offset="1" style={{ stopColor: '#cccccc', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <g>
        <path 
          d="M658.855,218.6c67.635,0 122.545,54.911 122.545,122.545l0,317.71c0,67.635 -54.911,122.545 -122.545,122.545l-317.71,0c-67.635,0 -122.545,-54.911 -122.545,-122.545l0,-317.71c0,-67.635 54.911,-122.545 122.545,-122.545l317.71,0Z" 
          style={{ fill: 'url(#cfFinalLinear2)', stroke: '#555555', strokeWidth: '15.89px' }}
        />
        <g>
          <path 
            d="M627.084,420.573c17.535,0 31.771,14.236 31.771,31.771l0,152.047c0,17.535 -14.236,31.771 -31.771,31.771l-254.168,0c-17.535,0 -31.771,-14.236 -31.771,-31.771l0,-152.047c0,-17.535 14.236,-31.771 31.771,-31.771l254.168,0Z" 
            style={{ fill: '#ffffff' }}
          />
          <path 
            d="M352.492,375.185l68.081,-45.387l226.936,0l-68.081,45.387l-226.936,0Z" 
            style={{ fill: 'url(#cfFinalLinear3)', fillRule: 'nonzero' }}
          />
          <rect 
            x="375.185" 
            y="375.185" 
            width="249.629" 
            height="22.694" 
            style={{ fill: '#ffffff', fillRule: 'nonzero' }}
          />
          <path 
            d="M425.111,329.798l-22.694,45.387" 
            style={{ fill: 'none', fillRule: 'nonzero', stroke: '#242424', strokeWidth: '9.08px', strokeLinecap: 'round' }}
          />
          <path 
            d="M493.192,329.798l-22.694,45.387" 
            style={{ fill: 'none', fillRule: 'nonzero', stroke: '#242424', strokeWidth: '9.08px', strokeLinecap: 'round' }}
          />
          <path 
            d="M561.273,329.798l-22.694,45.387" 
            style={{ fill: 'none', fillRule: 'nonzero', stroke: '#242424', strokeWidth: '9.08px', strokeLinecap: 'round' }}
          />
          <circle 
            cx="500" 
            cy="528.367" 
            r="49.926" 
            style={{ fill: '#242424' }}
          />
          <path 
            d="M488.653,505.673l36.31,22.694l-36.31,22.694l0,-45.387Z" 
            style={{ fill: '#ffffff', fillRule: 'nonzero' }}
          />
        </g>
      </g>
    </svg>
  );
}
