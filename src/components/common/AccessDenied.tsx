import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface AccessDeniedProps {
  onBack?: () => void;
  requiredRole?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onBack, requiredRole }) => {
  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="bg-[#1C1C1C] border border-[#D92D20]/40 rounded-lg p-8 max-w-md w-full text-center shadow-xl">
        <div className="w-14 h-14 mx-auto rounded-full bg-[#D92D20]/10 border border-[#D92D20]/30 flex items-center justify-center text-[#D92D20] mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-bold text-white uppercase tracking-tight mb-2">
          Access Restricted
        </h2>
        
        <p className="text-[#A0A0A0] text-sm leading-relaxed mb-6">
          You don’t have permission to access this area.
          {requiredRole && (
            <span className="block mt-2 font-mono text-xs text-amber-400">
              Required privilege level: {requiredRole}
            </span>
          )}
        </p>

        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#252525] hover:bg-[#303030] text-white border border-[#3C3C3C] text-sm font-semibold rounded transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};
