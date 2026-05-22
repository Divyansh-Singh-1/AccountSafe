// src/pages/TrashPage.tsx
/**
 * Trash Page - Recycle Bin for Deleted Credentials
 * 
 * Zero-Knowledge Compliant:
 * - All data displayed is encrypted and decrypted client-side
 * - Server only stores encrypted blobs
 * - Shredding permanently destroys encryption key material
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getTrashProfiles, restoreProfile, shredProfile, TrashProfile } from '../features/vault/services/vaultService';
import { DotGrid, HyperText, MagicCard, NumberTicker, Button } from '../components/ui';
import { ArrowLeft, Trash2, RotateCcw, Clock, ShieldAlert, ShieldCheck } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Confirmation Modal Component
// ═══════════════════════════════════════════════════════════════════════════════

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  onConfirm,
  onCancel,
  isDangerous = false,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative z-10 w-full max-w-md"
      >
        <MagicCard className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6">
          <h3 className={`text-lg font-bold mb-3 tracking-tight ${
            isDangerous ? 'text-red-500 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'
          }`}>
            {title}
          </h3>
          <p className="text-sm text-zinc-550 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
            {message}
          </p>
          
          <div className="flex justify-end gap-3">
            <Button
              onClick={onCancel}
              disabled={isLoading}
              variant="secondary"
              size="sm"
              className="font-bold border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={isLoading}
              variant={isDangerous ? 'destructive' : 'default'}
              size="sm"
              isLoading={isLoading}
              className="font-bold shadow-lg"
            >
              {confirmText}
            </Button>
          </div>
        </MagicCard>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Trash Item Card Component
// ═══════════════════════════════════════════════════════════════════════════════

interface TrashItemCardProps {
  profile: TrashProfile;
  onRestore: (id: number) => void;
  onShred: (id: number) => void;
  isRestoring: boolean;
  isShredding: boolean;
}

const TrashItemCard: React.FC<TrashItemCardProps> = ({
  profile,
  onRestore,
  onShred,
  isRestoring,
  isShredding,
}) => {
  const daysRemaining = profile.days_remaining;
  const isUrgent = daysRemaining <= 7;
  const isCritical = daysRemaining <= 3;

  // Format deleted date
  const deletedDate = new Date(profile.deleted_at);
  const formattedDate = deletedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const cardSpotlightColor = isCritical 
    ? 'rgba(239, 68, 68, 0.05)' 
    : isUrgent 
    ? 'rgba(245, 158, 11, 0.05)' 
    : undefined;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <MagicCard
        spotlightColor={cardSpotlightColor}
        className={`backdrop-blur-md p-4 border transition-all duration-300 ${
          isCritical
            ? 'border-red-300 dark:border-red-900 bg-red-50/20 dark:bg-red-950/10'
            : isUrgent
            ? 'border-amber-300 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10'
            : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:border-cyan-500/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 truncate tracking-tight">
              {profile.title || 'Untitled Profile'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500 mt-1 font-medium">
              Deleted on {formattedDate}
            </p>
            
            {/* Countdown Badge */}
            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold ${
              isCritical
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50'
                : isUrgent
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800/50'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>
                {daysRemaining === 0 
                  ? 'Expires today' 
                  : daysRemaining === 1 
                  ? 'Expires tomorrow'
                  : `Expires in ${daysRemaining} days`
                }
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => onRestore(profile.id)}
              disabled={isRestoring || isShredding}
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-none border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 hover:border-emerald-500 hover:text-emerald-500 transition-all font-semibold"
              leftIcon={!isRestoring && <RotateCcw className="w-4 h-4" />}
              isLoading={isRestoring}
            >
              Restore
            </Button>
            
            <Button
              onClick={() => onShred(profile.id)}
              disabled={isRestoring || isShredding}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none border-red-500/20 text-red-500 hover:bg-red-50 hover:text-white hover:border-red-500 transition-all font-semibold"
              leftIcon={!isShredding && <Trash2 className="w-4 h-4" />}
              isLoading={isShredding}
            >
              Delete
            </Button>
          </div>
        </div>
      </MagicCard>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Loading Skeleton
// ═══════════════════════════════════════════════════════════════════════════════

const TrashSkeleton: React.FC = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <MagicCard
        key={i}
        className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 p-4.5 animate-pulse"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
            <div className="h-4 bg-zinc-100 dark:bg-zinc-850 rounded w-32 mt-2.5" />
            <div className="h-6 bg-zinc-150 dark:bg-zinc-850 rounded-full w-36 mt-3.5" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 bg-zinc-200 dark:bg-zinc-850 rounded-lg w-20" />
            <div className="h-9 bg-zinc-200 dark:bg-zinc-850 rounded-lg w-28" />
          </div>
        </div>
      </MagicCard>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Main Trash Page Component
// ═══════════════════════════════════════════════════════════════════════════════

const TrashPage: React.FC = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<TrashProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Action states
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [shreddingId, setShreddingId] = useState<number | null>(null);
  
  // Modal state
  const [showShredModal, setShowShredModal] = useState(false);
  const [profileToShred, setProfileToShred] = useState<number | null>(null);

  // Fetch trash profiles
  const fetchTrash = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getTrashProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Failed to fetch trash:', err);
      setError('Failed to load trash. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  // Handle restore
  const handleRestore = async (id: number) => {
    try {
      setRestoringId(id);
      await restoreProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Failed to restore profile:', err);
      setError('Failed to restore profile. Please try again.');
    } finally {
      setRestoringId(null);
    }
  };

  // Handle shred initiation (show modal)
  const handleShredClick = (id: number) => {
    setProfileToShred(id);
    setShowShredModal(true);
  };

  // Handle confirmed shred
  const handleShredConfirm = async () => {
    if (!profileToShred) return;
    
    try {
      setShreddingId(profileToShred);
      await shredProfile(profileToShred);
      setProfiles((prev) => prev.filter((p) => p.id !== profileToShred));
      setShowShredModal(false);
      setProfileToShred(null);
    } catch (err) {
      console.error('Failed to shred profile:', err);
      setError('Failed to permanently delete profile. Please try again.');
    } finally {
      setShreddingId(null);
    }
  };

  // Calculate summary stats
  const urgentCount = profiles.filter((p) => p.days_remaining <= 7).length;
  const criticalCount = profiles.filter((p) => p.days_remaining <= 3).length;

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-[#09090b] transition-colors duration-300 overflow-hidden">
      {/* Background Interactive Dot Matrix */}
      <DotGrid />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            size="sm"
            className="mb-4 font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-950/40 rounded-xl border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)] flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <HyperText text="Trash" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                Deleted credentials are kept for 30 days before permanent removal
              </p>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        {criticalCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50/50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/60 backdrop-blur-md rounded-xl shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 p-1.5 bg-red-100 dark:bg-red-900/40 rounded-lg">
                <ShieldAlert className="w-5 h-5 text-red-650 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800 dark:text-red-300">
                  {criticalCount} {criticalCount === 1 ? 'item' : 'items'} expiring soon!
                </h3>
                <p className="text-sm text-red-700 dark:text-red-400 mt-0.5 font-medium leading-relaxed">
                  These items will be permanently deleted within 3 days. Restore them now if needed.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        {!isLoading && profiles.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MagicCard className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-zinc-200/80 dark:border-zinc-800/80 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                <NumberTicker value={profiles.length} />
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 font-semibold uppercase tracking-wider">
                Total in Trash
              </div>
            </MagicCard>
            <MagicCard spotlightColor="rgba(245, 158, 11, 0.08)" className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-amber-200/60 dark:border-amber-900/40 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400">
                <NumberTicker value={urgentCount} />
              </div>
              <div className="text-xs text-zinc-550 dark:text-zinc-400 mt-1.5 font-semibold uppercase tracking-wider">
                Expiring in 7 days
              </div>
            </MagicCard>
            <MagicCard spotlightColor="rgba(239, 68, 68, 0.08)" className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md border-red-200/60 dark:border-red-900/40 p-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-red-650 dark:text-red-400">
                <NumberTicker value={criticalCount} />
              </div>
              <div className="text-xs text-zinc-550 dark:text-zinc-400 mt-1.5 font-semibold uppercase tracking-wider">
                Expiring in 3 days
              </div>
            </MagicCard>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-6 p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/80 rounded-xl text-sm text-red-700 dark:text-red-300 font-medium"
          >
            {error}
          </motion.div>
        )}

        {/* Content */}
        {isLoading ? (
          <TrashSkeleton />
        ) : profiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Trash2 className="w-16 h-16 text-zinc-350 dark:text-zinc-700 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              Trash is empty
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto font-medium">
              Deleted credentials will appear here for 30 days before being permanently removed.
            </p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {profiles.map((profile) => (
                <TrashItemCard
                  key={profile.id}
                  profile={profile}
                  onRestore={handleRestore}
                  onShred={handleShredClick}
                  isRestoring={restoringId === profile.id}
                  isShredding={shreddingId === profile.id}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Zero-Knowledge Notice */}
        <MagicCard className="mt-8 p-4.5 bg-zinc-100/50 dark:bg-zinc-900/30 backdrop-blur-md rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
          <div className="flex items-start gap-3.5">
            <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-center mt-0.5">
              <ShieldCheck className="w-5 h-5 text-emerald-650 dark:text-emerald-400 flex-shrink-0" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Zero-Knowledge Security
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium leading-relaxed">
                Your deleted credentials remain encrypted. When permanently deleted, the encryption data is crypto-shredded, 
                making recovery impossible even with database access. The server never sees your plaintext passwords.
              </p>
            </div>
          </div>
        </MagicCard>
      </div>

      {/* Shred Confirmation Modal */}
      <AnimatePresence>
        {showShredModal && (
          <ConfirmModal
            isOpen={showShredModal}
            title="Permanently Delete?"
            message="This action cannot be undone. The encrypted data will be crypto-shredded, making recovery impossible. Are you sure you want to permanently delete this credential?"
            confirmText="Delete Forever"
            onConfirm={handleShredConfirm}
            onCancel={() => {
              setShowShredModal(false);
              setProfileToShred(null);
            }}
            isDangerous
            isLoading={shreddingId !== null}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TrashPage;
