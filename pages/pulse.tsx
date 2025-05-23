// pulse.tsx - Consolidated Layout and Components

import { useEffect, useState, useRef, JSX } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Image from 'next/image';

// Define a Profile interface for better type safety
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

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  const [stars, setStars] = useState<JSX.Element[]>([]);
  const [friends, setFriends] = useState<Profile[]>([]); // Use Profile interface
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
        // router.push('/login'); // Consider redirecting if no user
        return;
      }

      // Avoid re-fetching if profile already loaded and matches current user
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
  }, [router.isReady, currentUsersProfile]); // Added currentUsersProfile to dependency to prevent re-fetch if already loaded

  // --- Existing Friends Fetch useEffect ---
  useEffect(() => {
    const fetchFriends = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) return;

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
  }, []);


  // --- NEW: Real-time updates for friends' profiles ---
  useEffect(() => {
    if (friends.length === 0) return;

    const friendIds = friends.map(f => f.id);
    if (friendIds.length === 0) return; // Ensure there are IDs to filter by
    const filterString = `id=in.(${friendIds.join(',')})`;

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
      .subscribe((status, err) => { // Optional: Handle subscription status/errors
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to friends_profiles_updates channel');
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('Subscription error for friends_profiles_updates:', err);
        }
      });

    return () => {
      console.log('Unsubscribing from friends_profiles_updates channel.');
      supabase.removeChannel(channel); // Use removeChannel for cleanup
    };
  }, [friends]); // Re-subscribe if the `friends` array identity changes


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
                        boxShadow: statusGlowStyles[(friend.online_status as keyof typeof statusGlowStyles) || 'offline'], // Friend cards still show status glow
                        border: `2px solid ${friend.themeColor || '#12f7ff'}` // Friend cards still show theme color
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
                style={{ borderColor: currentUsersProfile.themeColor || '#12f7ff' }} // Right panel still shows theme color for now
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
              {/* Display current user's online status from right panel profile if available */}
              {currentUsersProfile?.online_status ? (
                <span className={`capitalize ${currentUsersProfile.online_status === 'online' ? 'text-green-400' : currentUsersProfile.online_status === 'dnd' ? 'text-red-400' : currentUsersProfile.online_status === 'away' ? 'text-yellow-400' : 'text-gray-400'}`}>
                  🟢 {currentUsersProfile.online_status}
                </span>
              ) : (
                <span className="text-gray-400">⚪ Offline</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MyProfileCorner (now defined below) */}
      <MyProfileCorner />
    </div>
  );
}

// --- StatusGlowStyles (can be shared or defined per component) ---
const statusGlowStyles = {
  online: '0 0 0 2px #22C55E, 0 0 10px 5px rgba(34,197,94,0.7)',
  away: '0 0 0 2px #F59E0B, 0 0 10px 5px rgba(245,158,11,0.7)',
  dnd: '0 0 0 2px #EF4444, 0 0 10px 5px rgba(239,68,68,0.7)',
  offline: '0 0 0 2px #6B7280, 0 0 8px 3px rgba(107,114,128,0.5)',
};


function MyProfileCorner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [currentBio, setCurrentBio] = useState('');
  const [currentPublicStatus, setCurrentPublicStatus] = useState('');
  const [currentOnlineStatus, setCurrentOnlineStatus] = useState<'online' | 'away' | 'dnd' | 'offline'>('offline');


  // 1. Fetch User Profile
  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component

    const fetchMyProfile = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError) {
        console.error('🔒 Auth error fetching user for MyProfileCorner:', userError.message);
        return;
      }

      if (!user) {
        console.warn('⚠️ No user found in session for MyProfileCorner');
        setProfile(null);
        // router.push('/join'); // Removed automatic redirect to avoid issues if component is used in unauth pages
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        console.warn('⚠️ No profile found for MyProfileCorner user:', error?.message);
        setProfile(null);
        // router.push('/join'); // Removed automatic redirect
        return;
      }

      setProfile(data as Profile);
      setCurrentBio(data.bio || '');
      setCurrentPublicStatus(data.public_status || '');
      setCurrentOnlineStatus(data.online_status || 'offline');
    };

    if (router.isReady) { // Ensure router is ready
        fetchMyProfile();
    }

    // Realtime subscription for current user's own profile changes
    const profileId = profile?.id; // Get profile ID from state *after* it might have been set
    let channel: any = null;

    if (profileId) { // Only subscribe if profileId is available
        channel = supabase
            .channel(`my_profile_changes:${profileId}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profileId}` }, payload => {
                if (!isMounted) return;
                console.log('Realtime my profile update received!', payload.new);
                const newProfile = payload.new as Profile;
                setProfile(newProfile);
                setCurrentBio(newProfile.bio || '');
                setCurrentPublicStatus(newProfile.public_status || '');
                setCurrentOnlineStatus(newProfile.online_status || 'offline');
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`Subscribed to my_profile_changes:${profileId}`);
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error for my_profile_changes:${profileId}:`, err);
            });
    }

    return () => {
      isMounted = false;
      if (channel) {
        console.log('Unsubscribing from my_profile_changes channel.');
        supabase.removeChannel(channel);
      }
    };
  }, [router.isReady, profile?.id]); // Re-run if router is ready or if profile.id changes (e.g., after initial fetch)


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
  const handleUpdateProfile = async (field: keyof Profile, value: any) => {
    if (!profile?.id) {
      console.warn('Attempted to update profile without a valid user ID.');
      return;
    }

    // Optimistically update the local profile state FIRST
    setProfile(prev => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
    // Also update specific state if needed (e.g., currentOnlineStatus)
    if (field === 'online_status') setCurrentOnlineStatus(value);
    if (field === 'bio') setCurrentBio(value);
    if (field === 'public_status') setCurrentPublicStatus(value);


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
      // Optional: Revert optimistic update or re-fetch if there's a critical error
      // fetchMyProfile(); // Be cautious with re-fetching to avoid loops
    } else {
      console.log(`✅ ${field} updated successfully.`);
    }
  };

  const handleOnlineStatusChange = (status: 'online' | 'away' | 'dnd' | 'offline') => {
    handleUpdateProfile('online_status', status);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentBio(e.target.value);
    // Debounce is good, but for simplicity in this refactor, direct update on blur/enter is also an option
    // For immediate feedback, we can update on change and then debounce the Supabase call
  };

  const handlePublicStatusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPublicStatus(e.target.value);
  };

  // Debounce for bio and public status updates
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounceUpdate = (value: string, field: 'bio' | 'public_status') => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      handleUpdateProfile(field, value);
    }, 700); // Increased debounce time slightly
  };

  const debouncedUpdateBio = (value: string) => debounceUpdate(value, 'bio');
  const debouncedUpdatePublicStatus = (value: string) => debounceUpdate(value, 'public_status');


  if (!profile) {
    // Render a placeholder or nothing if profile is not yet loaded
    // This prevents errors if profile is null initially
    return (
        <div className="fixed bottom-5 right-5 z-50">
            <div className="bg-[#111] border border-[#333] text-white rounded-2xl shadow-xl p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#1e1e1e]">
                <div className="w-12 h-12 rounded-full bg-gray-700 animate-pulse flex-shrink-0"></div>
                <div className="flex flex-col">
                    <div className="h-4 bg-gray-700 rounded w-20 mb-1 animate-pulse"></div>
                    <div className="h-3 bg-gray-700 rounded w-16 animate-pulse"></div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Main Profile Card - Click Target */}
      <div
        className="bg-[#111] border border-[#333] text-white rounded-2xl shadow-xl p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#1e1e1e] transition-all duration-200 backdrop-blur-md"
        onClick={() => setShowSettings(!showSettings)}
      >
        {/* Profile Image - REMOVED themeColor border and online status glow */}
        <div
          className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-transparent`} // Using transparent border to maintain layout, or use border-[#444] for a subtle fixed border
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
          {/* REMOVED public_status (quick bio) from here */}
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

          {/* Profile Mirror in Pop-out - REMOVED themeColor border and online status glow */}
          <div className="flex items-center space-x-3 mb-4 border-b border-[#222] pb-3">
             <div
                className={`w-14 h-14 rounded-full overflow-hidden flex-shrink-0 border-2 border-transparent`} // Consistent with the main card
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

          {/* Online Status Selector - REMAINS FUNCTIONAL */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Online Status</label>
            <div className="flex justify-around space-x-1 sm:space-x-2"> {/* Adjusted space for smaller buttons */}
              {(['online', 'away', 'dnd', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleOnlineStatusChange(status)}
                  title={status.charAt(0).toUpperCase() + status.slice(1)} // Tooltip for status
                  className={`flex-1 p-1.5 sm:p-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200
                    ${currentOnlineStatus === status ? 'ring-2 ring-offset-1 ring-offset-[#111]' : 'opacity-70 hover:opacity-100'}
                    ${status === 'online' ? `bg-green-600 hover:bg-green-500 text-white ${currentOnlineStatus === status ? 'ring-green-400' : ''}` : ''}
                    ${status === 'away' ? `bg-yellow-500 hover:bg-yellow-400 text-white ${currentOnlineStatus === status ? 'ring-yellow-300' : ''}` : ''}
                    ${status === 'dnd' ? `bg-red-600 hover:bg-red-500 text-white ${currentOnlineStatus === status ? 'ring-red-400' : ''}` : ''}
                    ${status === 'offline' ? `bg-gray-600 hover:bg-gray-500 text-white ${currentOnlineStatus === status ? 'ring-gray-400' : ''}` : ''}
                  `}
                >
                  {/* Using icons or shorter text for smaller buttons could be an option too */}
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Public Status Input - REMAINS FUNCTIONAL */}
          <div className="mb-4">
            <label htmlFor="publicStatus" className="block text-sm font-semibold mb-1">
              Quick Status
            </label>
            <input
              id="publicStatus"
              type="text"
              value={currentPublicStatus}
              onChange={handlePublicStatusChange}
              onBlur={() => debouncedUpdatePublicStatus(currentPublicStatus)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  debouncedUpdatePublicStatus(currentPublicStatus);
                  e.currentTarget.blur();
                }
              }}
              maxLength={50}
              placeholder="What are you up to?"
              className="w-full p-2 text-sm bg-[#1e1e1e] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9500FF]"
            />
            <p className="text-right text-xs text-[#666] mt-1">{currentPublicStatus.length}/50</p>
          </div>

          {/* Bio Textarea - REMAINS FUNCTIONAL */}
          <div className="mb-4">
            <label htmlFor="bio" className="block text-sm font-semibold mb-1">
              Bio
            </label>
            <textarea
              id="bio"
              value={currentBio}
              onChange={handleBioChange}
              onBlur={() => debouncedUpdateBio(currentBio)}
              rows={3}
              maxLength={150} // Added maxLength for bio as well
              placeholder="Tell us about yourself..."
              className="w-full p-2 text-sm bg-[#1e1e1e] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9500FF] resize-y"
            ></textarea>
             <p className="text-right text-xs text-[#666] mt-1">{currentBio.length}/150</p>
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


// --- NotificationBell Component (now internal to PulseLayout.tsx) ---
function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    let isMounted = true;
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*, from_user:from_user_id (id, displayName, username, profileImage)') // Fetch more from_user details
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (!isMounted) return;
      if (error) {
        console.error("Error fetching notifications:", error.message);
      } else {
        setNotifications(data || []);
      }
    };

    fetchNotifications(); // Initial fetch
    const interval = setInterval(fetchNotifications, 15000); // Fetch periodically

    // Realtime subscription for new notifications
    const userId = supabase.auth.getSession()?.data.session?.user.id;
    let notificationChannel: any = null;
    if (userId) {
        notificationChannel = supabase
            .channel(`notifications:${userId}`)
            .on('postgres_changes', {
                event: '*', // Listen to INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'notifications',
                filter: `to_user_id=eq.${userId}`
            }, payload => {
                console.log('Realtime notification event:', payload);
                fetchNotifications(); // Re-fetch notifications on any change
            })
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`Subscribed to notifications:${userId}`);
                if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error for notifications:${userId}:`, err);
            });
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (notificationChannel) supabase.removeChannel(notificationChannel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('button[title="Notifications"]')) {
            setShowPanel(false);
        }
    };
    if (showPanel) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPanel]);


  const markAsRead = async (id: string) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) console.error("Error marking as read:", error.message);
    else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    }
  };

  const handleCardClick = async (note: any) => {
    const fromId = note.from_user?.id ?? note.from_user_id;
    await markAsRead(note.id); // Mark as read first

    // Navigate based on notification type
    if (note.type === 'friend_request' || note.type === 'profile_view') { // Example types
        setIsFadingOut(true);
        setTimeout(() => {
            router.push(`/profile/${fromId}`); // Use router.push for Next.js navigation
            setShowPanel(false); // Close panel after navigation
            setIsFadingOut(false);
        }, 300);
    } else if (note.type === 'new_message' && note.related_entity_id) { // Example for messages
        setIsFadingOut(true);
        setTimeout(() => {
            router.push(`/chat/${note.related_entity_id}`); // Navigate to chat
            setShowPanel(false);
            setIsFadingOut(false);
        }, 300);
    } else {
        // Default behavior or other types
        setShowPanel(false);
    }
  };


  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="relative">
      <style jsx>{`
        .fade-out { animation: fadeOut 0.3s ease forwards; }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.98); }
        }
        .animate-pop-in-notif { animation: popInNotif 0.2s ease-out forwards; }
        @keyframes popInNotif {
            0% { opacity: 0; transform: scale(0.95) translateY(-10px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <button
        className="text-3xl relative hover:scale-110 transition focus:outline-none"
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#fe019a] text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-md flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div
          ref={panelRef}
          className={`absolute right-0 mt-2 w-80 sm:w-96 bg-[#111] border border-[#333] text-white rounded-xl p-4 shadow-xl z-50 backdrop-blur-md animate-pop-in-notif ${
            isFadingOut ? "fade-out" : ""
          }`}
        >
          <h3 className="text-lg font-bold mb-3 border-b border-[#222] pb-2">Notifications</h3>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1"> {/* Added pr-1 for scrollbar space */}
            {notifications.length === 0 && (
              <p className="text-sm text-[#888] italic text-center py-4">
                You have no new notifications.
              </p>
            )}
            {notifications.map((note) => {
              const name = note.from_user?.displayName || "Someone";
              const profileImg = note.from_user?.profileImage || '/default-avatar.png';
              return (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg transition-all duration-150 cursor-pointer flex items-start space-x-3
                    ${ note.is_read ? "bg-[#1a1a1a] hover:bg-[#202020]" : "bg-[#272727] hover:bg-[#2d2d2d] border border-[#444] hover:border-[#555]" }
                  `}
                  onClick={() => handleCardClick(note)}
                >
                  <Image src={profileImg} alt={name} width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-[#444]" />
                  <div className="flex-1">
                    <p className={`text-sm ${note.is_read ? 'text-[#aaa]' : 'text-white'}`}>
                      <span className="font-semibold">{name}</span>{" "}
                      {note.type === 'friend_request' ? 'sent you a friend request.' : note.message || 'has an update for you.'}
                    </p>
                    <p className="text-xs text-[#666] mt-0.5">
                      {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(note.created_at).toLocaleDateString([], { month: 'short', day: 'numeric'})}
                    </p>
                  </div>
                  {!note.is_read && (
                    <span className="w-2.5 h-2.5 bg-[#12f7ff] rounded-full flex-shrink-0 mt-1 self-center" title="Unread"></span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- AddFriendsDropdown Component (now internal to PulseLayout.tsx) ---
function AddFriendsDropdown() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]); // Use Profile interface
  const [adding, setAdding] = useState<string | null>(null); // Store ID of user being added
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string, userId?: string} | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    const fetchUsers = async () => {
      const search = query.trim().toLowerCase();
      if (search === '') {
        setResults([]);
        return;
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
          setResults([]);
          return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, displayName, profileImage') // Select only necessary fields
        .or(`username.ilike.%${search}%,displayName.ilike.%${search}%`)
        .not('id', 'eq', currentUser.id) // Exclude current user from results
        .limit(10); // Limit results

      if (error) {
        console.error('❌ Supabase Error fetching users:', error.message);
        setResults([]);
      } else {
        setResults(data as Profile[] || []);
      }
    };

    const debounce = setTimeout(fetchUsers, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('button > svg')) { // Check for svg if button has icon
            setShowDropdown(false);
        }
    };
    if (showDropdown) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleAddFriend = async (toUser: Profile) => {
    setAdding(toUser.id);
    setFeedback(null);

    const { data: { user: fromUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !fromUser) {
      setFeedback({type: 'error', message: 'You must be logged in.', userId: toUser.id});
      setAdding(null);
      return;
    }

    if (fromUser.id === toUser.id) {
      setFeedback({type: 'error', message: "You can't add yourself!", userId: toUser.id});
      setAdding(null);
      return;
    }

    // Check if a request already exists or if they are already friends
    const { data: existingRequest, error: checkError } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`(from_user_id.eq.${fromUser.id},to_user_id.eq.${toUser.id}),(from_user_id.eq.${toUser.id},to_user_id.eq.${fromUser.id})`)
        .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
        console.error('Error checking existing request:', checkError);
        setFeedback({ type: 'error', message: 'Error checking request.', userId: toUser.id });
        setAdding(null);
        return;
    }

    if (existingRequest) {
        if (existingRequest.status === 'pending') {
            setFeedback({ type: 'info', message: 'Request already pending.', userId: toUser.id } as any);
        } else if (existingRequest.status === 'accepted') {
            setFeedback({ type: 'info', message: 'Already friends.', userId: toUser.id } as any);
        } else if (existingRequest.status === 'declined' || existingRequest.status === 'blocked') {
            setFeedback({ type: 'error', message: 'Cannot send request.', userId: toUser.id });
        }
        setAdding(null);
        return;
    }


    const { error: friendError } = await supabase
      .from('friend_requests')
      .insert([{ from_user_id: fromUser.id, to_user_id: toUser.id, status: 'pending' }]);

    if (friendError) {
      console.error('❌ Add friend error:', friendError.message);
      setFeedback({type: 'error', message: 'Failed to send request.', userId: toUser.id});
      setAdding(null);
      return;
    }

    // Notification for the recipient
    const { data: fromUserProfile } = await supabase.from('profiles').select('displayName').eq('id', fromUser.id).single();
    const displayName = fromUserProfile?.displayName || 'Someone';

    const { error: notifyError } = await supabase.from('notifications').insert([
      {
        to_user_id: toUser.id,
        from_user_id: fromUser.id,
        message: `${displayName} sent you a friend request!`,
        type: 'friend_request',
        is_read: false,
        // related_entity_id: fromUser.id // Could link back to sender's profile
      }
    ]);

    if (notifyError) {
      console.error('⚠️ Notification failed for friend request:', notifyError.message);
    }

    setAdding(null);
    setFeedback({type: 'success', message: 'Request Sent!', userId: toUser.id});
    setTimeout(() => setFeedback(null), 3000); // Clear feedback after 3s
  };

  const handleViewProfile = (userId: string) => {
    router.push(`/profile/${userId}`); // Use Next.js router
    setShowDropdown(false); // Close dropdown on navigation
  };

  return (
    <div className="relative flex-grow">
      <button
        onClick={() => { setShowDropdown(!showDropdown); if (!showDropdown) setQuery(''); setResults([]); setFeedback(null); }}
        className="w-full bg-[#12f7ff] text-[#111] font-bold px-4 py-2 rounded-xl hover:bg-[#0fd0d0] transition shadow-lg text-sm flex items-center justify-center space-x-2"
        title="Add or find friends"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        <span>Add Friends</span>
      </button>

      {showDropdown && (
        <div ref={dropdownRef} className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-[#111] border border-[#333] rounded-xl p-4 shadow-xl backdrop-blur-sm z-50 w-80 animate-pop-in-notif">
          <input
            type="text"
            placeholder="Search by username or display name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-3 py-2 mb-3 bg-[#1e1e1e] text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#9500FF] text-sm"
            autoFocus
          />

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1"> {/* Added pr-1 for scrollbar */}
            {results.map((user) => (
              <div key={user.id} className="flex items-center bg-[#1a1a1a] p-2.5 rounded-xl hover:bg-[#222] transition">
                <Image
                  src={user.profileImage || '/default-avatar.png'}
                  alt={user.displayName || user.username}
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full mr-3 object-cover border border-[#444]"
                />
                <div className="flex-1 min-w-0"> {/* min-w-0 for truncation */}
                  <p className="text-white font-semibold text-sm truncate">{user.displayName}</p>
                  <p className="text-xs text-[#aaa] truncate">@{user.username}</p>
                </div>
                {feedback && feedback.userId === user.id ? (
                    <span className={`ml-2 text-xs px-2 py-1 rounded-md ${feedback.type === 'success' ? 'text-green-300' : feedback.type === 'error' ? 'text-red-300' : 'text-blue-300'}`}>
                        {feedback.message}
                    </span>
                ) : (
                <>
                    <button
                        className="ml-2 px-2.5 py-1 bg-[#12f7ff] text-[#111] rounded-lg text-xs font-bold hover:bg-[#0fd0d0] transition-transform hover:scale-105 disabled:opacity-50"
                        disabled={adding === user.id}
                        onClick={() => handleAddFriend(user)}
                    >
                        {adding === user.id ? '...' : 'Add'}
                    </button>
                    <button
                        className="ml-1.5 px-2.5 py-1 bg-[#9500FF] text-white text-xs rounded-lg font-bold hover:bg-[#7a00cc] transition-transform hover:scale-105"
                        onClick={() => handleViewProfile(user.id)}
                        title={`View ${user.displayName}'s profile`}
                    >
                        View
                    </button>
                </>
                )}
              </div>
            ))}

            {results.length === 0 && query && (
              <p className="text-sm text-[#888] italic text-center py-3">No users found matching "{query}".</p>
            )}
             {results.length === 0 && !query && (
              <p className="text-sm text-[#888] italic text-center py-3">Start typing to find users.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}