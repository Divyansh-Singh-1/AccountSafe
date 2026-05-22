import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUserProfile, deleteAccount, requestPasswordResetOTP, verifyPasswordResetOTP, changePassword } from "../services/authService";
import { getPinStatus, resetPin, clearPin } from "../services/pinService";
import { useAuth } from "../contexts/AuthContext";
import SecuritySettingsPanel from "../components/SecuritySettingsPanel";
import ActiveSessionsList from "../components/ActiveSessionsList";
import ImportCredentialsModal from "../features/vault/components/ImportCredentialsModal";
import ExportVaultModal from "../features/vault/components/ExportVaultModal";
import { Input, Button, DotGrid, MagicCard } from "../components/ui";
import { Lock, ShieldAlert, ShieldCheck, Trash2, KeyRound, Key, RefreshCw, Settings, Download, Upload, ArrowLeft, Sparkles, Terminal } from "lucide-react";

const SecuritySettingsPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Delete account states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // PIN reset states
  const [showPinResetModal, setShowPinResetModal] = useState(false);
  const [hasPin, setHasPin] = useState(false);
  const [pinResetStep, setPinResetStep] = useState<'request' | 'verify' | 'newpin'>('request');
  const [pinResetOtp, setPinResetOtp] = useState('');
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [confirmNewPin, setConfirmNewPin] = useState(['', '', '', '']);
  const [isPinResetting, setIsPinResetting] = useState(false);
  const [pinResetError, setPinResetError] = useState<string | null>(null);
  const [pinResetSuccess, setPinResetSuccess] = useState<string | null>(null);

  // Clear PIN states
  const [showClearPinModal, setShowClearPinModal] = useState(false);
  const [isClearingPin, setIsClearingPin] = useState(false);
  const [clearPinError, setClearPinError] = useState<string | null>(null);

  // Import credentials modal state
  const [showImportModal, setShowImportModal] = useState(false);

  // Export vault modal state
  const [showExportModal, setShowExportModal] = useState(false);

  const { logout: authLogout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileData = await getUserProfile();
        setEmail(profileData.email || "");
        
        // Check PIN status
        try {
          const pinStatus = await getPinStatus();
          setHasPin(pinStatus.has_pin);
        } catch {
          // Ignore PIN status errors
        }
      } catch (err: unknown) {
        console.error("Profile fetch error:", err);
        setError("Failed to load profile data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Password change handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword || !newPassword) {
      setPasswordError("Both current and new password are required");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters long");
      return;
    }

    setIsChangingPassword(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: unknown) {
      console.error("Password change error:", err);
      const axiosError = err as { response?: { data?: { error?: string } } };
      const errorMessage = axiosError.response?.data?.error || "Failed to change password";
      setPasswordError(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // PIN Reset handlers
  const handleRequestPinResetOtp = async () => {
    if (!email) {
      setPinResetError("Email is required");
      return;
    }

    setIsPinResetting(true);
    setPinResetError(null);

    try {
      await requestPasswordResetOTP(email);
      setPinResetStep('verify');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setPinResetError(axiosError.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsPinResetting(false);
    }
  };

  const handleVerifyPinResetOtp = async (otpValue?: string) => {
    const otp = otpValue ?? pinResetOtp;
    if (!otp || otp.length !== 6) {
      setPinResetError("Please enter a valid 6-digit OTP");
      return;
    }

    setIsPinResetting(true);
    setPinResetError(null);

    try {
      await verifyPasswordResetOTP(email, otp);
      setPinResetStep('newpin');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setPinResetError(axiosError.response?.data?.error || "Invalid OTP");
    } finally {
      setIsPinResetting(false);
    }
  };

  const handleSetNewPin = async () => {
    const pinValue = newPin.join('');
    const confirmValue = confirmNewPin.join('');

    if (pinValue.length !== 4) {
      setPinResetError("Please enter a 4-digit PIN");
      return;
    }

    if (pinValue !== confirmValue) {
      setPinResetError("PINs do not match");
      return;
    }

    setIsPinResetting(true);
    setPinResetError(null);

    try {
      await resetPin(email, pinResetOtp, pinValue);
      setPinResetSuccess("PIN reset successfully!");
      setHasPin(true);
      setTimeout(() => {
        setShowPinResetModal(false);
        setPinResetStep('request');
        setPinResetOtp('');
        setNewPin(['', '', '', '']);
        setConfirmNewPin(['', '', '', '']);
        setPinResetSuccess(null);
      }, 2000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setPinResetError(axiosError.response?.data?.error || "Failed to reset PIN");
    } finally {
      setIsPinResetting(false);
    }
  };

  const closePinResetModal = () => {
    setShowPinResetModal(false);
    setPinResetStep('request');
    setPinResetOtp('');
    setNewPin(['', '', '', '']);
    setConfirmNewPin(['', '', '', '']);
    setPinResetError(null);
    setPinResetSuccess(null);
  };

  // Clear PIN handler
  const handleClearPin = async () => {
    setIsClearingPin(true);
    setClearPinError(null);

    try {
      await clearPin();
      setHasPin(false);
      setShowClearPinModal(false);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setClearPinError(axiosError.response?.data?.error || "Failed to clear PIN");
    } finally {
      setIsClearingPin(false);
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError("Please enter your password");
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError(null);

    try {
      await deleteAccount(deletePassword);
      authLogout();
      navigate("/login", { state: { message: "Your account has been deleted successfully" } });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      setDeleteError(axiosError.response?.data?.error || "Failed to delete account. Please check your password.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center relative overflow-hidden">
        <DotGrid />
        <div className="text-center relative z-10">
          <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_15px_rgba(6,182,212,0.3)]"></div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">Decrypting System Parameters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 relative overflow-hidden pb-12">
      {/* Background Dot Grid Matrix */}
      <DotGrid />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Page Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Security Settings
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Manage credentials, cryptographic PIN, and emergency triggers</p>
            </div>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(-1)}
          >
            Back to Safe
          </Button>
        </div>

        {/* Global Feedback Alert */}
        {error && (
          <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs mb-6 font-semibold animate-bounce">
            <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs mb-6 font-semibold">
            <ShieldCheck className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-6">
          
          {/* Update Password card */}
          <MagicCard className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Lock className="w-4 h-4 text-cyan-400" />
              Update Master Credentials
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Regularly refreshing your master cryptographic key increases vault resilience against offline cracking attempts.
            </p>

            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs mb-4 font-semibold">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs mb-4 font-semibold">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                    required
                    leftIcon={<Lock className="w-4 h-4" />}
                    placeholder="Enter current password"
                    label="Current Master Password"
                  />
                </div>
                <div>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                    required
                    leftIcon={<Lock className="w-4 h-4" />}
                    placeholder="Min 8 characters"
                    label="New Master Password"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-zinc-900 pt-4">
                <Link 
                  to="/forgot-password" 
                  className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-wider"
                >
                  Forgot Master Password?
                </Link>
                <Button
                  type="submit"
                  isLoading={isChangingPassword}
                  disabled={!currentPassword || !newPassword}
                >
                  Update Master Password
                </Button>
              </div>
            </form>
          </MagicCard>

          {/* Security PIN Card */}
          <MagicCard className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              Cryptographic Secure PIN
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              {hasPin 
                ? "Your 4-digit PIN is active, providing an extra security gate when accessing delicate organization credentials."
                : "Configure a local 4-digit PIN lock for instant device authorization when querying organizations."}
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                type="button"
                onClick={() => setShowPinResetModal(true)}
                leftIcon={<Key className="w-4 h-4" />}
              >
                {hasPin ? 'Reset PIN Domain' : 'Configure Safe PIN'}
              </Button>
              
              {hasPin && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowClearPinModal(true)}
                  className="border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40"
                >
                  Clear PIN lock
                </Button>
              )}
            </div>
          </MagicCard>

          {/* Data Management Card */}
          <MagicCard className="p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Vault Data Portability
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              Migrate credentials safely from browsers or fetch a local zero-knowledge encrypted vault backup.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => setShowImportModal(true)}
                className="group cursor-pointer rounded-2xl border border-zinc-850 bg-zinc-950/40 p-5 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent group-hover:via-cyan-500/45 transition-all duration-300" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-white tracking-tight group-hover:text-cyan-400 transition-colors">Import Credentials</h4>
                    <p className="text-xs text-zinc-500 mt-1 truncate">Browser CSV / standard export formats</p>
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setShowExportModal(true)}
                className="group cursor-pointer rounded-2xl border border-zinc-850 bg-zinc-950/40 p-5 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent group-hover:via-emerald-500/45 transition-all duration-300" />
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <Download className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-bold text-white tracking-tight group-hover:text-emerald-400 transition-colors">Export Secure Vault</h4>
                    <p className="text-xs text-zinc-500 mt-1 truncate">Encrypted zero-knowledge database backup</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 text-[10px] uppercase font-bold tracking-wider text-emerald-500/80 flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl px-3 py-2 w-fit">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              Cryptographic integrity: backing up processes all data strictly client-side.
            </p>
          </MagicCard>

          {/* Security & Emergency Locks Panel */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 pl-1">
              Emergency Defenses & Key-Destruction
            </h2>
            <SecuritySettingsPanel />
          </div>

          {/* Active Sessions Grid */}
          <div className="space-y-4">
            <ActiveSessionsList />
          </div>

          {/* Danger Zone */}
          <MagicCard className="p-6 border border-red-500/20 bg-red-500/[0.01]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-4 flex items-center gap-2 border-b border-red-950 pb-3">
              <Trash2 className="w-4 h-4 text-red-500" />
              Critical Danger Zone
            </h3>
            <p className="text-xs text-zinc-500 mb-4">
              Initiating account deletion crypto-shreds all server vaults immediately. This cannot be recovered under any conditions.
            </p>

            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteModal(true)}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Destroy Account Credentials
            </Button>
          </MagicCard>

        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-zinc-950/90 border border-red-500/35 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-600 via-rose-500 to-red-600" />
            
            <div className="px-6 py-5 bg-red-950/15 flex items-center gap-3 border-b border-zinc-900">
              <span className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </span>
              <h3 className="text-lg font-bold text-white tracking-tight">Confirm Vault Shredding</h3>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                This is a terminal process. Confirming deletion immediately wipes your cryptographic key containers, databases, and backup snapshots permanently.
              </p>
              
              {deleteError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div>
                <Input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError(null);
                  }}
                  leftIcon={<Lock className="w-4 h-4" />}
                  placeholder="Confirm password"
                  label="Master Authentication Password"
                  autoFocus
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-3 rounded-b-2xl">
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeletingAccount || !deletePassword}
                isLoading={isDeletingAccount}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="w-full"
              >
                Permanently Shred Vault
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePassword("");
                  setDeleteError(null);
                }}
                className="w-full"
              >
                Cancel Action
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Setup/Reset Modal */}
      {showPinResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-zinc-950/90 border border-purple-500/35 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600" />
            
            <div className="px-6 py-5 bg-purple-950/15 flex items-center gap-3 border-b border-zinc-900">
              <span className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <KeyRound className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {hasPin ? 'Reset' : 'Initialize'} Secure PIN
                </h3>
                <p className="text-[10px] uppercase font-bold tracking-widest text-purple-400/80 mt-0.5">
                  {pinResetStep === 'request' && 'Step 1: Auth Verification'}
                  {pinResetStep === 'verify' && 'Step 2: OTP Validation'}
                  {pinResetStep === 'newpin' && 'Step 3: Cryptographic PIN Registry'}
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {pinResetError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{pinResetError}</span>
                </div>
              )}

              {pinResetSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>{pinResetSuccess}</span>
                </div>
              )}

              {/* Step 1: Request OTP */}
              {pinResetStep === 'request' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed text-center">
                    To authenticate configuration of safe credentials, we will transmit a validation OTP to: <strong className="text-white">{email}</strong>
                  </p>
                  <Button
                    onClick={handleRequestPinResetOtp}
                    disabled={isPinResetting}
                    isLoading={isPinResetting}
                    className="w-full"
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Transmit Authentication OTP
                  </Button>
                </div>
              )}

              {/* Step 2: Verify OTP */}
              {pinResetStep === 'verify' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400 leading-relaxed text-center">
                    Enter the 6-digit cryptographic security code dispatched to your inbox.
                  </p>
                  <div>
                    <Input
                      type="text"
                      maxLength={6}
                      value={pinResetOtp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setPinResetOtp(value);
                        if (value.length === 6 && !isPinResetting) {
                          setTimeout(() => handleVerifyPinResetOtp(value), 100);
                        }
                      }}
                      className="text-center font-mono text-lg tracking-[0.4em]"
                      placeholder="000000"
                      autoFocus
                      inputMode="numeric"
                      label="6-Digit Verification Code"
                    />
                  </div>
                  <Button
                    onClick={() => handleVerifyPinResetOtp()}
                    disabled={isPinResetting || pinResetOtp.length !== 6}
                    isLoading={isPinResetting}
                    className="w-full"
                  >
                    Verify Passcode
                  </Button>
                </div>
              )}

              {/* Step 3: Set New PIN */}
              {pinResetStep === 'newpin' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5 text-center">Enter New 4-Digit PIN</label>
                    <div className="flex justify-center gap-3">
                      {newPin.map((digit, index) => (
                        <input
                          key={`new-${index}`}
                          type="password"
                          maxLength={1}
                          value={digit ? '1' : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const updated = [...newPin];
                            updated[index] = val.slice(-1);
                            setNewPin(updated);
                            if (val && index < 3) {
                              const next = document.getElementById(`new-pin-${index + 1}`);
                              next?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !newPin[index] && index > 0) {
                              const prev = document.getElementById(`new-pin-${index - 1}`);
                              prev?.focus();
                            }
                          }}
                          id={`new-pin-${index}`}
                          className="w-12 h-12 text-center text-xl font-bold bg-zinc-950/60 border border-zinc-800/80 focus:border-cyan-500 rounded-xl transition-all focus:outline-none"
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5 text-center">Verify 4-Digit PIN</label>
                    <div className="flex justify-center gap-3">
                      {confirmNewPin.map((digit, index) => (
                        <input
                          key={`confirm-${index}`}
                          type="password"
                          maxLength={1}
                          value={digit ? '1' : ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            const updated = [...confirmNewPin];
                            updated[index] = val.slice(-1);
                            setConfirmNewPin(updated);
                            if (val && index < 3) {
                              const next = document.getElementById(`confirm-pin-${index + 1}`);
                              next?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !confirmNewPin[index] && index > 0) {
                              const prev = document.getElementById(`confirm-pin-${index - 1}`);
                              prev?.focus();
                            }
                          }}
                          id={`confirm-pin-${index}`}
                          className="w-12 h-12 text-center text-xl font-bold bg-zinc-950/60 border border-zinc-800/80 focus:border-cyan-500 rounded-xl transition-all focus:outline-none"
                          inputMode="numeric"
                          autoComplete="off"
                        />
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={handleSetNewPin}
                    disabled={isPinResetting || newPin.join('').length !== 4 || confirmNewPin.join('').length !== 4}
                    isLoading={isPinResetting}
                    className="w-full mt-4"
                  >
                    Authorize PIN Lock
                  </Button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={closePinResetModal}
                className="w-full"
              >
                Cancel Configuration
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Clear PIN Modal */}
      {showClearPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-zinc-950/90 border border-red-500/35 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-650 via-rose-500 to-red-650" />
            
            <div className="px-6 py-5 bg-red-950/15 flex items-center gap-3 border-b border-zinc-900">
              <span className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Clear PIN Lock?</h3>
                <p className="text-xs text-red-400 mt-0.5">Critical security degradation notice</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-zinc-400 leading-relaxed">
                Wiping your local security PIN degrades access defenses. Anyone who gains access to your active auth token will be able to retrieve organization records freely without entering an extra security layer.
              </p>

              {clearPinError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs font-semibold">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{clearPinError}</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-950 border-t border-zinc-900 flex flex-col gap-3 rounded-b-2xl">
              <Button
                variant="destructive"
                onClick={handleClearPin}
                disabled={isClearingPin}
                isLoading={isClearingPin}
                className="w-full"
              >
                Clear PIN Domain
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowClearPinModal(false);
                  setClearPinError(null);
                }}
                className="w-full"
              >
                Cancel Action
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import Credentials Modal */}
      <ImportCredentialsModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={() => {
          setSuccess("Credentials imported successfully!");
          setShowImportModal(false);
        }}
      />

      {/* Export Vault Modal */}
      <ExportVaultModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </div>
  );
};

export default SecuritySettingsPage;
