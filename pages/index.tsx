import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

type Star = {
  top: string;
  left: string;
  size: number;
  delay: number;
  color: string;
};

export default function Home() {
  const [stars, setStars] = useState<Star[]>([]);

  useEffect(() => {
    const colors = ['#12f7ff', '#9500FF', '#fe019a'];
    const generated: Star[] = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      generated.push({
        top: `${Math.random() * 100}vh`,
        left: `${Math.random() * 100}vw`,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    setStars(generated);
  }, []);

  return (
    <>
      <Head>
        <title>Whispr</title>
        <meta name="description" content="Whispr – Where Voices Game." />
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

        .glow-box {
          width: 100%;
          height: 250px;
          background: linear-gradient(135deg, #111, #222);
          border-radius: 2rem;
          box-shadow: 0 0 80px #9500FF, 0 0 60px #12f7ff;
          margin-top: 2rem;
        }
      `}</style>

      {/* 🌌 Starfield Background */}
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
        zIndex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: 'Orbitron, sans-serif',
        color: 'white',
        textAlign: 'center',
        padding: '3rem 2rem'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 'bold',
          color: '#12f7ff',
          textShadow: '0 0 20px #12f7ff'
        }}>
          Where Voices Game.
        </h1>
        <p style={{
          fontSize: '1.2rem',
          maxWidth: '500px',
          marginTop: '1rem',
          color: '#ccc',
        }}>
          Music, play, and connection. All in one signal.  
        </p>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <Link href="/join">
            <button style={{
              backgroundColor: '#12f7ff',
              color: '#111',
              padding: '0.8rem 1.6rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              borderRadius: '1rem',
              cursor: 'pointer',
              border: 'none',
              boxShadow: '0 0 15px #12f7ff'
            }}>
              Join Whispr
            </button>
          </Link>
          <Link href="/profileview">
            <button style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '0.8rem 1.6rem',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              borderRadius: '1rem',
              border: '2px solid #ff66c4',
              cursor: 'pointer',
              boxShadow: '0 0 12px #ff66c4'
            }}>
              View Profile
            </button>
          </Link>
        </div>

        {/* Placeholder for UI Showcase */}
       <div className="glow-box">
  <img src="/images/mockup.png" alt="Ur Mom" style={{
    width: '100%',
    height: '100%',
    borderRadius: '2rem',
    objectFit: 'cover'
  }} />
</div>
      </main>
    </>
  );
}
