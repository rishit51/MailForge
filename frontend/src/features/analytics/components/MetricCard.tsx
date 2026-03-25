import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: string;
  variant?: 'primary' | 'tertiary' | 'error' | 'default';
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  subtext, 
  icon, 
  variant = 'default' 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'tertiary': return 'text-tertiary';
      case 'primary': return 'text-primary';
      case 'error': return 'text-error';
      default: return 'text-on-surface-variant';
    }
  };

  return (
    <div className="bg-surface-container-lowest p-8 rounded-xl ambient-shadow border-none relative overflow-hidden h-full">
      {/* Decorative circle */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8"></div>
      
      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-4">
        {label}
      </span>
      
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-extrabold font-headline text-on-surface tracking-tighter">
          {value}
        </span>
      </div>
      
      {subtext && (
        <div className={`mt-4 flex items-center gap-1.5 ${getVariantStyles()}`}>
          {icon && <span className="material-symbols-outlined text-sm">{icon}</span>}
          <span className="text-xs font-bold">{subtext}</span>
        </div>
      )}
    </div>
  );
};
