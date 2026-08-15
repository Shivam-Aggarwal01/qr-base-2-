import React, { useState } from 'react';
import {
  createFirebaseAccount,
  loginToFirebase,
  loginWithGoogle,
  logoutFromFirebase,
  type FirebaseUserProfile
} from '../services/firebaseInventory';
import type { UserRole } from '../types/inventory';

interface FirebaseAuthPanelProps {
  onAuthSuccess?: (user: FirebaseUserProfile) => void;
}

export const FirebaseAuthPanel: React.FC<FirebaseAuthPanelProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<FirebaseUserProfile | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const result = mode === 'signup'
        ? await createFirebaseAccount(email, password, role, name)
        : await loginToFirebase(email, password);

      setUser(result);
      onAuthSuccess?.(result);
    } catch (err: any) {
      setError(err?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logoutFromFirebase();
    setUser(null);
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg border border-slate-200">
      <div className="mb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Firebase Auth</p>
        <h2 className="text-2xl font-bold mt-2 text-slate-900">Lab Access</h2>
      </div>

      {user ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <p className="text-sm text-emerald-700 font-semibold">Logged in as {user.name}</p>
            <p className="text-xs text-emerald-600 mt-1">Role: {user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg font-semibold ${mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Login
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-lg font-semibold ${mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}
            >
              Sign Up
            </button>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Full name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-blue-500"
                placeholder="Student or staff name"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-blue-500"
              placeholder="name@lab.edu"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-blue-500"
              >
                <option value="STUDENT">STUDENT</option>
                <option value="STUDENT_LEAD">STUDENT_LEAD</option>
                <option value="STUDENT_AMBASSADOR">STUDENT_AMBASSADOR</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm p-3">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>

          <button
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                const result = await loginWithGoogle();
                setUser(result);
                onAuthSuccess?.(result);
              } catch (err: any) {
                setError(err?.message || 'Google sign-in failed.');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            Continue with Google
          </button>
        </div>
      )}
    </div>
  );
};
