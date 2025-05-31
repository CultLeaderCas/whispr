// pulse.tsx - Consolidated Layout and Components

import { useEffect, useState, useRef, JSX } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming this path is correct
import { useRouter } from 'next/router';
import Image from 'next/image';
import AddFriendsDropdown from '@/components/AddFriendsDropdown';
import MyProfileCorner from '@/components/MyProfileCorner';
import NotificationBell from '@/components/NotificationBell'; // Now imported, not defined in this file

// Define a Profile interface for better type safety
interface Profile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  themeColor?: string; // Re-introduced for dynamic border color
  online_status?: 'online' | 'away' | 'dnd' | 'offline'; // Used for glow and status text
  bio?: string;
  public_status?: string;
}

// --- StatusGlowStyles (Re-introduced for dynamic glow effects) ---
const statusGlowStyles = {
  online: '0 0 0 2px #22C55E, 0 0 10px 5px rgba(34,197,94,0.7)',
  away: '0 0 0 2px #F59E0B, 0 0 10px 5px rgba(245,158,11,0.7)',
  dnd: '0 0 0 2px #EF4444, 0 0 10px 5px rgba(239,68,68,0.7)',
  offline: '0 0 0 2px #6B7280, 0 0 8px 3px rgba(107,114,128,0.5)',
};

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  const [stars, setStars] = useState<JSX.Element[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]); // Use Profile interface
  const [currentUsersProfile, setCurrentUsersProfile] = useState<Profile | null>(null);
  const router = useRouter();
  const [nodes, setNodes] = useState<any[]>([]);

  // Simulate fetching nodes from database
  useEffect(() => {
    const fetchNodes = async () => {
      const { data, error } = await supabase.from('nodes').select('*');
      if (error) {
        console.error('Error fetching nodes:', error.message);
      } else {
        setNodes(data || []);
      }
    };

    fetchNodes();
  }, []);

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
        // router.push('/login'); // Consider redirecting if no user, but avoid blocking layout
        return;
      }

      // Only fetch if no profile or if user ID has changed (e.g., after login/logout)
      if (currentUsersProfile && currentUsersProfile.id === user.id) {
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.warn('⚠️ No profile found for current user, or error:', profileError?.message);
        setCurrentUsersProfile(null);
        // router.push('/onboarding'); // Consider redirecting to onboarding if no profile
        return;
      }
      setCurrentUsersProfile(profile as Profile);
    };

    if (router.isReady) { // Ensure router is ready before fetching, especially for user-dependent logic
      fetchCurrentUsersProfile();
    }
  }, [router.isReady, currentUsersProfile?.id]); // Depend on router.isReady and currentUsersProfile.id for efficient re-fetches

  // --- Existing Friends Fetch useEffect ---
  useEffect(() => {
    const fetchFriends = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) {
        setFriends([]);
        return;
      }

      const { data: friendLinks, error: friendLinksError } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);

      if (friendLinksError) {
        console.error("Error fetching friend links:", friendLinksError.message);
        setFriends([]);
        return;
      }

      const friendIds = friendLinks?.map(f => f.friend_id) || [];
      if (friendIds.length === 0) {
        setFriends([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      if (profilesError) {
        console.error("Error fetching friend profiles:", profilesError.message);
        setFriends([]);
        return;
      }
      setFriends(profiles as Profile[] || []);
    };

    fetchFriends();
  }, []); // Empty dependency array means this runs once on mount to fetch initial friends

  // --- Real-time updates for friends' profiles ---
  useEffect(() => {
    // This effect should ideally re-run only if the *list of friend IDs* changes,
    // not if the friend objects themselves change.
    // To do this, we need to extract friend IDs from the `friends` state.
    const friendIds = friends.map(f => f.id);
    if (friendIds.length === 0) {
      console.log('No friends to subscribe to for real-time updates.');
      return;
    }

    const filterString = `id=in.(${friendIds.join(',')})`;
    console.log(`Subscribing to friend profile updates with filter: ${filterString}`);

    const channel = supabase
      .channel('friends_profiles_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: filterString
      }, payload => {
        console.log('Realtime friend profile update received!', payload.new);
        setFriends(prevFriends =>
          prevFriends.map(friend =>
            friend.id === payload.new.id ? { ...friend, ...(payload.new as Profile) } : friend
          )
        );
      })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to friends_profiles_updates channel');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Subscription error for friends_profiles_updates:', err);
        }
      });

    return () => {
      console.log('Unsubscribing from friends_profiles_updates channel.');
      supabase.removeChannel(channel);
    };
  }, [JSON.stringify(friends.map(f => f.id))]); // Re-subscribe only if friend IDs change

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
        <div className="w-[220px] bg-[#111] border-r border-[#333] p-4 space-y-4 overflow-y-auto relative">
          {/* Title and Create Button Row */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold">Nodes</h3>
            <button
              onClick={() => router.push('/nodes/create')}
              className="text-xs text-black font-bold bg-[#12f7ff] hover:bg-[#0fd0e0] transition px-2 py-1 rounded-lg shadow flex items-center gap-1"
              title="Create Node"
            >
              <span>Create</span> <span className="text-lg">➕</span>
            </button>
          </div>

          {/* Dynamic Node List */}
          <div className="space-y-3">
            {Array.isArray(nodes) && nodes.length === 0 ? (
              <p className="text-sm text-[#888] italic">No nodes yet.</p>
            ) : (
              nodes.map((node: any) => (
                <div
                  key={node.id}
                  className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-xl transition cursor-pointer"
                  onClick={() => router.push(`/nodes/${node.id}`)}
                >
                  <Image
                    src={node.icon || '/default-node.png'}
                    className="w-10 h-10 rounded-full border border-[#9500FF]"
                    alt="Node Icon"
                    width={40}
                    height={40}
                  />
                  <span className="text-sm font-bold truncate">{node.name}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center Panel – Friends */}
        <div className="flex-1 p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Friends</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="bg-[#1e1e1e] p-4 rounded-2xl shadow-lg hover:bg-[#272727] transition cursor-pointer"
                onClick={() => handleFriendCardClick(friend.id)}
              >
                <div
                  className={`relative w-16 h-16 rounded-full overflow-hidden mx-auto mb-2 transition-shadow duration-200 ease-in-out`}
                  style={{
                    boxShadow: statusGlowStyles[(friend.online_status as keyof typeof statusGlowStyles) || 'offline'],
                    border: `2px solid ${friend.themeColor || '#12f7ff'}`
                  }}
                >
                  <Image
                    src={friend.profileImage || '/default-avatar.png'}
                    alt={friend.displayName || 'Friend'}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <p className="font-bold">{friend.displayName || 'Unknown'}</p>
                  <p className="text-sm text-[#aaa]">@{friend.username}</p>
                  {friend.public_status && (
                    <p className="text-xs italic text-[#9500FF] mt-1 truncate">
                      {friend.public_status}
                    </p>
                  )}
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
            </div>
          )}

          <div className="mt-6 w-full flex justify-center items-center space-x-2">
            <AddFriendsDropdown />
            <NotificationBell />
          </div>

          <div className="mt-6 pt-6 border-t border-[#333] w-full text-center">
            <h4 className="text-sm font-bold mb-2">Now Playing</h4>
            <div className="bg-[#1a1a1a] p-3 rounded-xl text-sm text-[#ccc]">
              🎵 No song playing<br />
              {currentUsersProfile?.online_status ? (
                <span
                  className={`capitalize ${
                    currentUsersProfile.online_status === 'online'
                      ? 'text-green-400'
                      : currentUsersProfile.online_status === 'dnd'
                        ? 'text-red-400'
                        : currentUsersProfile.online_status === 'away'
                          ? 'text-yellow-400'
                          : 'text-gray-400'
                  }`}
                >
                  {currentUsersProfile.online_status === 'online' && '🍏 Online'}
                  {currentUsersProfile.online_status === 'dnd' && '🍒 Do Not Disturb'}
                  {currentUsersProfile.online_status === 'away' && '🌙 Away'}
                  {currentUsersProfile.online_status === 'offline' && '👾 Offline'}
                </span>
              ) : (
                <span className="text-gray-400">👾 Offline</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MyProfileCorner */}
      <MyProfileCorner />
    </div>
  );
}
