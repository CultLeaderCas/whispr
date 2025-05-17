import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
    } else {
      router.push('/pulse');
    }
  };

  const handleForgotPassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://whispr-h5lvqmnox-cas-projects-8f91dbd9.vercel.app/reset',
    });
    if (error) {
      setMessage('Error: ' + error.message);
    } else {
      setMessage('Password reset email sent!');
    }
  };

  // Generate stars
  const generateStars = () => {
    const colors = ['#12f7ff', '#ff00ff', '#c084fc']; // blue, pink, purple
    return Array.from({ length: 50 }).map((_, i) => {
      const size = Math.random() * 4 + 1;
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const duration = Math.random() * 3 + 2;

      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
            borderRadius: '9999px',
            opacity: 0.8,
            animation: `twinkle ${duration}s infinite alternate`,
            zIndex: 0,
          }}
        />
      );
    });
  };

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden font-sans text-white">
      {/* Twinkling stars */}
      <style jsx>{`
        @keyframes twinkle {
          0% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>
      {generateStars()}

      {/* Login panel */}
      <div className="z-10 bg-[#111] p-8 rounded-2xl shadow-2xl border border-[#333] w-full max-w-md backdrop-blur-sm">
        <h1 className="text-4xl font-extrabold text-center text-[#12f7ff] mb-2 drop-shadow-[0_0_10px_#12f7ff]">
          Whispr
        </h1>
        <p className="text-center text-gray-400 mb-6">Log in to pulse</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-[#1e1e1e] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#12f7ff]"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 bg-[#1e1e1e] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#12f7ff]"
            required
          />

          {message && <p className="text-sm text-red-400 text-center">{message}</p>}

          <button
            type="submit"
            className="w-full bg-[#12f7ff] text-[#111] font-bold py-2 px-4 rounded-xl hover:bg-[#0fd0d0] transition"
          >
            Login
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-[#aaa] hover:text-[#12f7ff] transition mt-2 block mx-auto"
          >
            Forgot password?
          </button>
        </form>
      </div>
    </div>
  );
}
