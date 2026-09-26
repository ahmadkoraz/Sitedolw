import React from 'react';

interface SiteflowLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const SiteflowLogo: React.FC<SiteflowLogoProps> = ({ size = 'md', showTagline = false }) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const iconSizes = {
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  return (
    <div className="flex flex-col select-none">
      <div className="flex items-center gap-2.5">
        {/* Original Industrial Angular Monogram */}
        <div className={`relative ${iconSizes[size]} bg-[#1C1C1C] border border-[#F5C400]/40 rounded-sm flex items-center justify-center overflow-hidden shadow-sm shadow-[#F5C400]/10`}>
          <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#F5C400] transform translate-x-1.5 -translate-y-1.5 rotate-45" />
          <svg className="w-3/5 h-3/5 text-[#F5C400]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>
        
        {/* Wordmark */}
        <div className="flex items-baseline tracking-tight">
          <span className={`font-black uppercase tracking-wider font-['Chakra_Petch',sans-serif] ${sizeClasses[size]} text-white`}>
            SITE
          </span>
          <span className={`font-black uppercase tracking-wider font-['Chakra_Petch',sans-serif] ${sizeClasses[size]} text-[#F5C400]`}>
            FLOW
          </span>
        </div>
      </div>

      {showTagline && (
        <span className="text-[10px] font-semibold tracking-[0.2em] text-[#A0A0A0] uppercase mt-0.5 ml-0.5">
          Work. Track. Build.
        </span>
      )}
    </div>
  );
};
