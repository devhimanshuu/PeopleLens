'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Database, Lock, Mail, User, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { signInWithEmail, signUpWithEmail, type NeonSession } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Logo } from '../landing/logo';

export type AuthModalMode = 'signin' | 'signup';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: NeonSession) => void;
  /** Which form to show first. "Request Demo" opens in signup mode. */
  mode?: AuthModalMode;
}

export function AuthModal({ isOpen, onClose, onSuccess, mode = 'signin' }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(mode === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Follow the requested mode (Request Demo → create-account form).
  useEffect(() => {
    setIsSignUp(mode === 'signup');
  }, [mode]);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = isSignUp
        ? await signUpWithEmail(email, password, name)
        : await signInWithEmail(email, password);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.session) {
        onSuccess(res.session);
        onClose();
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'An unexpected authentication error occurred.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl shadow-indigo-500/10 sm:p-8"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-5" />
            </button>

            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <Logo size="lg" />

              <div className="mt-4 flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-600 dark:text-indigo-300">
                <Database className="size-3 text-cyan-500 dark:text-cyan-400" />
                <span>Protected by Neon Auth &amp; Postgres RLS</span>
              </div>

              <h3 id="auth-modal-title" className="mt-5 text-xl font-bold tracking-tight">
                {isSignUp ? 'Create your Enterprise Account' : 'Sign in to PeopleLens'}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {isSignUp
                  ? 'Access real-time predictive workforce intelligence.'
                  : 'Enter your credentials to access your organization workspace.'}
              </p>
            </div>

            {errorMsg ? (
              <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {errorMsg}
              </div>
            ) : null}

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
              {isSignUp ? (
                <div>
                  <label htmlFor="auth-name" className="mb-1.5 block text-xs font-medium">
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-3 size-4 text-muted-foreground"
                      aria-hidden
                    />
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full rounded-lg border border-input bg-muted/50 py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground/70 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-xs font-medium">
                  Work Email
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3 size-4 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="leader@company.com"
                    className="w-full rounded-lg border border-input bg-muted/50 py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground/70 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-xs font-medium">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 size-4 text-muted-foreground"
                    aria-hidden
                  />
                  <input
                    id="auth-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-input bg-muted/50 py-2.5 pl-9 pr-4 text-sm placeholder:text-muted-foreground/70 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="mt-2 w-full justify-center font-semibold"
              >
                {loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In'}
              </Button>
            </form>

            {/* Footer Mode Switcher */}
            <div className="mt-6 border-t border-border/60 pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                {isSignUp ? 'Already have an enterprise workspace?' : "Don't have an account yet?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setErrorMsg(null);
                  }}
                  className="font-medium text-indigo-600 underline underline-offset-2 transition-colors hover:text-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200"
                >
                  {isSignUp ? 'Sign in' : 'Create an account'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
