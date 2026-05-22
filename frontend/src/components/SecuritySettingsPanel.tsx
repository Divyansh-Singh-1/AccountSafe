import React, { useState, useEffect, useCallback } from 'react';
import {
  getPanicDuressSettings,
  setPanicShortcut,
  clearPanicShortcut,
  setDuressPassword,
  clearDuressPassword,
  isForbiddenShortcut,
  formatKeyCombo,
  PanicDuressSettings
} from '../services/securityService';
import { usePrivacyGuard } from '../contexts/PrivacyGuardContext';
import { Input, Button, MagicCard } from './ui';
import { Keyboard, EyeOff, ShieldAlert, ShieldCheck, Shield, Key, Mail, Lock } from 'lucide-react';

const SecuritySettingsPanel: React.FC = () => {
  const [settings, setSettings] = useState<PanicDuressSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Privacy Guard
  const { enablePrivacyBlur, togglePrivacyBlur } = usePrivacyGuard();

  // Panic shortcut states
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  // Duress password states
  const [showDuressModal, setShowDuressModal] = useState(false);
  const [duressFormData, setDuressFormData] = useState({
    masterPassword: '',
    duressPassword: '',
    confirmDuressPassword: '',
    sosEmail: ''
  });
  const [duressError, setDuressError] = useState<string | null>(null);
  const [isSavingDuress, setIsSavingDuress] = useState(false);

  // Clear duress states
  const [showClearDuressModal, setShowClearDuressModal] = useState(false);
  const [clearMasterPassword, setClearMasterPassword] = useState('');
  const [isClearingDuress, setIsClearingDuress] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await getPanicDuressSettings();
        setSettings(data);
      } catch (_err: unknown) {
        setError('Failed to load security settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // Handle key recording
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isRecordingShortcut) return;
    
    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];
    
    // Capture modifier keys
    if (event.ctrlKey || event.metaKey) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    
    // Capture the main key (not a modifier)
    const mainKey = event.key;
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(mainKey)) {
      const normalizedKey = mainKey.length === 1 ? mainKey.toUpperCase() : mainKey;
      if (!keys.includes(normalizedKey)) {
        keys.push(normalizedKey);
      }
    }
    
    if (keys.length >= 2 && keys.length <= 3) {
      setRecordedKeys(keys);
      setShortcutError(null);
    } else if (keys.length === 1) {
      setRecordedKeys(keys);
      setShortcutError('Press a modifier key (Ctrl, Alt, Shift) with another key');
    } else if (keys.length > 3) {
      setShortcutError('Maximum 3 keys allowed');
    }
  }, [isRecordingShortcut]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (!isRecordingShortcut) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const keys: string[] = [];
    if (event.ctrlKey || event.metaKey) keys.push('Ctrl');
    if (event.altKey) keys.push('Alt');
    if (event.shiftKey) keys.push('Shift');
    
    if (keys.length === 0) {
      setTimeout(() => {
        setRecordedKeys(currentKeys => {
          if (currentKeys.length >= 2 && currentKeys.length <= 3) {
            if (isForbiddenShortcut(currentKeys)) {
              setShortcutError('This combination conflicts with browser shortcuts. Please choose another.');
              return [];
            }
            saveShortcut(currentKeys);
            return currentKeys;
          }
          return currentKeys;
        });
      }, 50);
    }
  }, [isRecordingShortcut]);

  useEffect(() => {
    if (isRecordingShortcut) {
      window.addEventListener('keydown', handleKeyDown, true);
      window.addEventListener('keyup', handleKeyUp, true);
      return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('keyup', handleKeyUp, true);
      };
    }
    return undefined;
  }, [isRecordingShortcut, handleKeyDown, handleKeyUp]);

  const startRecording = () => {
    setRecordedKeys([]);
    setShortcutError(null);
    setIsRecordingShortcut(true);
  };

  const cancelRecording = () => {
    setIsRecordingShortcut(false);
    setRecordedKeys([]);
    setShortcutError(null);
  };

  const saveShortcut = async (keys: string[]) => {
    setIsRecordingShortcut(false);
    
    try {
      const result = await setPanicShortcut(keys);
      setSettings(prev => prev ? { ...prev, panic_shortcut: result.panic_shortcut } : prev);
      setSuccess(`Panic shortcut saved: ${formatKeyCombo(keys)}`);
      setTimeout(() => setSuccess(null), 3000);
      
      window.dispatchEvent(new CustomEvent('panicShortcutUpdated'));
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setError(axiosError.response?.data?.error || 'Failed to save shortcut');
    } finally {
      setRecordedKeys([]);
    }
  };

  const handleClearShortcut = async () => {
    try {
      await clearPanicShortcut();
      setSettings(prev => prev ? { ...prev, panic_shortcut: [] } : prev);
      setSuccess('Panic shortcut cleared');
      setTimeout(() => setSuccess(null), 3000);
      
      window.dispatchEvent(new CustomEvent('panicShortcutUpdated'));
    } catch (_err: unknown) {
      setError('Failed to clear shortcut');
    }
  };

  const handleSaveDuress = async () => {
    setDuressError(null);

    if (!duressFormData.masterPassword) {
      setDuressError('Please enter your master password');
      return;
    }

    if (!duressFormData.duressPassword || duressFormData.duressPassword.length < 8) {
      setDuressError('Duress password must be at least 8 characters');
      return;
    }

    if (duressFormData.duressPassword !== duressFormData.confirmDuressPassword) {
      setDuressError('Duress passwords do not match');
      return;
    }

    if (!duressFormData.sosEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(duressFormData.sosEmail)) {
      setDuressError('Please enter a valid SOS email address');
      return;
    }

    setIsSavingDuress(true);

    try {
      await setDuressPassword(
        duressFormData.masterPassword,
        duressFormData.duressPassword,
        duressFormData.sosEmail
      );
      setSettings(prev => prev ? { ...prev, has_duress_password: true, sos_email: duressFormData.sosEmail } : prev);
      setShowDuressModal(false);
      setDuressFormData({ masterPassword: '', duressPassword: '', confirmDuressPassword: '', sosEmail: '' });
      setSuccess('Ghost Vault configured successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setDuressError(axiosError.response?.data?.error || 'Failed to save duress settings');
    } finally {
      setIsSavingDuress(false);
    }
  };

  const handleClearDuress = async () => {
    if (!clearMasterPassword) {
      setDuressError('Please enter your master password');
      return;
    }

    setIsClearingDuress(true);

    try {
      await clearDuressPassword(clearMasterPassword);
      setSettings(prev => prev ? { ...prev, has_duress_password: false, sos_email: null } : prev);
      setShowClearDuressModal(false);
      setClearMasterPassword('');
      setSuccess('Ghost Vault disabled');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setDuressError(axiosError.response?.data?.error || 'Failed to clear duress settings');
    } finally {
      setIsClearingDuress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-zinc-900 bg-zinc-950/40 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {success && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold">
          <ShieldCheck className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-semibold animate-bounce">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300 text-lg">×</button>
        </div>
      )}

      {/* Panic Button Section */}
      <MagicCard className="p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <Keyboard className="w-4 h-4 text-red-500" />
          Emergency Lock Trigger (Panic Shortcut)
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Establish an absolute hotkey to completely shred all memory-cached decryption keys and lock the vault instantenously.
        </p>

        {/* Emergency Trigger */}
        <div className="mb-6 p-4 bg-red-500/[0.04] border border-red-500/20 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h4 className="text-sm font-bold text-red-400">Emergency Instant Lock</h4>
              <p className="text-xs text-zinc-500 mt-0.5">Click to completely freeze the safe and dump memory caches</p>
            </div>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('triggerPanicMode'));
              }}
              className="px-6 h-11 text-xs font-bold uppercase tracking-widest text-white bg-red-650 rounded-xl hover:bg-red-550 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.35)] flex items-center gap-2 border border-red-600/40 hover:scale-[1.03]"
            >
              <ShieldAlert className="w-4 h-4" />
              PANIC OVERRIDE
            </button>
          </div>
        </div>

        {/* Keyboard Configuration */}
        <div className="hidden md:block border-t border-zinc-900/60 pt-4">
          {isRecordingShortcut ? (
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={recordedKeys.length > 0 ? formatKeyCombo(recordedKeys) : 'Awaiting keystroke combination...'}
                  className="w-full bg-zinc-950/60 border border-red-500/50 text-red-400 font-mono text-center h-10 px-3 rounded-xl focus:outline-none placeholder:text-zinc-500 text-sm animate-pulse"
                />
                <button
                  onClick={cancelRecording}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white font-bold"
                >
                  ×
                </button>
              </div>
              {shortcutError && (
                <p className="text-xs text-red-400 font-semibold">{shortcutError}</p>
              )}
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                Press a modifier key (Ctrl, Alt, Shift) with another letter or key combo.
              </p>
            </div>
          ) : settings?.panic_shortcut && Array.isArray(settings.panic_shortcut) && settings.panic_shortcut.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-zinc-900 border border-zinc-800 text-white font-mono text-center h-10 flex items-center justify-center rounded-xl text-sm select-all">
                  {formatKeyCombo(settings.panic_shortcut)}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={startRecording}
                    variant="secondary"
                    className="h-10"
                  >
                    Change Shortcut
                  </Button>
                  <Button
                    onClick={handleClearShortcut}
                    variant="secondary"
                    className="h-10 border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <p className="text-xs text-zinc-500">
                Panic trigger is operational. Pressing this combo instantly terminates your auth session from anywhere.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={startRecording}
                className="w-full h-11"
              >
                Record emergency keyboard hotkey
              </Button>
              <p className="text-xs text-zinc-500 text-center">
                Recommended: <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-white border border-zinc-800 font-mono text-[10px]">Alt + X</code> or <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-white border border-zinc-800 font-mono text-[10px]">Ctrl + Shift + Z</code>
              </p>
            </div>
          )}
        </div>
      </MagicCard>

      {/* Ghost Vault Card */}
      <MagicCard className="p-6 border border-amber-500/15 bg-amber-500/[0.005]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
          <EyeOff className="w-4 h-4 text-amber-500" />
          Decoy Vault (Duress Authentication)
        </h3>
        <p className="text-xs text-zinc-500 mb-4">
          Register a duplicate vault passkey. Logging in with this passkey populates completely congruent decoy profiles, keeps real secrets locked, and silently dispatches SOS alerts.
        </p>

        {!settings?.has_duress_password ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-600"></div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">System Decoy Off</span>
            </div>
            
            <Button
              onClick={() => setShowDuressModal(true)}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 hover:shadow-amber-500/20"
            >
              Configure Decoy Vault
            </Button>
            
            <div className="p-4 bg-amber-500/[0.04] border border-amber-500/10 rounded-2xl">
              <p className="text-xs text-amber-500 leading-relaxed">
                ⚠️ <strong>Important Zero-Knowledge Notice:</strong> The decoy authentication password must be completely separate from your master key. Decoy vaults will display mock credentials (e.g. Netflix, Spotify) and seem entirely functional.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Decoy System Armed</span>
              </div>
              <span className="text-xs text-zinc-500">• Silent SOS Email target: {settings.sos_email || 'Not configured'}</span>
            </div>
            
            <Button
              onClick={() => setShowClearDuressModal(true)}
              variant="secondary"
              className="w-full sm:w-auto border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 h-10"
            >
              Disable Decoy Credentials
            </Button>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">
              Disabling this removes the decoy vault access pathways and deletes silent email hooks.
            </p>
          </div>
        )}
      </MagicCard>

      {/* Privacy Blur Card */}
      <MagicCard className="p-6 border border-blue-500/15">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-blue-400 mt-0.5"><Shield className="w-5 h-5" /></span>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Shoulder-Surfing Privacy Shield
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Blur application canvas instantly when the browser tab loses focus.
              </p>
            </div>
          </div>
          
          {/* Toggle Switch */}
          <div
            onClick={togglePrivacyBlur}
            role="switch"
            aria-checked={enablePrivacyBlur}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') togglePrivacyBlur(); }}
            className={`relative w-11 h-6 rounded-full cursor-pointer transition-colors duration-200 flex-shrink-0 ${
              enablePrivacyBlur ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]' : 'bg-zinc-700'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                enablePrivacyBlur ? 'left-5.5' : 'left-0.5'
              }`}
              style={{
                left: enablePrivacyBlur ? '22px' : '2px'
              }}
            />
          </div>
        </div>
        
        <p className="mt-3 text-xs text-zinc-500 leading-relaxed">
          Enabling privacy shielding places an impenetrable dark blur matrix over all sensitive fields the exact millisecond your focus transitions to another page, tab, or window.
        </p>
        
        <div className={`mt-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${enablePrivacyBlur ? 'text-cyan-400' : 'text-zinc-500'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${enablePrivacyBlur ? 'bg-cyan-500' : 'bg-zinc-500'}`} />
          {enablePrivacyBlur ? 'Privacy blur armed' : 'Privacy blur offline'}
        </div>
      </MagicCard>

      {/* Duress Password Modal */}
      {showDuressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-zinc-950/90 border border-amber-500/35 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600" />
            
            <div className="px-6 py-5 bg-amber-950/15 flex items-center gap-3 border-b border-zinc-900">
              <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                <EyeOff className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Configure Decoy Vault</h3>
                <p className="text-xs text-zinc-400">Initialize duress settings</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {duressError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{duressError}</span>
                </div>
              )}

              <div>
                <Input
                  type="password"
                  value={duressFormData.masterPassword}
                  onChange={e => setDuressFormData(prev => ({ ...prev, masterPassword: e.target.value }))}
                  leftIcon={<Lock className="w-4 h-4" />}
                  placeholder="Master Authentication Key"
                  label="Master Password (Confirm Identity)"
                />
              </div>

              <div>
                <Input
                  type="password"
                  value={duressFormData.duressPassword}
                  onChange={e => setDuressFormData(prev => ({ ...prev, duressPassword: e.target.value }))}
                  leftIcon={<Key className="w-4 h-4" />}
                  placeholder="Duress Passcode"
                  label="System Decoy Password"
                />
              </div>

              <div>
                <Input
                  type="password"
                  value={duressFormData.confirmDuressPassword}
                  onChange={e => setDuressFormData(prev => ({ ...prev, confirmDuressPassword: e.target.value }))}
                  leftIcon={<Key className="w-4 h-4" />}
                  placeholder="Confirm Duress Passcode"
                  label="Verify Decoy Password"
                />
              </div>

              <div>
                <Input
                  type="email"
                  value={duressFormData.sosEmail}
                  onChange={e => setDuressFormData(prev => ({ ...prev, sosEmail: e.target.value }))}
                  leftIcon={<Mail className="w-4 h-4" />}
                  placeholder="sos@security.domain"
                  label="Silent SOS Email Notification Destination"
                />
                <p className="text-[10px] text-zinc-500 font-medium mt-1">
                  We'll transmit a silent SOS coordinates email to this address upon decoy vault unlock.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-3 rounded-b-2xl">
              <Button
                onClick={handleSaveDuress}
                disabled={isSavingDuress}
                isLoading={isSavingDuress}
                className="w-full"
              >
                Configure Decoy Systems
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDuressModal(false);
                  setDuressError(null);
                  setDuressFormData({ masterPassword: '', duressPassword: '', confirmDuressPassword: '', sosEmail: '' });
                }}
                className="w-full"
              >
                Cancel Setup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Duress Modal */}
      {showClearDuressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-zinc-950/90 border border-red-500/35 max-w-sm w-full rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-650 via-rose-500 to-red-650" />
            
            <div className="px-6 py-5 bg-red-950/15 flex flex-col border-b border-zinc-900">
              <h3 className="text-lg font-bold text-white tracking-tight">Disable Ghost Vault</h3>
              <p className="text-xs text-red-400 mt-0.5">Wipes decoy vault authentication settings</p>
            </div>

            <div className="p-6 space-y-4">
              {duressError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{duressError}</span>
                </div>
              )}
              
              <Input
                type="password"
                value={clearMasterPassword}
                onChange={e => setClearMasterPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                placeholder="Enter master password"
                label="Master Authentication Password"
              />
            </div>

            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-3 rounded-b-2xl">
              <Button
                onClick={handleClearDuress}
                disabled={isClearingDuress}
                isLoading={isClearingDuress}
                variant="destructive"
                className="w-full"
              >
                Disable Decoy System
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowClearDuressModal(false);
                  setClearMasterPassword('');
                  setDuressError(null);
                }}
                className="w-full"
              >
                Cancel Action
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettingsPanel;
