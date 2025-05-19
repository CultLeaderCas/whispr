import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabaseClient';
import { JSX } from 'react/jsx-runtime';

export default function Join() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [stars, setStars] = useState<JSX.Element[]>([]);
  const [loading, setLoading] = useState(false);

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

  const handleJoin = async () => {
    if (!username.trim()) return setMessage("Please enter a name to join the signal.");
    setMessage('');
    setLoading(true);

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Could not fetch logged-in user. Please try again.");
      console.error('User fetch error:', userError?.message);
      setLoading(false);
      return;
    }

    const profile = {
      id: user.id,
      email: user.email,
      username,
      displayName: username,
      profileImage: '',
      themeColor: '#12f7ff',
      innerColor: '#111',
      bio: '',
      badge: '💫',
      tag: '0001',
    };

    const { error: profileError } = await supabase.from('profiles').upsert([profile]);

    if (profileError) {
      setMessage("Profile creation failed.");
      console.error('Profile insert error:', profileError.message);
      setLoading(false);
      return;
    }

    localStorage.setItem('echno-profile', JSON.stringify(profile));
    router.push('/profileview');
  };

  return (
    <>
      <Head>
        <title>Join Whispr</title>
        <meta name="description" content="Enter your tag to join the signal" />
      </Head>

      <style jsx global>{`
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

      <div className="relative min-h-screen bg-black flex items-center justify-center overflow-hidden font-sans text-white">
        <div className="absolute inset-0 z-0">{stars}</div>

        <div className="z-10 bg-[#111] p-8 rounded-2xl shadow-2xl border border-[#333] w-full max-w-md backdrop-blur-sm">
          <h1 className="text-4xl font-extrabold text-center text-[#9500FF] mb-2 drop-shadow-[0_0_10px_#9500FF]">
            Join Whispr
          </h1>
          <p className="text-center text-gray-400 mb-6">Choose your tag to enter the signal.</p>

          <input
            type="text"
            placeholder="Enter your tag"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 mb-4 bg-[#1e1e1e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#12f7ff]"
            required
          />

          {message && <p className="text-sm text-red-400 text-center">{message}</p>}

          <button
            onClick={handleJoin}
            disabled={loading}
            className="w-full bg-[#fe019a] text-[#111] font-bold py-2 px-4 rounded-xl hover:bg-[#ff4fba] transition mt-2"
          >
            {loading ? 'Joining...' : 'Enter the Signal'}
          </button>
        </div>
      </div>
    </>
  );
}
