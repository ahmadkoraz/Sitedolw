import React from 'react';
import { Card } from './Card';

export interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  subtext,
  icon,
  iconBgColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  className = '',
  onClick,
}) => {
  return (
    <Card
      hover={Boolean(onClick)}
      className={`p-5 relative overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 block tracking-normal">
            {label}
          </span>
          <div className="text-2xl sm:text-3xl font-bold text-slate-100 mt-2 font-mono tracking-tight">
            {value}
          </div>
          {subtext && (
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
              {subtext}
            </p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
