'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 420 }}>
      <h1 style={{ marginTop: 0 }}>Sign in</h1>
      <p style={{ color: 'var(--muted)' }}>
        API keys and compare history are stored in Firebase Firestore under
        your account.
      </p>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={
              mode === 'signin' ? 'current-password' : 'new-password'
            }
          />
          {error && <div className="alert alert-error">{error}</div>}
          <div className="actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy}
            >
              {busy
                ? 'Please wait…'
                : mode === 'signin'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </div>
        </form>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', marginLeft: 4 }}
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '0.2rem 0.5rem', marginLeft: 4 }}
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
