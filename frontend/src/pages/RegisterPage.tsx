import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { register, checkUsername } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { initializeUserEncryption, storeKeyData } from '../services/encryptionService';
import RecoveryKeyModal from '../components/RecoveryKeyModal';
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

const EmailIcon = () => (
    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
        className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 overflow-hidden shadow-[0_0_20px_rgba(16,185,129,0.15)] select-none"
    >
        <img src="/logo.png" alt={process.env.REACT_APP_PROJECT_NAME || 'AccountSafe'} className="w-14 h-14 object-contain" />
    </motion.div>
);

const CheckIcon = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
const XIcon = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;

const RegisterPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');

    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
    
    const [error, setError] = useState<string | null>(null);
    const [shakeTrigger, setShakeTrigger] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Recovery key modal
    const [showRecoveryModal, setShowRecoveryModal] = useState(false);
    const [recoveryKey, setRecoveryKey] = useState('');

    // Turnstile
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [widgetId, setWidgetId] = useState<string | null>(null);
    const turnstileRef = useRef<HTMLDivElement>(null);

    const { setToken } = useAuth();
    const navigate = useNavigate();

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
    
    useEffect(() => {
        if (!username) {
            setIsUsernameAvailable(null);
            return;
        }
        setIsCheckingUsername(true);
        const timerId = setTimeout(() => {
            checkUsername(username).then(data => {
                setIsUsernameAvailable(!data.exists);
                setIsCheckingUsername(false);
            });
        }, 500);
        return () => clearTimeout(timerId);
    }, [username]);

    useEffect(() => {
        const errors: string[] = [];
        if (password.length < 8) errors.push("At least 8 characters");
        if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
        if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
        if (!/[0-9]/.test(password)) errors.push("At least one number");
        if (!/[\W_]/.test(password)) errors.push("At least one special character");
        setPasswordErrors(errors);
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';
        if (siteKey && !turnstileToken) {
            setError('Please complete the verification challenge.');
            setShakeTrigger(true);
            return;
        }

        if (password !== password2) {
            setError('Passwords do not match');
            setShakeTrigger(true);
            return;
        }
        if (passwordErrors.length > 0) {
            setError('Please fix the errors in your password.');
            setShakeTrigger(true);
            return;
        }
        if (isUsernameAvailable === false) {
            setError('This username is already taken.');
            setShakeTrigger(true);
            return;
        }

        setIsLoading(true);
        try {
            const { recoveryKey: generatedRecoveryKey } = await initializeUserEncryption();
            const registerResponse = await register(username, email, password, password2, turnstileToken || undefined);
            const salt = registerResponse.salt;
            setSuccess('Account created successfully!');
            
            storeKeyData(salt, generatedRecoveryKey);
            
            const authToken = registerResponse.key || registerResponse.token;
            if (authToken) {
                setToken(authToken);
                setRecoveryKey(generatedRecoveryKey);
                setShowRecoveryModal(true);
            } else {
                setError('Registration succeeded but auto-login failed. Please log in manually.');
                setShakeTrigger(true);
            }
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { username?: string[]; email?: string[]; password?: string[]; error?: string } }; message?: string };
            if (axiosError.response?.data) {
                const errors = axiosError.response.data;
                const errorMessage = errors.username?.[0] || errors.email?.[0] || errors.password?.[0] || errors.error || 'Registration failed.';
                setError(errorMessage);
            } else {
                setError(axiosError.message || 'An unexpected error occurred.');
            }
            setShakeTrigger(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRecoveryKeyConfirm = () => {
        setShowRecoveryModal(false);
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

    const renderUsernameFeedback = () => {
        if (!username) return null;
        if (isCheckingUsername) {
            return (
                <p className="text-xs text-slate-500 mt-1.5 flex items-center">
                    <svg className="animate-spin h-3 w-3 mr-1.5 text-slate-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking availability...
                </p>
            );
        }
        if (isUsernameAvailable === true) return <p className="text-xs text-emerald-400 mt-1.5 flex items-center"><CheckIcon /><span className="ml-1">Username is available</span></p>;
        if (isUsernameAvailable === false) return <p className="text-xs text-rose-500 mt-1.5 flex items-center"><XIcon /><span className="ml-1">Username is already taken</span></p>;
        return null;
    };
    
    const renderPasswordFeedback = () => {
        if (!password) return null;
        const requirements = [
            { text: "8+ chars", valid: password.length >= 8 },
            { text: "Lowercase", valid: /[a-z]/.test(password) },
            { text: "Uppercase", valid: /[A-Z]/.test(password) },
            { text: "Number", valid: /[0-9]/.test(password) },
            { text: "Special char", valid: /[\W_]/.test(password) },
        ];

        return (
            <div className="mt-2 flex flex-wrap gap-1.5">
                {requirements.map(req => (
                    <span 
                        key={req.text} 
                        className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full ${
                            req.valid 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-slate-800/40 text-slate-500 border border-slate-700/50'
                        }`}
                    >
                        {req.valid ? <CheckIcon /> : <XIcon />}
                        <span className="ml-0.5 whitespace-nowrap">{req.text}</span>
                    </span>
                ))}
            </div>
        );
    };
    
    return (
        <AuroraBackground>
            <div className="w-full max-w-md px-4 py-8 z-10 flex flex-col items-center justify-center">
                {/* Logo and Title */}
                <div className="text-center mb-6 flex flex-col items-center">
                    <div className="mb-4">
                        <ShieldIcon />
                    </div>
                    <motion.h1 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white select-none"
                    >
                        Create an account
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="mt-1 text-sm text-slate-500 dark:text-slate-400 select-none"
                    >
                        Start securing your credentials today
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
                    {success && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="as-alert-success mb-6"
                        >
                            <CheckIcon />
                            <span className="ml-2">{success}</span>
                        </motion.div>
                    )}
                    
                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="as-alert-danger mb-6"
                        >
                            <XIcon />
                            <span className="ml-2">{error}</span>
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                                    placeholder="Choose a username"
                                    required
                                />
                            </div>
                            {renderUsernameFeedback()}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <EmailIcon />
                                </div>
                                <input
                                    type="email"
                                    id="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="as-input pl-11 h-11 md:h-12 bg-white/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 focus:border-indigo-500 dark:focus:border-indigo-400"
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Master Password
                            </label>
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
                                    placeholder="Create a master password"
                                    required
                                />
                            </div>
                            {renderPasswordFeedback()}
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                        >
                            <label htmlFor="password2" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Confirm Master Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <LockIcon />
                                </div>
                                <input
                                    type="password"
                                    id="password2"
                                    value={password2}
                                    onChange={(e) => setPassword2(e.target.value)}
                                    className="as-input pl-11 h-11 md:h-12 bg-white/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/80 focus:border-indigo-500 dark:focus:border-indigo-400"
                                    placeholder="Confirm your master password"
                                    required
                                />
                            </div>
                            {password2 && password !== password2 && (
                                <p className="text-xs text-rose-500 mt-1.5 flex items-center"><XIcon /><span className="ml-1">Passwords do not match</span></p>
                            )}
                        </motion.div>

                        {/* Cloudflare Turnstile */}
                        {process.env.REACT_APP_TURNSTILE_SITE_KEY && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.7 }}
                                className="flex justify-center py-2"
                            >
                                <div ref={turnstileRef} className="transform scale-90 sm:scale-100"></div>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 }}
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
                                        <span>Creating account...</span>
                                    </>
                                ) : (
                                    <span>Create account</span>
                                )}
                            </ShimmerButton>
                        </motion.div>
                    </form>

                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center select-none">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Already have an account?{' '}
                            <Link to="/login" className="text-indigo-500 hover:text-indigo-400 font-semibold transition-colors">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </motion.div>
                
                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-400/80 select-none">
                    Protected by end-to-end encryption
                </p>
            </div>

            {/* Recovery Key Modal */}
            <RecoveryKeyModal
                isOpen={showRecoveryModal}
                recoveryKey={recoveryKey}
                username={username}
                onConfirm={handleRecoveryKeyConfirm}
            />
        </AuroraBackground>
    );
};

export default RegisterPage;
