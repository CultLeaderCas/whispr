import React, { JSX, useEffect, useState } from 'react';

export default function PulsePage() {
  const [stars, setStars] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const colors = ['#12f7ff', '#fe019a', '#9500FF'];
    const newStars = Array.from({ length: 50 }).map((_, i) => {
      const size = Math.random() * 3 + 1;
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const duration = Math.random() * 4 + 2;

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
    <div className="relative min-h-screen bg-black text-white font-sans overflow-hidden">
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

      <div className="absolute inset-0 z-0">{stars}</div>

      <main className="relative z-10 flex flex-col items-center justify-start min-h-screen p-6">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#fe019a] to-[#12f7ff] drop-shadow-xl mb-8">
          The Pulse Hub
        </h1>

        {/* Social Section */}
        <section className="bg-[#111] border border-[#333] rounded-2xl p-6 w-full max-w-4xl shadow-lg backdrop-blur-sm">
          <h2 className="text-3xl font-bold mb-4 text-[#fe019a]">Friends Online</h2>
          <ul className="space-y-2">
            <li className="flex justify-between items-center px-4 py-2 bg-[#1e1e1e] rounded-lg shadow text-white hover:bg-[#2a2a2a] transition">
              <span className="text-lg">ArcRunner</span>
              <span className="text-sm text-green-400">Online</span>
            </li>
            <li className="flex justify-between items-center px-4 py-2 bg-[#1e1e1e] rounded-lg shadow text-white hover:bg-[#2a2a2a] transition">
              <span className="text-lg">Nebula99</span>
              <span className="text-sm text-green-400">Online</span>
            </li>
            <li className="flex justify-between items-center px-4 py-2 bg-[#1e1e1e] rounded-lg shadow text-white hover:bg-[#2a2a2a] transition">
              <span className="text-lg">PhantomXP</span>
              <span className="text-sm text-yellow-300">Idle</span>
            </li>
            <li className="flex justify-between items-center px-4 py-2 bg-[#1e1e1e] rounded-lg shadow text-white hover:bg-[#2a2a2a] transition">
              <span className="text-lg">StarKnight</span>
              <span className="text-sm text-gray-400">Offline</span>
            </li>
          </ul>
          <button className="mt-6 w-full py-2 bg-[#fe019a] text-black font-bold rounded-xl hover:bg-pink-600 transition shadow-lg">
            + Join Game
          </button>
        </section>
      </main>
    </div>
  );
}
