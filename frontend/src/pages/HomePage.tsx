import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CategoryManager } from '../features/vault/components';
import { AuroraBackground, HyperText, ShimmerButton } from '../components/ui';

const HomePage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white dark:bg-[#09090b]">
      {token ? (
        <CategoryManager />
      ) : (
        <AuroraBackground>
          <div className="flex items-start sm:items-center justify-center min-h-screen px-4 py-8 pt-8 sm:pt-0 z-10 w-full">
            <div className="text-center max-w-2xl mx-auto">
              {/* Hero Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-6 sm:mb-8 flex items-center justify-center">
                <div className="p-2 sm:p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg sm:rounded-xl border border-emerald-200 dark:border-emerald-500/20 overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <img src="/logo.png" alt="AccountSafe" className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
                </div>
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-zinc-900 dark:text-white mb-4 sm:mb-6 px-4 flex flex-wrap justify-center items-center gap-x-3">
                <span>Welcome to</span>
                <HyperText text={process.env.REACT_APP_PROJECT_NAME || 'AccountSafe'} className="text-indigo-600 dark:text-indigo-400 font-extrabold" />
              </h1>
              
              <p className="text-sm sm:text-base md:text-lg text-zinc-650 dark:text-zinc-400 mb-8 sm:mb-10 max-w-xl mx-auto px-4 leading-relaxed">
                Protected by AES-256-GCM authenticated encryption with Argon2id key derivation. Our zero-knowledge architecture ensures your data is encrypted securely at rest.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center px-4 items-center">
                <ShimmerButton 
                  onClick={() => navigate('/login')}
                  className="px-8 py-3 text-sm font-semibold rounded-xl w-full sm:w-auto h-12"
                >
                  Log in to your vault
                </ShimmerButton>
                
                <Link 
                  to="/register" 
                  className="px-8 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 bg-white/40 dark:bg-slate-900/40 border border-zinc-250 dark:border-slate-800 rounded-xl hover:bg-white/60 dark:hover:bg-slate-900/60 hover:border-zinc-300 dark:hover:border-slate-700 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 shadow-md backdrop-blur-md w-full sm:w-auto h-12 flex items-center justify-center"
                >
                  Create free account
                </Link>
              </div>
              
              {/* Trust indicators */}
              <div className="mt-12 sm:mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-zinc-600 dark:text-zinc-550 px-4">
                <div className="flex items-center gap-2 font-medium bg-white/30 dark:bg-white/5 px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 backdrop-blur-sm shadow-sm">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Zero-Knowledge Architecture
                </div>
                <div className="flex items-center gap-2 font-medium bg-white/30 dark:bg-white/5 px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 backdrop-blur-sm shadow-sm">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  AES-256-GCM Encryption
                </div>
                <div className="flex items-center gap-2 font-medium bg-white/30 dark:bg-white/5 px-3 py-1.5 rounded-full border border-white/20 dark:border-white/5 backdrop-blur-sm shadow-sm">
                  <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Hacker-Proof Decentralized Keys
                </div>
              </div>
            </div>
          </div>
        </AuroraBackground>
      )}
    </div>
  );
};

export default HomePage;
