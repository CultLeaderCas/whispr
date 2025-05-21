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

      <div className="relative z-10 max-w-[1440px] mx-auto px-6 pt-4">
        <div className="absolute top-4 right-4 flex space-x-3">
          <AddFriendsDropdown />
          <NotificationBell />
        </div>
        {children}
        <MyProfileCorner />
      </div>
    </div>
  );
}

function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      setNotifications(data || []);
    };

    const interval = setInterval(fetch, 1000); // Pulls notifications every 1 second
    return () => clearInterval(interval); // Clean up the interval on unmount
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  return (
    <div className="relative">
      <button
        className="text-3xl relative hover:scale-110 transition"
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#fe019a] text-white text-xs px-2 rounded-full font-bold shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 mt-2 w-80 bg-[#111] border border-[#333] text-white rounded-xl p-4 shadow-xl z-50 backdrop-blur">
          <h3 className="text-lg font-bold mb-2">Notifications</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-sm text-[#888] italic text-center">
                You have no Notifications.
              </p>
            )}
            {notifications.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg transition cursor-pointer ${
                  note.is_read
                    ? 'bg-[#1e1e1e] text-[#aaa]'
                    : 'bg-[#272727] text-white border border-[#9500FF]'
                }`}
                onClick={() => markAsRead(note.id)}
              >
                <p className="text-sm">{note.message}</p>
                <p className="text-xs text-[#666] mt-1">
                  {new Date(note.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AddFriendsDropdown() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      const search = query.trim().toLowerCase();
      if (search === '') {
        setResults([]);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${search}%,displayName.ilike.%${search}%`);

      if (error) {
        console.error('❌ Supabase Error:', error.message);
        setResults([]);
      } else {
        setResults(data || []);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleAddFriend = async (toUserId: string) => {
    setAdding(toUserId);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert('You must be logged in to send friend requests.');
      setAdding(null);
      return;
    }

  // INSERT friend request
  const { error: friendError } = await supabase
    .from('friend_requests')
    .insert([{ from_user_id: user.id, to_user_id: toUserId, status: 'pending' }]);

    if (friendError) {
      console.error('❌ Add friend error:', friendError.message);
      alert('Failed to send friend request.');
      setAdding(null);
      return;
    }

    // INSERT notification
const { data: profileData } = await supabase
  .from('profiles')
  .select('displayName')
  .eq('id', user.id)
  .single();

const displayName = profileData?.displayName || 'Someone';

const { error: notifyError } = await supabase.from('notifications').insert([
  {
    to_user_id: toUserId,
    from_user_id: user.id,
    message: `${displayName} sent you a friend request!`,
    type: 'friend_request',
    is_read: false
  }
]);

    if (notifyError) {
      console.error('⚠️ Notification failed:', notifyError.message);
    }

    setAdding(null);
    alert('✅ Friend request sent!');
  };

  const handleViewProfile = (userId: string) => {
    window.location.href = `/profile/${userId}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-[#12f7ff] text-[#111] font-bold px-4 py-2 rounded-xl hover:bg-[#0fd0d0] transition shadow-lg text-sm"
      >
        ➕ Add Friends
      </button>

      {showDropdown && (
        <div className="absolute top-12 right-0 bg-[#111] border border-[#333] rounded-xl p-4 shadow-xl backdrop-blur-sm z-50 w-80">
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
                  className="w-10 h-10 rounded-full mr-3 object-cover border-2 border-[#9500FF] shadow"
                />
                <div className="flex-1">
                  <p className="text-white font-semibold">{user.displayName}</p>
                  <p className="text-sm text-[#aaa]">@{user.username}</p>
                </div>
                <button
                  className="ml-2 px-2 py-1 bg-[#12f7ff] text-[#111] rounded-lg text-xs font-bold hover:bg-[#0fd0d0]"
                  disabled={adding === user.id}
                  onClick={() => handleAddFriend(user.id)}
                >
                  {adding === user.id ? '...' : 'Add'}
                </button>
                <button
                  className="ml-1 px-2 py-1 bg-[#9500FF] text-white text-xs rounded-lg font-bold hover:bg-[#7a00cc]"
                  onClick={() => handleViewProfile(user.id)}
                >
                  View
                </button>
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

function MyProfileCorner() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const fetchMyProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('🔒 Auth error:', userError.message);
        return;
      }

      if (!user) {
        console.warn('⚠️ No user found in session');
        return;
      }

      console.log('🔍 Current user ID:', user.id);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

     if (error || !data) {
  console.warn('⚠️ No profile found, redirecting...');
  window.location.href = '/join';
  return;
}

      setProfile(data);
    };

    fetchMyProfile();
  }, []);

  if (!profile) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 bg-[#111] border border-[#333] text-white rounded-2xl shadow-xl p-4 flex items-center space-x-3 max-w-sm backdrop-blur-md">
      <img
        src={profile.profileImage || '/default-avatar.png'}
        alt="Me"
        className="w-12 h-12 rounded-full object-cover border-2"
        style={{ borderColor: profile.themeColor || '#12f7ff' }}
      />
      <div className="flex flex-col">
        <p className="text-sm font-bold">{profile.displayName || 'Me'}</p>
        <p className="text-xs text-[#aaa]">@{profile.username}</p>
      </div>
      <a
        href="/profile"
        className="ml-auto px-3 py-1 bg-[#12f7ff] text-[#111] font-bold text-xs rounded-lg hover:bg-[#0fd0d0] transition"
      >
        Edit
      </a>
    </div>
  );
}
