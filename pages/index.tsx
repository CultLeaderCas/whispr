import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { JSX } from 'react/jsx-runtime';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [stars, setStars] = useState<JSX.Element[]>([]);
  const [showSignUp, setShowSignUp] = useState(false);

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

    const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

const handleSignUp = async (e: React.FormEvent) => {
  e.preventDefault();
  setMessage('');

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    setMessage(error.message);
    return;
  }

  // 🔄 Wait for Supabase to finalize session
  let sessionUser = null;
  for (let i = 0; i < 10; i++) {
    const { data: sessionData } = await supabase.auth.getUser();
    if (sessionData?.user) {
      sessionUser = sessionData.user;
      break;
    }
    await new Promise((res) => setTimeout(res, 300)); // wait 0.3 seconds
  }

  if (sessionUser) {
    router.push('/profile');
  } else {
    setMessage("Session not ready. Please refresh and try again.");
  }
};

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

  useEffect(() => {
    const colors = ['#12f7ff', '#fe019a', '#9500FF'];
    const newStars = Array.from({ length: 60 }).map((_, i) => {
      const size = Math.random() * 4 + 1;
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const duration = Math.random() * 3 + 2;

      return (
        <div
          key={i}
          className="twinkle"
          style={{
            position: 'absolute',
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
            borderRadius: '9999px',
            opacity: 0.8,
            animationDuration: `${duration}s`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      );
    });
    setStars(newStars);
  }, []);

  return (
    <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden font-sans text-white">
      <style global jsx>{`
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
        .twinkle {
          animation: twinkle infinite alternate;
        }
      `}</style>

      <div className="absolute inset-0 z-0">{stars}</div>

      <div className="z-10 bg-[#111] p-8 rounded-2xl shadow-2xl border border-[#333] w-full max-w-md backdrop-blur-sm">
        <h1 className="text-4xl font-extrabold text-center text-[#9500FF] mb-2 drop-shadow-[0_0_10px_#9500FF]">
          Whispr
        </h1>
        <p className="text-center text-gray-400 mb-6">Game. Rage. Whispr.</p>

        <form onSubmit={showSignUp ? handleSignUp : handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 bg-[#1e1e1e] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#12f7ff]"
            required
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
              {showPassword ? '👀' : '🙈'}
            </button>
          </div>

          {message && <p className="text-sm text-red-400 text-center">{message}</p>}

          <button
            type="submit"
            className="w-full bg-[#12f7ff] text-[#111] font-bold py-2 px-4 rounded-xl hover:bg-[#0fd0d0] transition"
          >
            {showSignUp ? 'Sign Up' : 'Login'}
          </button>

          {!showSignUp && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-[#aaa] hover:text-[#12f7ff] transition mt-2 block mx-auto"
            >
              Forgot password?
            </button>
          )}
        </form>

        <div className="text-center mt-4">
          <button
            onClick={() => {
              setMessage('');
              setShowSignUp(!showSignUp);
            }}
            className="text-sm text-[#aaa] hover:text-[#fe019a] transition"
          >
            {showSignUp ? 'Have an account? Log in!' : 'New here? Sign up!'}
          </button>
        </div>
      </div>
    </div>
  );
}
