import React from 'react';
import { Shield, ShieldCheck, LockOpen, RefreshCw, AlertTriangle, ArrowUpRight, ArrowDownRight, HardDrive } from 'lucide-react';
import { MagicCard, NumberTicker } from './ui';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  iconBgColor: string;
  iconTextColor: string;
  trend?: number;
  grade?: string;
  gradeColor?: string;
}

interface StorageCardProps {
  storageUsed: number;
  storageLimit: number;
}

interface SecurityStatsGridProps {
  healthScore: number;
  weakPasswords: number;
  reusedPasswords: number;
  breachedPasswords: number;
  totalCredentials: number;
  storageUsed?: number;
  storageLimit?: number;
}

interface GradeInfo {
  grade: string;
  color: string;
  label: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

const getGrade = (score: number): GradeInfo => {
  if (score >= 90) {
    return { grade: 'A+', color: 'text-emerald-500 dark:text-emerald-400', label: 'Excellent' };
  } else if (score >= 80) {
    return { grade: 'A', color: 'text-emerald-600 dark:text-emerald-500', label: 'Very Good' };
  } else if (score >= 70) {
    return { grade: 'B', color: 'text-blue-500 dark:text-blue-400', label: 'Good' };
  } else if (score >= 60) {
    return { grade: 'C', color: 'text-amber-500 dark:text-amber-400', label: 'Fair' };
  } else {
    return { grade: 'F', color: 'text-rose-500 dark:text-rose-400', label: 'Critical Risk' };
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// StatCard Component with Premium Spotlight MagicCard & NumberTicker
// ═══════════════════════════════════════════════════════════════════════════════

const StatCard: React.FC<StatCardProps> = ({ 
  icon, 
  value, 
  label, 
  iconBgColor, 
  iconTextColor,
  trend,
  grade,
  gradeColor
}) => {
  const numericValue = typeof value === 'number' ? value : parseInt(value) || 0;

  return (
    <MagicCard className="p-4 sm:p-5 flex flex-col justify-between transition-all duration-300">
      <div>
        {/* Icon with circular background */}
        <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${iconBgColor} ${iconTextColor} mb-2.5 sm:mb-3`}>
          {icon}
        </div>
        
        {/* Value and Grade */}
        <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1">
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white">
            <NumberTicker value={numericValue} />
          </div>
          {grade && (
            <div className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight ${gradeColor}`}>
              {grade}
            </div>
          )}
        </div>
        
        {/* Label */}
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-1.5">
          {label}
        </div>
      </div>

      {/* Trend Indicator */}
      {trend !== undefined && trend !== 0 && (
        <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-medium ${
          trend > 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
        }`}>
          {trend > 0 ? (
            <>
              <ArrowUpRight className="w-3 h-3" />
              <span>+{trend}</span>
            </>
          ) : (
            <>
              <ArrowDownRight className="w-3 h-3" />
              <span>{trend}</span>
            </>
          )}
          <span className="text-slate-400 dark:text-slate-500 ml-1 hidden sm:inline">vs last week</span>
        </div>
      )}
    </MagicCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Storage Card Component with Premium MagicCard (Operation: Iron Fist)
// ═══════════════════════════════════════════════════════════════════════════════

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getStorageColor = (percentage: number): { bg: string; bar: string; text: string } => {
  if (percentage >= 90) {
    return { bg: 'bg-rose-500/10', bar: 'bg-rose-500', text: 'text-rose-500' };
  } else if (percentage >= 75) {
    return { bg: 'bg-amber-500/10', bar: 'bg-amber-500', text: 'text-amber-500' };
  }
  return { bg: 'bg-emerald-500/10', bar: 'bg-emerald-500', text: 'text-emerald-500' };
};

const StorageCard: React.FC<StorageCardProps> = ({ storageUsed, storageLimit }) => {
  const percentage = storageLimit > 0 ? Math.min(100, (storageUsed / storageLimit) * 100) : 0;
  const colors = getStorageColor(percentage);
  
  return (
    <MagicCard className="p-4 sm:p-5 flex flex-col justify-between transition-all duration-300">
      <div>
        {/* Icon with circular background */}
        <div className={`inline-flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-xl ${colors.bg} ${colors.text} mb-2.5 sm:mb-3`}>
          <HardDrive className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        
        {/* Value */}
        <div className="flex items-baseline gap-1.5 sm:gap-2 mb-1">
          <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white">
            {formatBytes(storageUsed)}
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            / {formatBytes(storageLimit)}
          </div>
        </div>
        
        {/* Label */}
        <div className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold mb-2">
          Storage Used
        </div>
      </div>

      <div>
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full ${colors.bar} transition-all duration-500 ease-out rounded-full`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Percentage Text */}
        <div className={`text-[10px] sm:text-xs font-semibold mt-1.5 ${colors.text}`}>
          {percentage.toFixed(1)}% used
          {percentage >= 90 && (
            <span className="ml-1 text-rose-500">⚠️ Full!</span>
          )}
        </div>
      </div>
    </MagicCard>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// SecurityStatsGrid Component
// ═══════════════════════════════════════════════════════════════════════════════

export const SecurityStatsGrid: React.FC<SecurityStatsGridProps> = ({
  healthScore,
  weakPasswords,
  reusedPasswords,
  breachedPasswords,
  totalCredentials,
  storageUsed = 0,
  storageLimit = 20 * 1024 * 1024, // 20MB default
}) => {
  const isEmpty = totalCredentials === 0;
  const gradeInfo = isEmpty 
    ? { grade: '-', color: 'text-slate-400 dark:text-slate-600', label: 'No Data' }
    : getGrade(healthScore);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Security Score with Grade */}
      <StatCard
        icon={isEmpty ? <Shield className="w-4 h-4 sm:w-5 sm:h-5" /> : <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />}
        value={isEmpty ? 0 : healthScore}
        label="Health Score"
        iconBgColor={isEmpty ? 'bg-slate-500/10' : 'bg-emerald-500/10'}
        iconTextColor={isEmpty ? 'text-slate-500' : 'text-emerald-500'}
        grade={gradeInfo.grade}
        gradeColor={gradeInfo.color}
        trend={isEmpty ? undefined : 5}
      />

      {/* Weak Passwords */}
      <StatCard
        icon={<LockOpen className="w-4 h-4 sm:w-5 sm:h-5" />}
        value={weakPasswords}
        label="Weak Passwords"
        iconBgColor="bg-rose-500/10"
        iconTextColor="text-rose-500"
        trend={weakPasswords > 0 ? -2 : 0}
      />

      {/* Reused Passwords */}
      <StatCard
        icon={<RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />}
        value={reusedPasswords}
        label="Reused"
        iconBgColor="bg-amber-500/10"
        iconTextColor="text-amber-500"
        trend={reusedPasswords > 0 ? -1 : 0}
      />

      {/* Compromised/Breached */}
      <StatCard
        icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
        value={breachedPasswords}
        label="Breached"
        iconBgColor="bg-rose-500/10"
        iconTextColor="text-rose-500"
        trend={breachedPasswords > 0 ? 0 : 0}
      />

      {/* Storage Usage (Operation: Iron Fist) */}
      <StorageCard 
        storageUsed={storageUsed}
        storageLimit={storageLimit}
      />
    </div>
  );
};
