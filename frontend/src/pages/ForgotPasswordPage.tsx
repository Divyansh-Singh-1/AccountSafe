// src/pages/ForgotPasswordPage.tsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { requestPasswordResetOTP, verifyPasswordResetOTP, setNewPasswordWithOTP } from '../services/authService';
import { Input, Button, AuroraBackground } from '../components/ui';
import { KeyRound, Mail, Lock, ShieldCheck, ShieldAlert, ArrowLeft, RefreshCw, Timer } from 'lucide-react';

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

type Step = 'email' | 'otp' | 'password' | 'success';

const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  
  // Timer states
  const [otpExpiryTime, setOtpExpiryTime] = useState<number>(300); // 5 minutes in seconds
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  
  // Turnstile
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  
  const navigate = useNavigate();

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // OTP expiry countdown timer
  useEffect(() => {
    if (step !== 'otp' || otpExpiryTime <= 0) return;
    
    const timer = setInterval(() => {
      setOtpExpiryTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError('Verification code has expired. Please request a new one.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [step, otpExpiryTime]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Live password validation
  useEffect(() => {
    if (step !== 'password') return;
    const errors: string[] = [];
    if (password.length < 8) errors.push("At least 8 characters");
    if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
    if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
    if (!/[0-9]/.test(password)) errors.push("At least one number");
    if (!/[\W_]/.test(password)) errors.push("At least one special character");
    setPasswordErrors(errors);
  }, [password, step]);

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
    if (!siteKey || !turnstileRef.current || step !== 'email') return;

    const renderWidget = () => {
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.render(turnstileRef.current, {
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
      }
    };

    if (window.turnstile) {
      renderWidget();
      return undefined;
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          renderWidget();
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [step]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const siteKey = process.env.REACT_APP_TURNSTILE_SITE_KEY || '';
    if (siteKey && !turnstileToken) {
      setError('Please complete the verification challenge.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await requestPasswordResetOTP(email, turnstileToken || undefined);
      setMessage('A verification code has been sent to your email.');
      setOtpExpiryTime(response.expires_in || 300);
      setResendCooldown(60); // 60 second cooldown for resend
      setRemainingAttempts(null);
      setStep('otp');
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string; email?: string[]; retry_after?: number } } };
      const errorData = axiosError.response?.data;
      if (axiosError.response?.status === 429) {
        setError(errorData?.error || 'Please wait before requesting another code.');
        setResendCooldown(errorData?.retry_after || 60);
      } else if (axiosError.response?.status === 404) {
        setError(errorData?.error || 'No account found with this email address.');
      } else {
        setError(errorData?.error || errorData?.email?.[0] || 'Failed to send verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = useCallback(async () => {
    if (resendCooldown > 0 || isResending) return;
    
    setError(null);
    setMessage(null);
    setIsResending(true);
    
    try {
      const response = await requestPasswordResetOTP(email);
      setMessage('A new verification code has been sent to your email.');
      setOtpExpiryTime(response.expires_in || 300);
      setResendCooldown(60);
      setOtp(''); // Clear old OTP
      setRemainingAttempts(null);
    } catch (err: unknown) {
      const axiosError = err as { response?: { status?: number; data?: { error?: string; retry_after?: number } } };
      const errorData = axiosError.response?.data;
      if (axiosError.response?.status === 429) {
        setError(errorData?.error || 'Please wait before requesting another code.');
        setResendCooldown(errorData?.retry_after || 60);
      } else {
        setError(errorData?.error || 'Failed to resend code. Please try again.');
      }
    } finally {
      setIsResending(false);
    }
  }, [email, resendCooldown, isResending]);

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);
    try {
      await verifyPasswordResetOTP(email, otp);
      setMessage('Code verified! You can now set a new password.');
      setStep('password');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string; remaining_attempts?: number; code?: string } } };
      const errorData = axiosError.response?.data;
      
      if (errorData?.remaining_attempts !== undefined) {
        setRemainingAttempts(errorData.remaining_attempts);
      }
      
      switch (errorData?.code) {
        case 'OTP_EXPIRED':
          setError('Verification code has expired. Please request a new one.');
          setOtpExpiryTime(0);
          break;
        case 'MAX_ATTEMPTS_EXCEEDED':
          setError('Too many failed attempts. Please request a new verification code.');
          setOtpExpiryTime(0);
          break;
        case 'OTP_NOT_FOUND':
          setError('No verification code found. Please request a new one.');
          break;
        case 'OTP_ALREADY_USED':
          setError('This code has already been used. Please request a new one.');
          break;
        default:
          setError(errorData?.error || 'Invalid verification code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }
    if (passwordErrors.length > 0) {
      setError('Please fix the errors in your password.');
      return;
    }
    setIsLoading(true);
    try {
      await setNewPasswordWithOTP(email, otp, password);
      setMessage('Your password has been reset successfully!');
      setStep('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { error?: string; password?: string[]; code?: string } } };
      const errorData = axiosError.response?.data;
      
      switch (errorData?.code) {
        case 'OTP_EXPIRED':
          setError('Session expired. Please start the password reset process again.');
          break;
        case 'MAX_ATTEMPTS_EXCEEDED':
          setError('Too many failed attempts. Please start over.');
          break;
        default:
          setError(errorData?.error || errorData?.password?.[0] || 'Failed to reset password. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderPasswordFeedback = () => {
    if (!password) return null;
    const requirements = [
        { text: "At least 8 chars", valid: password.length >= 8 },
        { text: "Lowercase", valid: /[a-z]/.test(password) },
        { text: "Uppercase", valid: /[A-Z]/.test(password) },
        { text: "Number", valid: /[0-9]/.test(password) },
        { text: "Symbol", valid: /[\W_]/.test(password) },
    ];
    return (
        <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
            {requirements.map(req => (
                <span 
                    key={req.text} 
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition-all duration-200 ${
                        req.valid 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                            : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500 border-zinc-200 dark:border-zinc-800'
                    }`}
                >
                    <span className="w-1 h-1 rounded-full bg-current"></span>
                    <span className="whitespace-nowrap">{req.text}</span>
                </span>
            ))}
        </div>
    );
  };

  const stepIndicators = [
    { step: 'email', label: 'Email' },
    { step: 'otp', label: 'Verify' },
    { step: 'password', label: 'Reset' },
  ];

  return (
    <AuroraBackground>
      <div className="w-full max-w-md relative z-10 px-4">
        {/* Card */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-900 p-6 sm:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          
          {/* Top glowing ambient line */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 opacity-60" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 border border-cyan-500/20 shadow-inner">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Reset Password</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
              {step === 'email' && 'Enter your verified account email to request an OTP code'}
              {step === 'otp' && 'Enter the 6-digit secure code sent to your inbox'}
              {step === 'password' && 'Choose a strong, resilient master password'}
              {step === 'success' && 'Master password successfully updated!'}
            </p>
          </div>

          {/* Step Indicators */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-1 mb-6">
              {stepIndicators.map((s, i) => {
                const currentStepIndex = stepIndicators.findIndex(x => x.step === step);
                const isCurrent = step === s.step;
                const isPassed = currentStepIndex > i;

                return (
                  <React.Fragment key={s.step}>
                    <div className={`flex items-center gap-1.5 transition-colors duration-300 ${
                      isCurrent ? 'text-cyan-500 dark:text-cyan-400' : 
                      isPassed ? 'text-emerald-500' : 'text-zinc-400 dark:text-zinc-600'
                    }`}>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-semibold border transition-all duration-300 ${
                        isCurrent ? 'bg-cyan-500/20 border-cyan-500 text-cyan-600 dark:text-cyan-400 shadow-md shadow-cyan-500/10' : 
                        isPassed ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-zinc-100 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-500'
                      }`}>
                        {isPassed ? <span className="text-[10px]">✓</span> : i + 1}
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:inline">{s.label}</span>
                    </div>
                    {i < stepIndicators.length - 1 && (
                      <div className={`w-8 h-[2px] rounded-full mx-1 transition-all duration-500 ${
                        isPassed ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'
                      }`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Feedback Messages */}
          {message && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs mb-4 font-medium">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 rounded-xl text-xs mb-4 font-medium animate-bounce">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Email Step */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input 
                type="email" 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                leftIcon={<Mail className="w-4 h-4" />} 
                placeholder="you@example.com"
                label="Email Address"
                required 
              />
              
              {/* Cloudflare Turnstile */}
              {process.env.REACT_APP_TURNSTILE_SITE_KEY && (
                <div className="flex justify-center py-2">
                  <div ref={turnstileRef} className="transform scale-90 sm:scale-95"></div>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full"
                isLoading={isLoading}
                disabled={!!process.env.REACT_APP_TURNSTILE_SITE_KEY && !turnstileToken}
              >
                Send Reset Code
              </Button>
            </form>
          )}

          {/* OTP Step */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              {/* OTP Expiry Timer */}
              <div className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold ${
                otpExpiryTime > 60 ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400' : 
                otpExpiryTime > 0 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400 animate-pulse' : 'bg-red-500/10 border-red-500/20 text-red-500'
              }`}>
                <Timer className="w-4 h-4" />
                <span>
                  {otpExpiryTime > 0 
                    ? `OTP Code expires in: ${formatTime(otpExpiryTime)}`
                    : 'OTP Code expired'
                  }
                </span>
              </div>
              
              <div>
                <Input 
                  type="text" 
                  id="otp" 
                  value={otp} 
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  className="tracking-[0.4em] font-mono text-center text-base" 
                  maxLength={6} 
                  placeholder="000000"
                  label="Verification Code"
                  required 
                  disabled={otpExpiryTime === 0}
                />
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-500">Sent code to: {email}</p>
                  {remainingAttempts !== null && remainingAttempts > 0 && (
                    <p className="text-[10px] font-bold text-yellow-500 dark:text-yellow-400">{remainingAttempts} attempts remaining</p>
                  )}
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full"
                isLoading={isLoading}
                disabled={otpExpiryTime === 0 || otp.length !== 6} 
              >
                Verify Code
              </Button>
              
              {/* Resend OTP Button */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isResending}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    resendCooldown > 0 || isResending
                      ? 'text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                      : 'text-cyan-500 hover:text-cyan-600 dark:text-cyan-400 dark:hover:text-cyan-300'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                  {isResending ? (
                    'Sending...'
                  ) : resendCooldown > 0 ? (
                    `Retry in ${resendCooldown}s`
                  ) : (
                    "Resend OTP"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Password Step */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} noValidate className="space-y-4">
              <Input 
                type="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                leftIcon={<Lock className="w-4 h-4" />} 
                placeholder="Create new master password"
                label="New Password"
                required 
              />
              {renderPasswordFeedback()}
              
              <Input 
                type="password" 
                id="password2" 
                value={password2} 
                onChange={(e) => setPassword2(e.target.value)} 
                leftIcon={<Lock className="w-4 h-4" />} 
                placeholder="Confirm new master password"
                label="Confirm Password"
                required 
              />
              
              <Button 
                type="submit" 
                className="w-full"
                isLoading={isLoading}
                disabled={passwordErrors.length > 0} 
              >
                Reset Password
              </Button>
            </form>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-500">
                <ShieldCheck className="w-7 h-7 animate-bounce" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">Security Key Updated</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Redirecting to Vault Auth...</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
};

export default ForgotPasswordPage;
