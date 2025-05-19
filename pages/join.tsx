import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { supabase } from '@/lib/supabaseClient';

export default function Join() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [stars, setStars] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const generateStars = () => {
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
    };

    generateStars();
  }, []);

  const handleJoin = async () => {
    if (!username.trim()) return alert("Please enter a name to join the signal.");

    setLoading(true);

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("Could not fetch logged-in user. Please try again.");
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
      alert("Profile creation failed.");
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

      {/* 🌌 Star Background */}
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

      {/* 🌟 Join Form UI */}
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
          boxShadow: '0 0 60px #fe019a, 0 0 90px #ff66c4',
          border: '2px solid #222',
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            marginBottom: '1rem',
            color: '#3137fd',
            textShadow: '0 0 10px #3137fd'
          }}>
            Join <span style={{ color: '#fe019a', textShadow: '0 0 15px #fe019a' }}>Whispr</span>
          </h1>
          <p style={{ fontSize: '1rem', color: '#ccc', marginBottom: '2rem' }}>
            Choose your tag to enter the signal.
          </p>

          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your tag"
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '1.1rem',
              borderRadius: '1rem',
              border: '2px solid #3137fd',
              backgroundColor: '#0a0a0a',
              color: '#fff',
              marginBottom: '1.5rem',
              textAlign: 'center',
              boxShadow: '0 0 10px #3137fd'
            }}
          />

          <button
            onClick={handleJoin}
            disabled={loading}
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
              boxShadow: '0 0 15px #fe019a',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Joining...' : 'Enter the Signal'}
          </button>
        </div>
      </main>
    </>
  );
}
