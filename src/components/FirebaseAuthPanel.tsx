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
import { ArrowRight } from 'lucide-react';

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

  // The status card already says "submitted / waiting", so a second banner would repeat it.
  const showSuccess = Boolean(success) && !currentNotice;

  return (
    <div className="w-full max-w-[440px] mx-auto py-2">
      <div className="idea-card bg-white border border-[var(--color-idea-border)] rounded-3xl shadow-[0_20px_60px_-20px_rgba(15,40,60,0.25)] overflow-hidden">
          <div className="idea-accent-bar" />

          <div className="px-6 pt-8 pb-7 sm:px-10 sm:pt-10 sm:pb-9">
            {/* Brand and heading */}
            <div className="text-center">
              <img src="/logo.png" alt="AICTE IDEA Lab" className="mx-auto h-16 w-auto object-contain sm:h-20" />

              <h1 className="mt-6 text-[26px] font-semibold leading-tight tracking-tight text-[var(--color-idea-text)] sm:text-[28px]">
                {needsNameUser ? 'What should we call you?' : 'Sign in'}
              </h1>

              <p className="mx-auto mt-2 max-w-[32ch] text-[15px] leading-relaxed text-[var(--color-idea-muted)]">
                {needsNameUser
                  ? 'Add your name to finish setting up your account.'
                  : 'Use your Google account to open the lab inventory.'}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-6 rounded-2xl bg-red-50 px-4 py-3 text-left text-[14px] font-medium leading-relaxed text-red-800 ring-1 ring-inset ring-red-200/80"
              >
                {error}
              </div>
            )}

            {/* Success */}
            {showSuccess && (
              <div
                role="status"
                aria-live="polite"
                className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-left text-[14px] font-medium leading-relaxed text-emerald-900 ring-1 ring-inset ring-emerald-200/80"
              >
                {success}
              </div>
            )}

            {/* Pending / declined */}
            {currentNotice && (
              <StudentLoginRequest
                status={currentNotice.status}
                name={currentNotice.name}
                email={currentNotice.email}
              />
            )}

            {/* Actions */}
            <div className="mt-8">
              {needsNameUser ? (
                <form onSubmit={handleNameSubmit} className="space-y-5" noValidate>
                  {/* Signed-in account */}
                  <div className="rounded-2xl bg-[var(--color-idea-light-grey)]/70 px-4 py-3 text-left">
                    <p className="text-[13px] text-[var(--color-idea-muted)]">Signed in as</p>
                    <p className="mt-0.5 truncate text-[15px] font-medium text-[var(--color-idea-text)]">
                      {needsNameUser.email}
                    </p>
                  </div>

                  <div className="text-left">
                    <label
                      htmlFor="student-full-name"
                      className="mb-2 block text-[14px] font-medium text-[var(--color-idea-text)]"
                    >
                      Full name
                    </label>

                    <input
                      id="student-full-name"
                      type="text"
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Rahul Sharma"
                      autoComplete="name"
                      autoCapitalize="words"
                      enterKeyHint="go"
                      disabled={loading}
                      required
                      aria-describedby="student-full-name-hint"
                      className="idea-input h-12 w-full px-4 !text-[16px]"
                    />
                    <p
                      id="student-full-name-hint"
                      className="mt-2 text-[13px] leading-relaxed text-[var(--color-idea-muted)]"
                    >
                      Shown on your equipment requests and custody records.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleCancelNamePrompt}
                      disabled={loading}
                      className="h-12 flex-1 cursor-pointer rounded-xl border border-[var(--color-idea-border)] bg-white px-4 text-[15px] font-medium text-[var(--color-idea-text)] transition active:scale-[0.99] hover:bg-[var(--color-idea-light-grey)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-idea-blue)]"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={loading || !fullName.trim()}
                      className="idea-button flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Saving…</span>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    aria-busy={loading}
                    className="flex h-12 w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-[var(--color-idea-border)] bg-white px-4 text-[15px] font-medium text-[var(--color-idea-text)] shadow-sm transition active:scale-[0.99] hover:bg-[var(--color-idea-light-grey)] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-idea-blue)]"
                  >
                    <svg
                      className={`h-5 w-5 shrink-0 ${loading ? 'animate-pulse' : ''}`}
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
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

                    <span>{loading ? 'Signing in…' : 'Continue with Google'}</span>
                  </button>

                  <p className="mt-4 text-center text-[13px] leading-relaxed text-[var(--color-idea-muted)]">
                    New here? We will ask for your name after you sign in.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 px-2 text-center">
          <p className="text-[13px] text-[var(--color-idea-muted)]">AICTE IDEA Lab Inventory Management System</p>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-idea-muted)]">
            By signing in, you agree to the{' '}
            <Link
              to="/terms"
              className="font-medium text-[var(--color-idea-deep-blue)] underline-offset-2 hover:text-[var(--color-idea-blue)] hover:underline"
            >
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              to="/privacy"
              className="font-medium text-[var(--color-idea-deep-blue)] underline-offset-2 hover:text-[var(--color-idea-blue)] hover:underline"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    );
};
