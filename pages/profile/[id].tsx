import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { JSX } from 'react/jsx-runtime';

export default function PublicProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState<any>(null);
  const [stars, setStars] = useState<JSX.Element[]>([]);

  // 🌠 Star logic
  useEffect(() => {
    const colors = ['#12f7ff', '#fe019a', '#9500FF'];
    const newStars = Array.from({ length: 70 }).map((_, i) => {
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
            borderRadius: '50%',
            opacity: 0.8,
            animationDuration: `${duration}s`,
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      );
    });

    setStars(newStars);
  }, []);

  // 🌌 Profile fetch
  useEffect(() => {
    if (!id) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error.message);
      } else {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [id]);

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center font-sans">
        <p>Loading profile...</p>
      </main>
    );
  }

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden font-sans">
      <style jsx global>{`
        @keyframes twinkle {
          0% {
            opacity: 0.3;
            transform: scale(0.8);
          }
          100% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .twinkle {
          animation: twinkle infinite alternate ease-in-out;
        }
      `}</style>

      <div className="absolute inset-0 z-0">{stars}</div>

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="bg-[#111] p-8 rounded-2xl shadow-xl w-full max-w-md text-center border border-[#333]">
          <img
            src={profile.profileImage || '/default-avatar.png'}
            alt="Profile"
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-2 border-[#9500FF] shadow"
          />
          <h1 className="text-2xl font-bold">{profile.displayName}</h1>
          <p className="text-sm text-[#aaa]">@{profile.username}</p>
          <p className="mt-2 italic text-[#ccc]">{profile.bio || 'No bio set.'}</p>

          {profile.tagLabel && (
            <p className="mt-3 text-[#12f7ff] text-xs font-mono uppercase">
              {profile.tagLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
