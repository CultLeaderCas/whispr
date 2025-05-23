// pulse.tsx
import { useEffect, useState } from 'react';
import { JSX } from 'react/jsx-runtime';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Image from 'next/image';

// Define a Profile interface for better type safety
interface Profile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  themeColor?: string; // Assuming you have this field
  // Add other profile fields as needed
}

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  const [stars, setStars] = useState<JSX.Element[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [currentUsersProfile, setCurrentUsersProfile] = useState<Profile | null>(null);
  const router = useRouter();

  // --- Fetch Current User's Profile for Right Panel ---
  useEffect(() => {
    const fetchCurrentUsersProfile = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('🔒 Auth error fetching current user:', authError.message);
        setCurrentUsersProfile(null);
        return;
      }

      if (!user) {
        setCurrentUsersProfile(null);
        // If no user is logged in, you might want to redirect
        // router.push('/login');
        return;
      }

      // Check if user already exists in the profile state
      if (currentUsersProfile && currentUsersProfile.id === user.id) {
        return; // Avoid refetching if already loaded for the same user
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.warn('⚠️ No profile found for current user, or error:', profileError?.message);
        setCurrentUsersProfile(null);
        // Redirect to onboarding if profile doesn't exist for a logged-in user
        // router.push('/onboarding');
        return;
      }
      setCurrentUsersProfile(profile);
    };

    fetchCurrentUsersProfile();
    // Depend on router.isReady to ensure client-side hydration is complete
    // and prevent unnecessary fetches before router is fully initialized.
  }, [router.isReady]); // Added router.isReady to dependency array

  // --- Existing Friends Fetch useEffect ---
  useEffect(() => {
    const fetchFriends = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) return;

      const { data: friendLinks } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);

      const friendIds = friendLinks?.map(f => f.friend_id) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      setFriends(profiles || []);
    };

    fetchFriends();
  }, []);

  // --- Existing Stars Animation useEffect ---
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

  // Function to handle friend card click and navigate to chat
  const handleFriendCardClick = (friendId: string) => {
    router.push(`/chat/${friendId}`);
  };

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

      <div className="relative z-10 max-w-[1440px] mx-auto pt-4 flex min-h-screen">
        {/* Left Panel – Nodes */}
        <div className="w-[220px] bg-[#111] border-r border-[#333] p-4 space-y-4 overflow-y-auto">
          <h3 className="text-lg font-bold mb-3">Nodes</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-xl transition cursor-pointer">
              <Image src="/default-node.png" className="w-10 h-10 rounded-full border border-[#9500FF]" alt="Node Icon" width={40} height={40} />
              <span className="text-sm font-bold">CultOfCas</span>
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-xl transition cursor-pointer">
              <Image src="/default-node.png" className="w-10 h-10 rounded-full border border-[#9500FF]" alt="Node Icon" width={40} height={40} />
              <span className="text-sm font-bold">Fortnite</span>
            </div>
          </div>
        </div>

        {/* Center Panel – Friends */}
        <div className="flex-1 p-6 overflow-y-auto">
          {/* Ensure AddFriendsDropdown and NotificationBell are NOT here */}
          <h2 className="text-xl font-bold mb-4">Friends</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {friends.map((friend, index) => (
              <div
                key={friend.id || index}
                className="bg-[#1e1e1e] p-4 rounded-2xl shadow-lg hover:bg-[#272727] transition cursor-pointer"
                onClick={() => handleFriendCardClick(friend.id)}
              >
                <Image
                  src={friend.profileImage || '/default-avatar.png'}
                  alt={friend.displayName || 'Friend'}
                  width={64}
                  height={64}
                  className="w-16 h-16 rounded-full border-2 border-[#12f7ff] object-cover mx-auto mb-2"
                />
                <div className="text-center">
                  <p className="font-bold">{friend.displayName || 'Unknown'}</p>
                  <p className="text-sm text-[#aaa]">@{friend.username}</p>
                  <p className="text-xs italic text-[#555] mt-1">💫 Friend</p>
                </div>
              </div>
            ))}
          </div>
          {children}
        </div>

        {/* Right Panel – Current User Profile / Add Friends / Notifications / Music */}
        <div className="w-[260px] bg-[#111] border-l border-[#333] p-4 sticky top-0 h-screen flex flex-col items-center">
          {currentUsersProfile ? (
            <>
              {/* Profile image with dynamic border color */}
              <Image
                src={currentUsersProfile.profileImage || '/default-avatar.png'}
                alt={currentUsersProfile.displayName || 'Your Profile'}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full border-2 object-cover mx-auto mb-3"
                style={{ borderColor: currentUsersProfile.themeColor || '#12f7ff' }}
              />
              <p className="font-bold text-lg text-center">{currentUsersProfile.displayName || 'Your Name'}</p>
              <p className="text-sm text-[#aaa] mt-1 text-center">@{currentUsersProfile.username || 'your_username'}</p>
              <a
                href="/profile"
                className="mt-4 px-4 py-2 bg-[#fe019a] text-white font-bold text-sm rounded-xl hover:bg-[#d0017e] transition shadow-md"
              >
                View/Edit Profile
              </a>
            </>
          ) : (
            <div className="text-center text-[#888] my-4">
              <p>Loading profile...</p>
              {/* Optional: Add a login/signup link if no user */}
              {/* <a href="/login" className="text-[#12f7ff] mt-2 block">Login</a> */}
            </div>
          )}

          {/* Add Friends and Notification Bell moved here */}
          <div className="mt-6 w-full flex justify-center items-center space-x-2">
            <AddFriendsDropdown />
            <NotificationBell />
          </div>

          <div className="mt-6 pt-6 border-t border-[#333] w-full text-center">
            <h4 className="text-sm font-bold mb-2">Now Playing</h4>
            <div className="bg-[#1a1a1a] p-3 rounded-xl text-sm text-[#ccc]">
              🎵 No song playing<br />
              🟢 Online
            </div>
          </div>
        </div>
      </div>

      {/* MyProfileCorner remains for the bottom-right, if you still need it there */}
      <MyProfileCorner />
    </div>
  );
}

// --- NotificationBell Component (unchanged from last successful version, but ensure absolute positioning works within parent) ---
function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*, from_user:from_user_id (id, displayName)')
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      setNotifications(data || []);
    };

    // Using real-time for notifications is better for immediate updates
    // For now, keeping your provided setInterval for this full file dump.
    const interval = setInterval(fetchNotifications, 5000); // Polling every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error("Error marking as read:", error.message);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleCardClick = async (note: any) => {
    const fromId = note.from_user?.id ?? note.from_user_id;
    await markAsRead(note.id);
    setIsFadingOut(true);
    setTimeout(() => {
      window.location.href = `/profile/${fromId}`;
    }, 300);
  };

  return (
    <div className="relative"> {/* Keep relative here for the dropdown to position correctly */}
      <style jsx>{`
        .fade-out {
          animation: fadeOut 0.3s ease forwards;
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.98);
          }
        }
      `}</style>

      <button
        className="text-3xl relative hover:scale-110 transition"
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications"
      >
        🔔
        {notifications.some((n) => !n.is_read) && (
          <span className="absolute -top-2 -right-2 bg-[#fe019a] text-white text-xs px-2 rounded-full font-bold shadow">
            {notifications.filter((n) => !n.is_read).length}
          </span>
        )}
      </button>

      {showPanel && (
        <div
          className={`absolute right-0 mt-2 w-80 bg-[#111] border border-[#333] text-white rounded-xl p-4 shadow-xl z-50 backdrop-blur transition-opacity duration-300 ${
            isFadingOut ? "fade-out" : ""
          }`}
        >
          <h3 className="text-lg font-bold mb-2">Notifications</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-sm text-[#888] italic text-center">
                You have no Notifications.
              </p>
            )}
            {notifications.map((note) => {
              const name = note.from_user?.displayName || "Someone";
              return (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.015] hover:border-[#12f7ff] ${
                    note.is_read
                      ? "bg-[#1e1e1e] text-[#aaa]"
                      : "bg-[#272727] text-white border border-[#9500FF]"
                  }`}
                  onClick={() => handleCardClick(note)}
                >
                  <p className="text-sm italic">
                    <span className="font-semibold text-white italic">{name}</span>{" "}
                    {note.type === 'friend_request' ? 'sent you a friend request!' : note.message}
                  </p>
                  <p className="text-xs text-[#666] mt-1">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- AddFriendsDropdown Component (minor adjustments for better positioning) ---
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
    <div className="relative flex-grow"> {/* Added flex-grow so it takes up available space */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-full bg-[#12f7ff] text-[#111] font-bold px-4 py-2 rounded-xl hover:bg-[#0fd0d0] transition shadow-lg text-sm"
      >
        ➕ Add Friends
      </button>

      {showDropdown && (
        // Adjusted dropdown positioning to appear correctly within the right panel
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-[#111] border border-[#333] rounded-xl p-4 shadow-xl backdrop-blur-sm z-50 w-80">
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
                <Image
                  src={user.profileImage || '/default-avatar.png'}
                  alt="Profile"
                  width={40}
                  height={40}
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

// --- MyProfileCorner Component (unchanged) ---
// components/MyProfileCorner.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Make sure this path is correct
import Image from 'next/image';
import { useRouter } from 'next/router';

interface Profile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  themeColor?: string;
  online_status?: 'online' | 'away' | 'dnd' | 'offline';
  bio?: string;
  public_status?: string;
}

export default function MyProfileCorner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [currentBio, setCurrentBio] = useState('');
  const [currentPublicStatus, setCurrentPublicStatus] = useState('');
  const [currentOnlineStatus, setCurrentOnlineStatus] = useState<'online' | 'away' | 'dnd' | 'offline'>('offline');

  // Map status to glow styles (Tailwind colors used for reference)
  const statusGlowStyles = {
    online: '0 0 0 2px #22C55E, 0 0 10px 5px rgba(34,197,94,0.7)',   // Green glow (Tailwind green-500)
    away: '0 0 0 2px #F59E0B, 0 0 10px 5px rgba(245,158,11,0.7)',     // Yellow glow (Tailwind yellow-500)
    dnd: '0 0 0 2px #EF4444, 0 0 10px 5px rgba(239,68,68,0.7)',       // Red glow (Tailwind red-500)
    offline: '0 0 0 2px #6B7280, 0 0 8px 3px rgba(107,114,128,0.5)',  // Gray glow (Tailwind gray-500) or 'white' for visibility
  };

  // 1. Fetch User Profile
  useEffect(() => {
    const fetchMyProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('🔒 Auth error fetching user for MyProfileCorner:', userError.message);
        return;
      }

      if (!user) {
        console.warn('⚠️ No user found in session for MyProfileCorner');
        setProfile(null);
        router.push('/join'); // Redirect to join page if no user
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        console.warn('⚠️ No profile found for current user, redirecting to join/onboarding:', error?.message);
        setProfile(null);
        router.push('/join'); // Redirect if profile doesn't exist
        return;
      }

      setProfile(data);
      setCurrentBio(data.bio || '');
      setCurrentPublicStatus(data.public_status || '');
      setCurrentOnlineStatus(data.online_status || 'offline');
    };

    fetchMyProfile();

    // Realtime subscription for current user's profile changes
    // This assumes the 'profiles' table has Row Level Security (RLS) policies
    // that allow users to only see/update their own profile.
    const profileId = profile?.id; // Capture profile.id for the cleanup
    if (profileId) { // Only subscribe if profile ID is known
        const channel = supabase
            .channel(`profile_changes:${profileId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` }, payload => {
                console.log('Realtime profile update received!', payload.new);
                setProfile(payload.new as Profile);
                setCurrentBio(payload.new.bio || '');
                setCurrentPublicStatus(payload.new.public_status || '');
                setCurrentOnlineStatus(payload.new.online_status || 'offline');
            })
            .subscribe();

        return () => {
            console.log('Unsubscribing from profile changes channel.');
            channel.unsubscribe();
        };
    }
  }, [router, profile?.id]); // Re-run if router changes or profile ID changes

  // 2. Click outside to close settings
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 3. Update handlers for settings
  const handleUpdateProfile = async (field: string, value: any) => {
    if (!profile?.id) {
        console.warn('Attempted to update profile without a valid user ID.');
        return;
    }

    const updates = {
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      console.error(`❌ Error updating ${field}:`, error.message);
      // alert(`Failed to update ${field}.`); // Consider less intrusive feedback
    } else {
      console.log(`✅ ${field} updated successfully.`);
      // Realtime subscription will handle UI update, no need to setProfile here
    }
  };

  const handleOnlineStatusChange = (status: 'online' | 'away' | 'dnd' | 'offline') => {
    setCurrentOnlineStatus(status); // Optimistic update
    handleUpdateProfile('online_status', status);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentBio(e.target.value);
    debounceUpdateBio(e.target.value);
  };

  const handlePublicStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPublicStatus(e.target.value);
    debounceUpdatePublicStatus(e.target.value);
  };

  // Debounce for bio and public status updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounceUpdate = (value: string, field: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      handleUpdateProfile(field, value);
    }, 500);
  };

  const debounceUpdateBio = (value: string) => debounceUpdate(value, 'bio');
  const debounceUpdatePublicStatus = (value: string) => debounceUpdate(value, 'public_status');

  if (!profile) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Main Profile Card - Click Target */}
      <div
        className="bg-[#111] border border-[#333] text-white rounded-2xl shadow-xl p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#1e1e1e] transition-all duration-200 backdrop-blur-md"
        onClick={() => setShowSettings(!showSettings)}
      >
        {/* Profile Image with Glowing Ring */}
        <div
          className={`w-12 h-12 rounded-full overflow-hidden transition-shadow duration-200 ease-in-out flex-shrink-0`}
          style={{
            boxShadow: statusGlowStyles[profile.online_status || 'offline'],
            border: `2px solid ${profile.themeColor || '#12f7ff'}` // Optional: keep theme color as a base border
          }}
        >
          <Image
            src={profile.profileImage || '/default-avatar.png'}
            alt={profile.displayName || 'Me'}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Profile Text Info */}
        <div className="flex flex-col">
          <p className="text-sm font-bold">{profile.displayName || 'Me'}</p>
          <p className="text-xs text-[#aaa]">@{profile.username}</p>
          {profile.public_status && (
            <p className="text-xs text-[#9500FF] italic mt-1 truncate max-w-[120px]">
              {profile.public_status}
            </p>
          )}
        </div>
      </div>

      {/* Pop-out Settings Panel */}
      {showSettings && (
        <div
          ref={settingsRef}
          className="absolute bottom-full right-0 mb-3 w-72 bg-[#111] border border-[#333] text-white rounded-2xl shadow-2xl p-4 transition-all duration-300 transform origin-bottom-right animate-pop-in z-50"
        >
          <style jsx>{`
            @keyframes pop-in {
              0% { opacity: 0; transform: scale(0.9) translateY(10px); }
              100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            .animate-pop-in {
              animation: pop-in 0.2s ease-out forwards;
            }
          `}</style>
          <h3 className="text-lg font-bold mb-3 text-center">Quick Settings</h3>

          {/* Profile Mirror in Pop-out */}
          <div className="flex items-center space-x-3 mb-4 border-b border-[#222] pb-3">
             <div
                className={`w-14 h-14 rounded-full overflow-hidden transition-shadow duration-200 ease-in-out flex-shrink-0`}
                style={{
                    boxShadow: statusGlowStyles[profile.online_status || 'offline'],
                    border: `2px solid ${profile.themeColor || '#12f7ff'}` // Optional: keep theme color as a base border
                }}
             >
                <Image
                    src={profile.profileImage || '/default-avatar.png'}
                    alt={profile.displayName || 'Me'}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                />
             </div>
             <div className="flex flex-col">
                <p className="text-md font-bold">{profile.displayName || 'Me'}</p>
                <p className="text-sm text-[#aaa]">@{profile.username}</p>
                <a href="/profile" className="text-xs text-[#12f7ff] hover:underline mt-1">
                   View Full Profile
                </a>
             </div>
          </div>

          {/* Online Status Selector */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Online Status</label>
            <div className="flex justify-around space-x-2">
              {['online', 'away', 'dnd', 'offline'].map((status) => (
                <button
                  key={status}
                  onClick={() => handleOnlineStatusChange(status as 'online' | 'away' | 'dnd' | 'offline')}
                  className={`flex-1 p-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200
                    ${profile.online_status === status ? 'border-2 border-current' : ''}
                    ${status === 'online' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                    ${status === 'away' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : ''}
                    ${status === 'dnd' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                    ${status === 'offline' ? 'bg-gray-700 hover:bg-gray-800 text-white' : ''}
                  `}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Public Status Input */}
          <div className="mb-4">
            <label htmlFor="publicStatus" className="block text-sm font-semibold mb-2">
              Public Status (visible to all)
            </label>
            <input
              id="publicStatus"
              type="text"
              value={currentPublicStatus}
              onChange={handlePublicStatusChange}
              onBlur={() => debounceUpdatePublicStatus(currentPublicStatus)} // Save on blur
              onKeyDown={(e) => { // Save on Enter key
                if (e.key === 'Enter') {
                  e.currentTarget.blur(); // Trigger blur to save
                }
              }}
              maxLength={50}
              placeholder="e.g., Playing Cyberpunk 2077"
              className="w-full p-2 text-sm bg-[#1e1e1e] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9500FF]"
            />
            <p className="text-right text-xs text-[#666] mt-1">{currentPublicStatus.length}/50</p>
          </div>

          {/* Bio Textarea */}
          <div className="mb-4">
            <label htmlFor="bio" className="block text-sm font-semibold mb-2">
              Bio
            </label>
            <textarea
              id="bio"
              value={currentBio}
              onChange={handleBioChange}
              onBlur={() => debounceUpdateBio(currentBio)} // Save on blur
              rows={3}
              placeholder="Tell us about yourself..."
              className="w-full p-2 text-sm bg-[#1e1e1e] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9500FF] resize-y"
            ></textarea>
          </div>

          {/* Full Profile Link */}
          <div className="text-center mt-4">
            <a
              href="/profile"
              className="px-4 py-2 bg-[#fe019a] text-white font-bold text-sm rounded-xl hover:bg-[#d0017e] transition shadow-md"
            >
              Go to Full Profile
            </a>
          </div>
        </div>
      )}
    </div>
  );
}