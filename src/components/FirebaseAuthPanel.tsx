import React, { useState } from 'react';
import { loginWithGoogle, submitAccountRequest } from '../services/firebaseInventory';
import { StudentLoginRequest } from './StudentLoginRequest';
import type { AccountRequestStatus } from '../types/inventory';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

interface FirebaseAuthPanelProps {
  accessNotice?: {
    status: AccountRequestStatus;
    name?: string;
    email?: string;
  } | null;
}

export const FirebaseAuthPanel: React.FC<FirebaseAuthPanelProps> = ({ accessNotice }) => {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');

  const handleGoogleLogin = async () => {
    setError('');
    setSuccess('');

    if (authMode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name before continuing.');
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'signup') {
        const signupName = fullName.trim();

        /*
         * Signup must use popup mode.
         * We need the Firebase user immediately so we can
         * create account_requests/{uid}.
         */
        const firebaseUser = await loginWithGoogle(false);

        if (!firebaseUser) {
          setError('Google sign-up could not be completed. Please try again.');
          return;
        }

        /*
         * Create the student access request.
         *
         * If the request already exists, submitAccountRequest()
         * simply returns the existing request.
         */
        const request = await submitAccountRequest(firebaseUser, signupName);

        /*
         * A student should not remain authenticated while
         * waiting for admin approval.
         */
        await signOut(auth);

        setFullName('');

        if (request.status === 'APPROVED') {
          setAuthMode('login');
          setSuccess('Your account is already approved. You can now log in with Google.');
        } else if (request.status === 'REJECTED') {
          setError('Your previous access request was rejected. Please contact the lab administrator.');
        } else {
          setAuthMode('login');
          setSuccess('Your access request has been submitted. Please wait for admin approval before logging in.');
        }

        return;
      }

      /*
       * Normal login.
       *
       * Redirect fallback is allowed for login.
       */
      await loginWithGoogle(true);
    } catch (err: any) {
      console.error('Google authentication error:', err);

      let message = err?.message || 'Google sign-in failed. Please try again.';

      /*
       * Give a cleaner message for common Firestore permission errors.
       */
      if (err?.code === 'permission-denied' || err?.code === 'firestore/permission-denied') {
        message =
          'Your request could not be saved because Firestore denied access. Please check the Firestore security rules.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const switchAuthMode = () => {
    setAuthMode(authMode === 'signup' ? 'login' : 'signup');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen w-full bg-idea-background flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-[400px]">
        <div className="bg-white border border-idea-border rounded-2xl shadow-[0_20px_70px_rgba(11,76,163,0.09)] overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-idea-blue via-idea-deep-blue to-idea-green" />

          <div className="p-7 sm:p-9">
            <div className="text-center">
              <img src="/logo.png" alt="AICTE IDEA Lab" className="h-24 sm:h-28 w-auto mx-auto object-contain" />

              <div className="mt-6">
                <h1 className="text-2xl sm:text-[27px] font-bold tracking-tight text-idea-text">Welcome</h1>

                <p className="mt-2 text-sm text-idea-muted">
                  {authMode === 'signup'
                    ? 'Create your student access request'
                    : 'Sign in to access the AICTE IDEA Lab'}
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="mt-6 rounded-xl border border-idea-red/20 bg-idea-red/5 px-3.5 py-3 text-sm text-[#c9151d]"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                aria-live="polite"
                className="mt-6 rounded-xl border border-idea-green/20 bg-idea-green/5 px-3.5 py-3 text-sm text-[#18794e]"
              >
                {success}
              </div>
            )}

            {accessNotice && (
              <StudentLoginRequest status={accessNotice.status} name={accessNotice.name} email={accessNotice.email} />
            )}

            <div className="mt-8">
              {authMode === 'signup' && (
                <div className="mb-4">
                  <label
                    htmlFor="student-full-name"
                    className="block text-left text-xs font-semibold text-idea-text mb-1.5"
                  >
                    Full name <span className="text-idea-red">*</span>
                  </label>

                  <input
                    id="student-full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Enter your name"
                    autoComplete="name"
                    disabled={loading}
                    className="idea-input px-3.5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-idea-blue/10 focus:border-idea-blue disabled:opacity-60"
                    required
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-12 rounded-xl border border-idea-border bg-white text-idea-text text-sm sm:text-base font-semibold transition-colors hover:bg-idea-background hover:border-[#b9c9d1] focus:outline-none focus:ring-4 focus:ring-idea-blue/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
              >
                <svg className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${loading ? 'animate-pulse' : ''}`} viewBox="0 0 24 24">
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

                <span>
                  {loading
                    ? authMode === 'signup'
                      ? 'Creating request…'
                      : 'Signing in…'
                    : authMode === 'signup'
                      ? 'Sign up with Google'
                      : 'Log in with Google'}
                </span>
              </button>

              <p className="mt-3 text-center text-[11px] text-idea-muted">
                {authMode === 'signup'
                  ? 'Students need admin approval before their account is created.'
                  : 'Use the Google account already approved for lab access.'}
              </p>

              <button
                type="button"
                onClick={switchAuthMode}
                disabled={loading}
                className="w-full mt-4 text-xs font-semibold text-idea-deep-blue hover:text-idea-blue cursor-pointer disabled:opacity-50"
              >
                {authMode === 'signup' ? 'Already have an account? Log in' : 'New student? Sign up here'}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-[#8b9aa3] tracking-wide">AICTE IDEA Lab</p>

        <p className="mt-3 text-center text-[11px] leading-5 text-[#8b9aa3]">
          By continuing, you agree to our{' '}
          <Link to="/terms" className="font-semibold text-idea-deep-blue hover:text-idea-blue">
            Terms of Service
          </Link>{' '}
          and acknowledge our{' '}
          <Link to="/privacy" className="font-semibold text-idea-deep-blue hover:text-idea-blue">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};
