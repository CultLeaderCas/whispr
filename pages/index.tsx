import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [stars, setStars] = useState<any[]>([]);

  useEffect(() => {
    const starArray = Array.from({ length: 70 }).map(() => {
      const size = Math.random() * 2 + 1;
      return {
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        size,
        color: ['#12f7ff', '#fe019a', '#9500FF'][Math.floor(Math.random() * 3)],
        delay: Math.random() * 4
      };
    });
    setStars(starArray);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMessage(error.message);
      return;
    }

    const user = data.user;

    if (user) {
      console.log('✅ User signed up:', user.id);

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id);

      if (!existingProfile || existingProfile.length === 0) {
        // No profile found — go create one
        router.push('/join');
      } else {
        // Already has a profile — go to pulse
        router.push('/pulse');
      }
    } else {
      setMessage('Check your email to complete Sign-Up 👾');
    }
  };

  return (
    <>
      <Head>
        <title>Whispr – Enter the Signal</title>
        <meta name="description" content="Sign in to the hum. Begin your signal." />
      </Head>

      <style>{`
        body {
          margin: 0;
          padding: 0;
          background: #0a001f;
          overflow: hidden;
        }

        .star {
          position: fixed;
          border-radius: 50%;
          animation: twinkle 4s ease-in-out infinite;
        }

        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0.3; transform: scale(1); }
        }
      `}</style>

      {stars.map((star, i) => (
        <div
          key={i}
          className="star"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.color,
            animationDelay: `${star.delay}s`,
            zIndex: 0,
          }}
        />
      ))}

      <main style={{
        minHeight: '100vh',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Orbitron, sans-serif',
        color: 'white',
        textAlign: 'center',
        padding: '2rem',
        zIndex: 1
      }}>
        <div style={{
          maxWidth: '500px',
          width: '100%',
          backgroundColor: '#111',
          borderRadius: '2rem',
          padding: '3rem 2rem',
          boxShadow: '0 0 60px #9500FF, 0 0 90px #12f7ff',
          border: '2px solid #222',
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            color: '#12f7ff',
            textShadow: '0 0 10px #12f7ff'
          }}>
            Welcome to <span style={{ color: '#fe019a', textShadow: '0 0 15px #fe019a' }}>Whispr</span>
          </h1>
          <p style={{ fontSize: '1rem', color: '#ccc', marginBottom: '2rem' }}>
            Sign in to begin your signal.
          </p>

          <form onSubmit={handleSignUp}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Email"
              required
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '1.1rem',
                borderRadius: '1rem',
                border: '2px solid #9500FF',
                backgroundColor: '#0a0a0a',
                color: '#fff',
                marginBottom: '1rem',
                textAlign: 'center',
                boxShadow: '0 0 10px #9500FF'
              }}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a Password"
              required
              style={{
                width: '100%',
                padding: '0.8rem',
                fontSize: '1.1rem',
                borderRadius: '1rem',
                border: '2px solid #12f7ff',
                backgroundColor: '#0a0a0a',
                color: '#fff',
                marginBottom: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 0 10px #12f7ff'
              }}
            />

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '0.9rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                borderRadius: '1rem',
                border: 'none',
                backgroundColor: '#fe019a',
                color: '#111',
                cursor: 'pointer',
                boxShadow: '0 0 15px #fe019a'
              }}
            >
              Join the Signal
            </button>
          </form>

          {message && (
            <p style={{
              marginTop: '1.5rem',
              fontSize: '0.9rem',
              color: '#ff66c4'
            }}>
              {message}
            </p>
          )}
        </div>
      </main>
    </>
  );
}
