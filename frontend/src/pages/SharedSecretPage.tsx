import React, { useState, useLayoutEffect, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileLock, Copy, Check, Loader2, AlertTriangle, ShieldOff, ShieldAlert } from 'lucide-react';
import { useClipboard } from '../hooks/useClipboard';
import apiClient from '../api/apiClient';
import { decryptOneTimeShare } from '../services/cryptoService';
import { DotGrid, MagicCard, Button, HyperText } from '../components/ui';

// Hide navbar on this page for cleaner mobile experience
const useHideNavbar = () => {
  useLayoutEffect(() => {
    const navbar = document.querySelector('nav');
    if (navbar) {
      navbar.style.display = 'none';
    }
    return () => {
      if (navbar) {
        navbar.style.display = '';
      }
    };
  }, []);
};

// Check if organization looks like a raw ID or slug to hide
const isValidOrganizationDisplay = (org: string | undefined): boolean => {
  if (!org) return false;
  if (/^\d+$/.test(org)) return false;
  if (org.length <= 2) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(org)) return false;
  return true;
};

interface DecryptedData {
  title: string;
  username?: string;
  password?: string;
  email?: string;
  notes?: string;
  recovery_codes?: string;
  organization?: string;
  document_url?: string;
}

const SharedSecretPage: React.FC = () => {
  useHideNavbar();
  
  const { secretId } = useParams<{ secretId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decryptedData, setDecryptedData] = useState<DecryptedData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [missingKey, setMissingKey] = useState(false);
  
  // Extract encryption key from URL fragment (never sent to server)
  const [shareKey, setShareKey] = useState<string | null>(null);
  
  useEffect(() => {
    // Get key from URL fragment (#key)
    const hash = location.hash;
    if (hash && hash.length > 1) {
      setShareKey(hash.substring(1)); // Remove # prefix
      setMissingKey(false);
    } else {
      setMissingKey(true);
    }
  }, [location.hash]);

  // Fetch and view the shared secret (burns the link)
  const handleViewSecret = async () => {
    if (!shareKey) {
      setError('Missing decryption key. The share link may be incomplete.');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Get encrypted blob from server
      const response = await apiClient.get(`shared-secrets/${secretId}/`);
      
      if (!response.data.success) {
        setError(response.data.message || 'Failed to retrieve secret');
        setLoading(false);
        return;
      }

      const encryptedBlob = response.data.encrypted_blob;
      
      if (!encryptedBlob) {
        setError('Invalid share data received');
        setLoading(false);
        return;
      }
      
      // ═══════════════════════════════════════════════════════════════════════════
      // ZERO-KNOWLEDGE: Decrypt client-side using key from URL fragment
      // Server NEVER sees the decrypted data
      // ═══════════════════════════════════════════════════════════════════════════
      try {
        const data = await decryptOneTimeShare(encryptedBlob, shareKey);
        
        setDecryptedData({
          title: data.title || '',
          username: data.username || '',
          password: data.password || '',
          email: data.email || '',
          notes: data.notes || '',
          recovery_codes: data.recovery_codes || '',
          organization: data.organization || '',
          document_url: data.document_url || '',
        });
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError);
        setError('Decryption failed. The share link may be corrupted or incomplete.');
      }
      
      setLoading(false);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
      if (axiosError.response?.status === 404) {
        setError('This link has expired or has already been viewed');
      } else if (axiosError.response?.status === 410) {
        setError('This link has already been viewed and destroyed');
      } else if (axiosError.response?.data?.error) {
        setError(axiosError.response.data.error);
      } else {
        setError('Failed to load secret. Please try again.');
      }
      setLoading(false);
    }
  };

  // Use secure clipboard hook with auto-clear
  const { copy: secureCopy } = useClipboard({ clearAfter: 30000 });

  const copyToClipboard = async (text: string, field: string) => {
    const success = await secureCopy(text);
    if (success) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="relative min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4 transition-colors duration-300 overflow-hidden">
        <DotGrid />
        <div className="relative z-10 text-center">
          <Loader2 className="w-12 h-12 text-cyan-500 dark:text-cyan-400 animate-spin mx-auto mb-4" strokeWidth={1.5} />
          <p className="text-zinc-650 dark:text-zinc-400 font-bold uppercase tracking-wider text-xs">Decrypting secure container...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="relative min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4 transition-colors duration-300 overflow-hidden">
        <DotGrid />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-md w-full"
        >
          <MagicCard className="bg-white/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 p-8 text-center backdrop-blur-md shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-2 tracking-tight">Access Denied</h2>
            <p className="text-zinc-550 dark:text-zinc-400 mb-6 font-medium leading-relaxed">{error}</p>
            <Button
              onClick={() => navigate('/')}
              variant="default"
              className="w-full font-bold py-2.5 shadow-lg"
            >
              Return to Home
            </Button>
          </MagicCard>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-zinc-50 dark:bg-[#09090b] flex items-center justify-center p-4 transition-colors duration-300 overflow-hidden">
      <DotGrid />

      <div className="relative z-10 w-full max-w-2xl">
        
        {/* MISSING KEY ERROR */}
        {missingKey && !decryptedData && !error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full mx-auto"
          >
            <MagicCard className="bg-white/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 p-8 text-center backdrop-blur-md shadow-2xl">
              <ShieldOff className="w-12 h-12 text-yellow-500 mx-auto mb-4" strokeWidth={1.5} />
              <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-white mb-2 tracking-tight">Incomplete Link</h2>
              <p className="text-zinc-550 dark:text-zinc-400 mb-6 font-medium leading-relaxed">
                The decryption key is missing from this link. Make sure you copied the entire share URL including the part after the # symbol.
              </p>
              <Button
                onClick={() => navigate('/')}
                variant="default"
                className="w-full font-bold py-2.5 shadow-lg"
              >
                Return to Home
              </Button>
            </MagicCard>
          </motion.div>
        )}
        
        {/* LOCKED VIEW - Before Reveal */}
        {!decryptedData && !missingKey && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-lg mx-auto w-full"
          >
            <MagicCard className="bg-white/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 p-10 text-center backdrop-blur-md shadow-2xl">
              <FileLock className="w-14 h-14 text-zinc-400 dark:text-zinc-500 mx-auto mb-6 animate-pulse" strokeWidth={1} />
              <HyperText text="Restricted Access" className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-3" />
              <p className="text-zinc-550 dark:text-zinc-400 mb-8 max-w-md mx-auto font-medium leading-relaxed">
                This credential is encrypted. Revealing it will decrypt it on your device and permanently destroy the link from the server.
              </p>
              <Button
                onClick={handleViewSecret}
                disabled={loading}
                variant="destructive"
                size="lg"
                className="px-8 font-bold shadow-lg shadow-red-500/20"
              >
                Reveal Secret
              </Button>
            </MagicCard>
          </motion.div>
        )}

        {/* REVEALED VIEW - After Reveal */}
        {decryptedData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-5"
          >
            {/* Destruction Notice */}
            <motion.div
              initial={{ scale: 0.98 }}
              animate={{ scale: 1 }}
              className="bg-red-500/10 dark:bg-red-950/10 border border-red-200 dark:border-red-900/60 backdrop-blur-md rounded-xl p-4 flex items-center gap-3.5 shadow-lg"
            >
              <div className="p-1 bg-red-100 dark:bg-red-900/40 border border-red-500/20 rounded-lg flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-650 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-800 dark:text-red-300">Link Permanent Destruction</h4>
                <p className="text-xs text-red-700 dark:text-red-400 font-semibold mt-0.5">
                  The remote reference has been purged. Please copy this credential securely now before closing this page.
                </p>
              </div>
            </motion.div>

            {/* Data Card */}
            <MagicCard className="bg-white/80 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 backdrop-blur-md rounded-2xl shadow-2xl divide-y divide-zinc-200 dark:divide-zinc-800/85">
              
              {/* Title */}
              <div className="p-5.5">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555 mb-2">TITLE</div>
                <div className="font-mono text-lg font-bold text-zinc-900 dark:text-cyan-400">{decryptedData.title}</div>
              </div>

              {/* Organization */}
              {isValidOrganizationDisplay(decryptedData.organization) && (
                <div className="p-5.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555 mb-2">ORGANIZATION</div>
                  <div className="font-mono text-zinc-800 dark:text-zinc-350">{decryptedData.organization}</div>
                </div>
              )}

              {/* Username */}
              {decryptedData.username && (
                <div className="p-5.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">USERNAME</div>
                    <Button
                      onClick={() => copyToClipboard(decryptedData.username!, 'username')}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {copiedField === 'username' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-450 dark:text-zinc-500" />
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-zinc-900 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-900/50 p-2.5 rounded-xl select-all">{decryptedData.username}</div>
                </div>
              )}

              {/* Password */}
              {decryptedData.password && (
                <div className="p-5.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">PASSWORD</div>
                    <Button
                      onClick={() => copyToClipboard(decryptedData.password!, 'password')}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {copiedField === 'password' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-450 dark:text-zinc-500" />
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-zinc-900 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-900/50 p-2.5 rounded-xl select-all">{decryptedData.password}</div>
                </div>
              )}

              {/* Email */}
              {decryptedData.email && (
                <div className="p-5.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">EMAIL</div>
                    <Button
                      onClick={() => copyToClipboard(decryptedData.email!, 'email')}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {copiedField === 'email' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-450 dark:text-zinc-500" />
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-zinc-900 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-900/50 p-2.5 rounded-xl select-all">{decryptedData.email}</div>
                </div>
              )}

              {/* Notes */}
              {decryptedData.notes && (
                <div className="p-5.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">NOTES</div>
                    <Button
                      onClick={() => copyToClipboard(decryptedData.notes!, 'notes')}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {copiedField === 'notes' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-450 dark:text-zinc-500" />
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-sm text-zinc-900 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-900/50 p-3 rounded-xl whitespace-pre-wrap select-all leading-relaxed">{decryptedData.notes}</div>
                </div>
              )}

              {/* Recovery Codes */}
              {decryptedData.recovery_codes && (
                <div className="p-5.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555">RECOVERY CODES</div>
                    <Button
                      onClick={() => copyToClipboard(decryptedData.recovery_codes!, 'recovery_codes')}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                    >
                      {copiedField === 'recovery_codes' ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 text-zinc-450 dark:text-zinc-500" />
                      )}
                    </Button>
                  </div>
                  <div className="font-mono text-sm text-zinc-900 dark:text-zinc-200 bg-zinc-100/50 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-900/50 p-3 rounded-xl whitespace-pre-wrap select-all leading-relaxed">{decryptedData.recovery_codes}</div>
                </div>
              )}

              {/* Document */}
              {decryptedData.document_url && (
                <div className="p-5.5">
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-555 mb-2.5">DOCUMENT</div>
                  <a
                    href={decryptedData.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-5 py-2.5 bg-zinc-150 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 border border-zinc-250 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 rounded-xl transition-colors text-sm font-semibold tracking-wide"
                  >
                    Download Associated File
                  </a>
                </div>
              )}
            </MagicCard>

            {/* Return Button */}
            <Button
              onClick={() => navigate('/')}
              variant="default"
              size="lg"
              className="w-full font-bold shadow-lg"
            >
              Close Link
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SharedSecretPage;
