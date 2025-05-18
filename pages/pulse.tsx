import { useEffect, useState } from 'react';
import { JSX } from 'react/jsx-runtime';
import { supabase } from '@/lib/supabaseClient';

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  const [stars, setStars] = useState<JSX.Element[]>([]);

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
            animationDelay: `${Math.random() * 5}s`
          }}
        />
      );
    });
    setStars(newStars);
  }, []);

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white">
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

      <div className="relative z-10 px-6 py-4 max-w-[1440px] mx-auto">
        {children}
        <AddFriendsDropdown />
      </div>
    </div>
  );
}

function AddFriendsDropdown() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
   const fetchUsers = async () => {
  const search = query.trim().toLowerCase();
  if (search === '') {
    setResults([]);
    return;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*') // log everything
    .or(`username.ilike.%${search}%,displayName.ilike.%${search}%`);

  if (error) {
    console.error('❌ Supabase Error:', error.message);
    setResults([]);
  } else {
    console.log('✅ Matching rows:', data);
    setResults(data || []);
  }
};

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div className="mt-6 relative w-full max-w-md">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-[#12f7ff] text-[#111] font-bold px-5 py-2 rounded-xl hover:bg-[#0fd0d0] transition shadow-lg"
      >
        ➕ Add Friend by Username
      </button>

      {showDropdown && (
        <div className="mt-3 bg-[#111] border border-[#333] rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <input
            type="text"
            placeholder="Search username…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-2 mb-3 bg-[#1e1e1e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9500FF]"
          />

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {results.map((user, index) => (
              <div key={index} className="flex items-center bg-[#1a1a1a] p-3 rounded-xl hover:bg-[#222] transition">
                <img
                  src={user.profileImage || '/default-avatar.png'}
                  alt="Profile"
                  className="w-12 h-12 rounded-full mr-3 object-cover border-2 border-[#9500FF] shadow"
                />
                <div>
                  <p className="text-white font-semibold">{user.displayName}</p>
                  <p className="text-sm text-[#aaa]">@{user.username}</p>
                </div>
              </div>
            ))}

            {results.length === 0 && query && (
              <p className="text-sm text-[#888] italic text-center">No users found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
