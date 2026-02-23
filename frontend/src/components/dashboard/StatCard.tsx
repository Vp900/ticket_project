import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-card text-card-foreground',
    primary: 'bg-primary text-primary-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    info: 'bg-info text-info-foreground',
  };

  const iconBgStyles = {
    default: 'bg-primary/10 text-primary',
    primary: 'bg-white/20 text-white',
    success: 'bg-white/20 text-white',
    warning: 'bg-black/10 text-black',
    info: 'bg-white/20 text-white',
  };

  return (
    <div
      className={cn(
        'stat-card flex items-center justify-between',
        variantStyles[variant]
      )}
    >
      <div>
        <p className={cn('text-sm font-medium opacity-80')}>{title}</p>
        <p className="text-3xl font-heading font-bold mt-1">{value}</p>
        {subtitle && (
          <p className="text-xs mt-1 opacity-70">{subtitle}</p>
        )}
      </div>
      <div
        className={cn(
          'w-14 h-14 rounded-xl flex items-center justify-center',
          iconBgStyles[variant]
        )}
      >
        <Icon className="w-7 h-7" />
      </div>
    </div>
  );
}
