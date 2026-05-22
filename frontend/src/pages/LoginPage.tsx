import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { login } from '../services/authService';
import { logger } from '../utils/logger';
import { getPinStatus } from '../services/pinService';
import { useAuth } from '../contexts/AuthContext';
import { useCrypto } from '../services/CryptoContext';
import { storeKeyData } from '../services/encryptionService';
import PinSetupModal from '../components/PinSetupModal';
import { AuroraBackground, ShimmerButton } from '../components/ui';

// Cloudflare Turnstile
interface TurnstileInstance {
    render: (element: HTMLElement, options: Record<string, unknown>) => string;
    remove: (widgetId: string) => void;
    reset: (widgetId: string) => void;
}

declare global {
    interface Window {
        turnstile: TurnstileInstance | undefined;
    }
}

// Icons
const UserIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const LockIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const ShieldIcon = () => (
    <motion.div 
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.15)]"
    >
        <img src="/logo.png" alt="AccountSafe" className="w-14 h-14 object-contain" />
    </motion.div>
);

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [shakeTrigger, setShakeTrigger] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showPinSetup, setShowPinSetup] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [widgetId, setWidgetId] = useState<string | null>(null);
    const turnstileRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { setToken } = useAuth();
    const { unlock } = useCrypto();
    const location = useLocation();
    const message = location.state?.message;

    // Load Cloudflare Turnstile script
    useEffect(() => {
        const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';
        if (!siteKey) return;

        const script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        return () => {
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    // Render Turnstile widget
    useEffect(() => {
        const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';
        if (!siteKey || !turnstileRef.current || widgetId) return;

        const renderWidget = () => {
            if (window.turnstile && turnstileRef.current && !widgetId) {
                const id = window.turnstile.render(turnstileRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => {
                        setTurnstileToken(token);
                    },
                    'error-callback': () => {
                        setTurnstileToken(null);
                    },
                    theme: 'dark',
                    size: 'normal',
                });
                setWidgetId(id);
            }
        };

        if (window.turnstile) {
            renderWidget();
        } else {
            const interval = setInterval(() => {
                if (window.turnstile) {
                    renderWidget();
                    clearInterval(interval);
                }
            }, 100);

            return () => clearInterval(interval);
        }

        return () => {
            if (widgetId && window.turnstile) {
                window.turnstile.remove(widgetId);
            }
        };
    }, [widgetId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';
        if (siteKey && !turnstileToken) {
            setError('Please complete the verification challenge.');
            setShakeTrigger(true);
            return;
        }

        setIsLoading(true);
        try {
            const data = await login(username, password, turnstileToken || undefined);
            setToken(data.key);
            
            const salt = data.salt;
            if (salt) {
                storeKeyData(salt);
                localStorage.setItem(`encryption_salt_${username}`, salt);
                const unlockResult = await unlock(password, salt);
                if (!unlockResult.success) {
                    console.error('Failed to unlock vault:', unlockResult.error);
                    setError(unlockResult.error || 'Failed to unlock vault. Please try again.');
                    setShakeTrigger(true);
                    setIsLoading(false);
                    return;
                }
                logger.log('✅ Vault unlocked successfully after login');
            } else {
                setError('No encryption salt found. Please contact support.');
                setShakeTrigger(true);
                setIsLoading(false);
                return;
            }
            
            try {
                const pinStatus = await getPinStatus();
                if (!pinStatus.has_pin) {
                    setShowPinSetup(true);
                } else {
                    navigate('/', { replace: true });
                }
            } catch {
                navigate('/', { replace: true });
            }
        } catch (err) {
            setError('Failed to log in. Please check your username and password.');
            setShakeTrigger(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinSetupSuccess = () => {
        setShowPinSetup(false);
        navigate('/', { replace: true });
    };

    // Reset shake trigger after animation finishes
    useEffect(() => {
        if (shakeTrigger) {
            const timer = setTimeout(() => setShakeTrigger(false), 450);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [shakeTrigger]);
    
    return (
        <AuroraBackground>
            <div className="w-full max-w-md px-4 py-8 z-10 flex flex-col items-center justify-center">
                {/* Logo and Title */}
                <div className="text-center mb-6 flex flex-col items-center select-none">
                    <div className="mb-4">
                        <ShieldIcon />
                    </div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
                    >
                        Welcome back
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-1 text-sm text-slate-500 dark:text-slate-400"
                    >
                        Sign in to your {process.env.REACT_APP_PROJECT_NAME || 'AccountSafe'} vault
                    </motion.p>
                </div>

                {/* Card with Spring shake on error */}
                <motion.div 
                    initial={{ opacity: 0, y: 25, scale: 0.98 }}
                    animate={{ 
                        opacity: 1, 
                        y: 0, 
                        scale: 1,
                        x: shakeTrigger ? [0, -8, 8, -8, 8, -6, 6, 0] : 0
                    }}
                    transition={{ 
                        type: shakeTrigger ? "tween" : "spring", 
                        stiffness: 100, 
                        damping: 15,
                        duration: shakeTrigger ? 0.45 : undefined
                    }}
                    className="w-full bg-white/70 dark:bg-slate-900/40 backdrop-blur-lg border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-xl dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-6 sm:p-8"
                >
                    {message && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="as-alert-success mb-6"
                        >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{message}</span>
                        </motion.div>
                    )}
                    
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="as-alert-danger mb-6"
                        >
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{error}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <UserIcon />
                                </div>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="as-input pl-11 h-11 md:h-12 bg-white/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 focus:border-indigo-500 dark:focus:border-indigo-400"
                                    placeholder="Enter your username"
                                    required
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="flex justify-between items-center mb-1.5">
                                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                                <Link to="/forgot-password" className="text-sm text-indigo-500 hover:text-indigo-400 transition-colors font-medium">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <LockIcon />
                                </div>
                                <input
                                    type="password"
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="as-input pl-11 h-11 md:h-12 bg-white/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 focus:border-indigo-500 dark:focus:border-indigo-400"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </motion.div>

                        {/* Cloudflare Turnstile */}
                        {process.env.REACT_APP_TURNSTILE_SITE_KEY && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="flex justify-center py-2"
                            >
                                <div ref={turnstileRef} className="transform scale-90 sm:scale-100"></div>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <ShimmerButton
                                type="submit"
                                disabled={isLoading || (!!process.env.REACT_APP_TURNSTILE_SITE_KEY && !turnstileToken)}
                                className="w-full py-3 mt-2 flex items-center justify-center gap-2 h-11 md:h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <span>Sign in</span>
                                )}
                            </ShimmerButton>
                        </motion.div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center select-none">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-indigo-500 hover:text-indigo-400 font-semibold transition-colors">
                                Create one
                            </Link>
                        </p>
                    </div>
                </motion.div>
                
                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-400/80 select-none">
                    Protected by end-to-end encryption
                </p>
            </div>

            {/* PIN Setup Modal */}
            <PinSetupModal
                isOpen={showPinSetup}
                onClose={() => {
                    setShowPinSetup(false);
                    navigate('/', { replace: true });
                }}
                onSuccess={handlePinSetupSuccess}
            />
        </AuroraBackground>
    );
};

export default LoginPage;
