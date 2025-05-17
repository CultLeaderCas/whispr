import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email || (mode !== 'reset' && !password)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else router.push('/pulse');
    }

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else router.push('/pulse');
    }

    if (mode === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      if (error) setError(error.message);
      else setMessage("Check your email for a password reset link.");
    }
  };

  const toggleMode = (newMode: typeof mode) => {
    setError('');
    setMessage('');
    setMode(newMode);
    setPassword('');
  };

  return (
    <main className="min-h-screen flex justify-center items-center bg-black text-white font-sans">
      <form
        onSubmit={handleAuth}
        className="bg-[#1e1f22] p-8 rounded-xl w-full max-w-md shadow-lg space-y-6"
      >
        <h1 className="text-2xl font-bold text-center">
          {mode === 'login'
            ? 'Log In to Whispr'
            : mode === 'signup'
            ? 'Create Your Whispr Account'
            : 'Reset Your Password'}
        </h1>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full p-3 rounded bg-[#2c2f33] text-white border border-[#444]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        {mode !== 'reset' && (
          <div>
            <label className="block text-sm mb-1">Password</label>
            <input
              type="password"
              className="w-full p-3 rounded bg-[#2c2f33] text-white border border-[#444]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {message && <p className="text-green-400 text-sm">{message}</p>}

        <button
          type="submit"
          className="w-full bg-[#12f7ff] hover:bg-cyan-400 text-black font-bold py-3 rounded transition"
        >
          {mode === 'login'
            ? 'Log In'
            : mode === 'signup'
            ? 'Sign Up'
            : 'Send Reset Email'}
        </button>

        <div className="text-center text-sm mt-4 space-y-2">
          {mode === 'login' && (
            <>
              <p>
                Don’t have an account?{' '}
                <button
                  type="button"
                  className="text-[#12f7ff] hover:underline"
                  onClick={() => toggleMode('signup')}
                >
                  Sign Up
                </button>
              </p>
              <p>
                <button
                  type="button"
                  className="text-[#12f7ff] hover:underline"
                  onClick={() => toggleMode('reset')}
                >
                  Forgot Password?
                </button>
              </p>
            </>
          )}
          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                className="text-[#12f7ff] hover:underline"
                onClick={() => toggleMode('login')}
              >
                Log In
              </button>
            </p>
          )}
          {mode === 'reset' && (
            <p>
              Remembered it?{' '}
              <button
                type="button"
                className="text-[#12f7ff] hover:underline"
                onClick={() => toggleMode('login')}
              >
                Back to Log In
              </button>
            </p>
          )}
        </div>
      </form>
    </main>
  );
}
