import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Login failed. Please check your credentials.');
    } else {
      router.push('/pulse');
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0a0a0a] p-8 rounded-3xl shadow-2xl border border-[#333]">
        <h1 className="text-3xl font-bold mb-6 text-center">Whispr Login</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 mb-4 rounded-xl bg-[#111] text-white outline-none border border-[#333] shadow focus:ring-2 focus:ring-[#9500FF]"
        />

        {/* Password Input with Animated Eye Emoji */}
        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 rounded-xl bg-[#111] text-white outline-none border border-[#333] shadow focus:ring-2 focus:ring-[#fe019a]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-2xl transition-all duration-300 hover:scale-125"
            aria-label="Toggle password visibility"
          >
            {showPassword ? '👁️' : '🙈'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-2 text-center">{error}</p>}

        <button
          onClick={handleLogin}
          className="w-full py-3 rounded-xl font-bold text-black bg-[#9500FF] hover:bg-[#fe019a] transition-colors duration-300 shadow-md"
        >
          Login
        </button>

        <p className="text-sm text-center mt-4">
          Don’t have an account? <a href="/join" className="text-[#fe019a] font-semibold hover:underline">Sign up</a>
        </p>
      </div>
    </main>
  );
}
