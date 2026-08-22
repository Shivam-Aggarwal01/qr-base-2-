import React, { useState } from "react";
import {
  loginWithGoogle,
  logoutFromFirebase,
  type FirebaseUserProfile,
} from "../services/firebaseInventory";

interface FirebaseAuthPanelProps {
  onAuthSuccess?: (user: FirebaseUserProfile) => void;
}

export const FirebaseAuthPanel: React.FC<FirebaseAuthPanelProps> = ({
  onAuthSuccess,
}) => {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<FirebaseUserProfile | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loginWithGoogle();
      if (result) {
        setUser(result);
        onAuthSuccess?.(result);
      }
    } catch (err: any) {
      setError(err?.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setError("");
      await logoutFromFirebase();
      setUser(null);
    } catch (err: any) {
      setError(err?.message || "Failed to logout.");
    }
  };

  // AUTHENTICATED STATE
  if (user) {
    return (
      <div className="min-h-screen w-full bg-idea-background flex items-center justify-center px-4 py-10 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-idea-blue/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-idea-green/10 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `
                linear-gradient(var(--color-idea-deep-blue) 1px, transparent 1px),
                linear-gradient(90deg, var(--color-idea-deep-blue) 1px, transparent 1px)
              `,
              backgroundSize: "36px 36px",
            }}
          />
        </div>
        <div className="relative w-full max-w-md">
          <div className="bg-white border border-idea-border rounded-2xl shadow-[0_20px_60px_rgba(11,76,163,0.08)] overflow-hidden">
            {/* Brand strip */}
            <div className="h-1 bg-gradient-to-r from-idea-blue via-idea-deep-blue to-idea-green" />
            <div className="p-8 sm:p-10">
              <div className="text-center">
                <img
                  src="/logo.png"
                  alt="AICTE IDEA Lab"
                  className="h-20 sm:h-24 w-auto mx-auto object-contain"
                />
                <div className="mt-6">
                  <div className="mx-auto w-12 h-12 rounded-full bg-idea-green/10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-idea-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h1 className="mt-4 text-lg sm:text-xl font-bold text-idea-text">
                    You're signed in
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-idea-muted">
                    Welcome back, {user.name}
                  </p>
                </div>
              </div>
              <div className="mt-7 rounded-xl border border-idea-border bg-idea-background p-4">
                <p className="text-sm font-semibold text-idea-text break-all">
                  {user.email}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-idea-muted">Account role</span>
                  <span className="px-2.5 py-1 rounded-full bg-idea-blue/10 text-idea-deep-blue text-xs font-semibold">
                    {user.role}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-6 w-full h-11 rounded-xl bg-idea-deep-blue text-white text-sm font-semibold transition-all hover:bg-[#083d84] hover:shadow-lg hover:shadow-idea-deep-blue/15 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
          <p className="mt-5 text-center text-xs text-idea-muted">
            AICTE IDEA Lab
          </p>
        </div>
      </div>
    );
  }

  // LOGIN
  return (
    <div className="min-h-screen w-full bg-idea-background flex items-center justify-center px-4 py-8 sm:py-12 relative overflow-hidden">
      {/* CARD */}
      <div className="relative w-full max-w-[400px]">
        <div className="bg-white border border-idea-border rounded-2xl shadow-[0_20px_70px_rgba(11,76,163,0.09)] overflow-hidden">
          {/* IDEA LAB colour strip */}
          <div className="h-1 bg-gradient-to-r from-idea-blue via-idea-deep-blue to-idea-green" />
          <div className="p-7 sm:p-9">
            {/* LOGO + HEADER */}
            <div className="text-center">
              <img
                src="/logo.png"
                alt="AICTE IDEA Lab"
                className="h-24 sm:h-28 w-auto mx-auto object-contain"
              />

              <div className="mt-6 sm:mt-8">
                <h1 className="text-2xl sm:text-[27px] font-bold tracking-tight text-idea-text">
                  Welcome
                </h1>
                <p className="mt-2 text-sm text-idea-muted">
                  Sign in to access the AICTE IDEA Lab
                </p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-idea-red/20 bg-idea-red/5 px-3.5 py-3 text-sm text-[#c9151d]">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* GOOGLE BUTTON */}
            <div className="mt-8">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full h-12 rounded-xl border border-idea-border bg-white text-idea-text text-sm sm:text-base font-semibold transition-all hover:bg-idea-background hover:border-[#b9c9d1] focus:outline-none focus:ring-4 focus:ring-idea-blue/10 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 cursor-pointer"
              >
                {loading ? (
                  <svg
                    className="w-5 h-5 animate-spin text-idea-deep-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                ) : (
                  <>
                    <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
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
                    Continue with Google
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
        {/* FOOTER */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-idea-blue" />
            <span className="w-1.5 h-1.5 rounded-full bg-idea-green" />
            <span className="w-1.5 h-1.5 rounded-full bg-idea-yellow" />
            <span className="w-1.5 h-1.5 rounded-full bg-idea-red" />
          </div>
          <p className="mt-3 text-[11px] sm:text-xs text-[#8b9aa3] tracking-wide">
            AICTE IDEA Lab
          </p>
        </div>
      </div>
    </div>
  );
};
