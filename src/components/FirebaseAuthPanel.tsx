import React, { useState, useEffect } from 'react';
import {
  loginWithGoogle,
  getUserProfile,
  getAccountRequest,
  submitAccountRequest,
  ensureUserProfile,
} from '../services/firebaseInventory';
import { StudentLoginRequest } from './StudentLoginRequest';
import type { AccountRequestStatus } from '../types/inventory';
import { Link } from 'react-router-dom';
import { signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { UserCheck, ArrowRight, X } from 'lucide-react';

interface FirebaseAuthPanelProps {
  accessNotice?: {
    status: AccountRequestStatus;
    name?: string;
    email?: string;
  } | null;
  pendingNewUser?: FirebaseUser | null;
  onClearPendingNewUser?: () => void;
}

export const FirebaseAuthPanel: React.FC<FirebaseAuthPanelProps> = ({
  accessNotice,
  pendingNewUser,
  onClearPendingNewUser,
}) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsNameUser, setNeedsNameUser] = useState<FirebaseUser | null>(pendingNewUser ?? null);
  const [fullName, setFullName] = useState('');
  const [currentNotice, setCurrentNotice] = useState(accessNotice);

  useEffect(() => {
    if (pendingNewUser) {
      setNeedsNameUser(pendingNewUser);
      setFullName(pendingNewUser.displayName || '');
    }
  }, [pendingNewUser]);

  useEffect(() => {
    setCurrentNotice(accessNotice);
  }, [accessNotice]);

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const firebaseUser = await loginWithGoogle(false);

      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      // Check if user already exists in Firestore database
      const existingProfile = await getUserProfile(firebaseUser.uid);
      if (existingProfile) {
        // User already in DB! Session will be loaded automatically by auth observer
        setSuccess(`Welcome back, ${existingProfile.name}!`);
        setLoading(false);
        return;
      }

      // User not in DB — check if they already have an existing access request
      const existingRequest = await getAccountRequest(firebaseUser.uid);
      if (existingRequest) {
        if (existingRequest.status === 'APPROVED') {
          // Request is already approved! Profile will be created automatically
          setSuccess('Account approved! Logging you into the laboratory portal...');
          setLoading(false);
          return;
        }

        // Show pending or rejected status notice
        setCurrentNotice({
          status: existingRequest.status,
          name: existingRequest.name,
          email: existingRequest.email,
        });
        await signOut(auth);
        setLoading(false);
        return;
      }

      // User is completely new and not in the DB — prompt for their name!
      setNeedsNameUser(firebaseUser);
      setFullName(firebaseUser.displayName || '');
      setLoading(false);
    } catch (err: any) {
      console.error('Google authentication error:', err);
      let message = err?.message || 'Google sign-in failed. Please try again.';

      if (err?.code === 'permission-denied' || err?.code === 'firestore/permission-denied') {
        message = 'Firestore access denied. Please check project rules and permissions.';
      }

      setError(message);
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!needsNameUser) return;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError('Please enter your full name before continuing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Submit registration with the provided name
      const request = await submitAccountRequest(needsNameUser, trimmedName);

      if (request.status === 'APPROVED') {
        // Auto-approved! Create profile and proceed
        await ensureUserProfile(needsNameUser, 'STUDENT', trimmedName);
        setSuccess(`Welcome to AICTE IDEA Lab, ${trimmedName}!`);
        setNeedsNameUser(null);
      } else {
        // Request submitted and awaiting admin approval
        setCurrentNotice({
          status: request.status,
          name: request.name,
          email: request.email,
        });
        setSuccess('Your registration has been submitted. An administrator will review your account.');
        setNeedsNameUser(null);
        await signOut(auth);
      }

      if (onClearPendingNewUser) {
        onClearPendingNewUser();
      }
    } catch (err: any) {
      console.error('Failed to submit user name:', err);
      setError(err?.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelNamePrompt = async () => {
    setNeedsNameUser(null);
    setFullName('');
    setError('');
    if (onClearPendingNewUser) {
      onClearPendingNewUser();
    }
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen w-full idea-bg flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-[420px]">
        <div className="idea-card bg-white border border-[var(--color-idea-border)] rounded-2xl shadow-xl overflow-hidden">
          <div className="idea-accent-bar" />

          <div className="p-7 sm:p-9">
            {/* Logo and Brand */}
            <div className="text-center">
              <img src="/logo.png" alt="AICTE IDEA Lab" className="h-20 sm:h-24 w-auto mx-auto object-contain" />

              <div className="mt-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-idea-blue)]">
                  AICTE IDEA LAB
                </span>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--color-idea-text)]">
                  {needsNameUser ? 'Confirm Your Name' : 'Portal Login'}
                </h1>

                <p className="mt-1.5 text-xs text-[var(--color-idea-muted)] leading-relaxed">
                  {needsNameUser
                    ? 'We noticed this is your first time signing in. Please enter your name to complete registration.'
                    : 'Sign in with your Google account to access laboratory inventory and equipment.'}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 font-medium leading-relaxed"
              >
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div
                role="status"
                aria-live="polite"
                className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800 font-medium leading-relaxed"
              >
                {success}
              </div>
            )}

            {/* Status Notice (e.g. pending approval or rejected) */}
            {currentNotice && (
              <StudentLoginRequest
                status={currentNotice.status}
                name={currentNotice.name}
                email={currentNotice.email}
              />
            )}

            {/* Form Section */}
            <div className="mt-7">
              {needsNameUser ? (
                /* Step: Ask for Name if user is not in the db */
                <form onSubmit={handleNameSubmit} className="space-y-4">
                  <div className="rounded-xl bg-[var(--color-idea-light-grey)]/80 border border-[var(--color-idea-border)] p-3 text-left">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-idea-muted)]">
                      Google Account
                    </p>
                    <p className="text-xs font-bold text-[var(--color-idea-text)] truncate mt-0.5">
                      {needsNameUser.email}
                    </p>
                  </div>

                  <div className="text-left">
                    <label
                      htmlFor="student-full-name"
                      className="block text-xs font-bold text-[var(--color-idea-text)] mb-1.5"
                    >
                      Your Full Name <span className="text-red-500">*</span>
                    </label>

                    <input
                      id="student-full-name"
                      type="text"
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      autoComplete="name"
                      disabled={loading}
                      required
                      className="idea-input w-full px-3.5 py-2.5 text-xs sm:text-sm"
                    />
                    <p className="text-[10px] text-[var(--color-idea-muted)] mt-1">
                      This name will be displayed on your equipment requests and custody records.
                    </p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelNamePrompt}
                      disabled={loading}
                      className="flex-1 py-2.5 px-3 border border-[var(--color-idea-border)] text-[var(--color-idea-text)] text-xs font-semibold rounded-xl hover:bg-[var(--color-idea-light-grey)] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !fullName.trim()}
                      className="flex-1 py-2.5 px-3 idea-button flex items-center justify-center gap-2 text-xs font-semibold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Saving…</span>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* Primary Login Button: Continue with Google */
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-12 rounded-xl border border-[var(--color-idea-border)] bg-white text-[var(--color-idea-text)] text-xs sm:text-sm font-semibold transition-all hover:bg-[var(--color-idea-light-grey)] hover:border-[#b9c9d1] shadow-xs disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className={`w-5 h-5 shrink-0 ${loading ? 'animate-pulse' : ''}`} viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M21.35 12.23c0-.79-.07-1.55-.23-2.23H12v4.22h5.25a4.49 4.49 0 01-1.95 2.95v2.45h3.15c1.84-1.7 2.9-4.2 2.9-7.39z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.15-2.45c-.87.58-1.98.93-3.3.93-2.54 0-4.69-1.72-5.46-4.03H3.28v2.53A9.74 9.74 0 0012 21.5z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.54 13.6A5.86 5.86 0 016.23 12c0-.56.11-1.1.31-1.6V7.87H3.28A9.74 9.74 0 002.5 12c0 1.57.38 3.06 1.05 4.13l2.99-2.53z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 6.37c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.84 3.46 14.63 2.5 12 2.5a9.74 9.74 0 00-8.72 5.37l3.26 2.53C7.31 8.09 9.46 6.37 12 6.37z"
                    />
                  </svg>

                  <span>{loading ? 'Authenticating with Google…' : 'Log in with Google'}</span>
                </button>
              )}

              {!needsNameUser && (
                <p className="mt-4 text-center text-[11px] text-[var(--color-idea-muted)] leading-relaxed">
                  First time? Sign in with your Google account and you will be prompted for your name to set up your
                  profile.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Unified Legal and Institutional Footer */}
        <p className="mt-5 text-center text-xs text-[var(--color-idea-muted)]">
          AICTE IDEA Lab Inventory Management System
        </p>

        <p className="mt-2 text-center text-[11px] leading-5 text-[var(--color-idea-muted)]">
          By signing in, you agree to the{' '}
          <Link
            to="/terms"
            className="font-semibold text-[var(--color-idea-deep-blue)] hover:text-[var(--color-idea-blue)]"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link
            to="/privacy"
            className="font-semibold text-[var(--color-idea-deep-blue)] hover:text-[var(--color-idea-blue)]"
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};
