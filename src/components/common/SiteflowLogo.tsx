import React from 'react';

interface SiteflowLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export const SiteflowLogo: React.FC<SiteflowLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const iconDimensions = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <div className={`flex flex-col select-none ${className}`}>
      <div className="flex items-center gap-2.5">
        {/* Modern Geometric Architectural Monogram */}
        <div
          className={`${iconDimensions[size]} rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center shadow-sm relative overflow-hidden shrink-0`}
        >
          {/* Subtle amber accent bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
          <svg
            className="w-1/2 h-1/2 text-amber-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 21h18" />
            <path d="M5 21V7l8-4v18" />
            <path d="M19 21V11l-6-4" />
            <path d="M9 9v.01" />
            <path d="M9 13v.01" />
            <path d="M9 17v.01" />
          </svg>
        </div>

        {/* Brand Wordmark */}
        <div className="flex items-baseline tracking-tight">
          <span className={`font-bold tracking-tight text-slate-100 ${textSizes[size]}`}>
            Site
          </span>
          <span className={`font-bold tracking-tight text-amber-400 ${textSizes[size]}`}>
            flow
          </span>
        </div>
      </div>

      {showTagline && (
        <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase mt-0.5 pl-0.5">
          Work · Track · Build
        </span>
      )}
    </div>
  );
};
