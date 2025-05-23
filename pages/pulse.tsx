// pulse.tsx - Consolidated Layout and Components

import { useEffect, useState, useRef, JSX } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming this path is correct
import { useRouter } from 'next/router';
import Image from 'next/image';

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
                    boxShadow: statusGlowStyles[(friend.online_status as keyof typeof statusGlowStyles) || 'offline'], // Re-added status glow
                    border: `2px solid ${friend.themeColor || '#12f7ff'}` // Re-added theme color border
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
                style={{ borderColor: currentUsersProfile.themeColor || '#12f7ff' }} // Re-added theme color border
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

      {/* MyProfileCorner */}
      <MyProfileCorner />
    </div>
  );
}


function MyProfileCorner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [currentBio, setCurrentBio] = useState('');
  const [currentPublicStatus, setCurrentPublicStatus] = useState('');
  const [currentOnlineStatus, setCurrentOnlineStatus] = useState<'online' | 'away' | 'dnd' | 'offline'>('offline');


  // 1. Fetch User Profile and setup Realtime Subscription for own profile
  useEffect(() => {
    let isMounted = true; // To prevent state updates on unmounted component
    let channel: any = null;

    const setupProfileAndSubscription = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError) {
        console.error('🔒 Auth error fetching user for MyProfileCorner:', userError.message);
        setProfile(null);
        return;
      }

      if (!user) {
        console.warn('⚠️ No user found in session for MyProfileCorner');
        setProfile(null);
        // Do NOT redirect here, as this component is part of the layout
        return;
      }

      // Fetch initial profile data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        console.warn('⚠️ No profile found for MyProfileCorner user, or error:', error?.message);
        setProfile(null);
        // Do NOT redirect here
        return;
      }

      setProfile(data as Profile);
      setCurrentBio(data.bio || '');
      setCurrentPublicStatus(data.public_status || '');
      setCurrentOnlineStatus(data.online_status || 'offline');

      // Setup Realtime subscription after initial fetch
      if (!channel) { // Only subscribe once
        channel = supabase
          .channel(`my_profile_changes:${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, payload => {
            if (!isMounted) return;
            console.log('Realtime my profile update received!', payload.new);
            const newProfile = payload.new as Profile;
            setProfile(newProfile);
            setCurrentBio(newProfile.bio || '');
            setCurrentPublicStatus(newProfile.public_status || '');
            setCurrentOnlineStatus(newProfile.online_status || 'offline');
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') console.log(`Subscribed to my_profile_changes:${user.id}`);
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error for my_profile_changes:${user.id}:`, err);
          });
      }
    };

    if (router.isReady) { // Ensure router is ready before fetching
      setupProfileAndSubscription();
    }

    return () => {
      isMounted = false;
      if (channel) {
        console.log('Unsubscribing from my_profile_changes channel.');
        supabase.removeChannel(channel);
        channel = null; // Clear the channel reference
      }
    };
  }, [router.isReady]); // Depend only on router.isReady to ensure it runs once when the app is ready

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
      updated_at: new Date().toISOString(), // Always update timestamp
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (error) {
      console.error(`❌ Error updating ${field}:`, error.message);
      // Optional: Revert optimistic update or re-fetch if there's a critical error
      // A realtime subscription will eventually correct this if the DB update failed
    } else {
      console.log(`✅ ${field} updated successfully.`);
    }
  };

  const handleOnlineStatusChange = (status: 'online' | 'away' | 'dnd' | 'offline') => {
    handleUpdateProfile('online_status', status);
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentBio(e.target.value);
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
    }, 700); // Debounce time
  };

  const debouncedUpdateBio = (value: string) => debounceUpdate(value, 'bio');
  const debouncedUpdatePublicStatus = (value: string) => debounceUpdate(value, 'public_status');


  if (!profile) {
    // Render a placeholder or nothing if profile is not yet loaded
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
        {/* Profile Image with themeColor border and online status glow */}
        <div
          className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 transition-shadow duration-200 ease-in-out`}
          style={{
            boxShadow: statusGlowStyles[profile.online_status || 'offline'], // Re-added status glow
            border: `2px solid ${profile.themeColor || '#12f7ff'}` // Re-added theme color border
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
          {/* Public status is now visible here as well */}
          {profile.public_status && (
            <p className="text-xs italic text-[#9500FF] mt-1 truncate">
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

          {/* Profile Mirror in Pop-out with themeColor border and online status glow */}
          <div className="flex items-center space-x-3 mb-4 border-b border-[#222] pb-3">
            <div
              className={`relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 transition-shadow duration-200 ease-in-out`}
              style={{
                boxShadow: statusGlowStyles[profile.online_status || 'offline'], // Re-added status glow
                border: `2px solid ${profile.themeColor || '#12f7ff'}` // Re-added theme color border
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

          {/* Online Status Selector - REMAINS FUNCTIONAL */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Online Status</label>
            <div className="flex justify-around space-x-1 sm:space-x-2">
              {(['online', 'away', 'dnd', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleOnlineStatusChange(status)}
                  title={status.charAt(0).toUpperCase() + status.slice(1)}
                  className={`flex-1 p-1.5 sm:p-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200
                    ${currentOnlineStatus === status ? 'ring-2 ring-offset-1 ring-offset-[#111]' : 'opacity-70 hover:opacity-100'}
                    ${status === 'online' ? `bg-green-600 hover:bg-green-500 text-white ${currentOnlineStatus === status ? 'ring-green-400' : ''}` : ''}
                    ${status === 'away' ? `bg-yellow-500 hover:bg-yellow-400 text-white ${currentOnlineStatus === status ? 'ring-yellow-300' : ''}` : ''}
                    ${status === 'dnd' ? `bg-red-600 hover:bg-red-500 text-white ${currentOnlineStatus === status ? 'ring-red-400' : ''}` : ''}
                    ${status === 'offline' ? `bg-gray-600 hover:bg-gray-500 text-white ${currentOnlineStatus === status ? 'ring-gray-400' : ''}` : ''}
                  `}
                >
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
              maxLength={150}
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


// --- NotificationBell Component ---
function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter(); // Use useRouter here as well

  useEffect(() => {
    let isMounted = true;
    let notificationChannel: any = null; // Declare channel here

    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !isMounted) return;

      const { data, error } = await supabase
        .from('notifications')
        .select('*, from_user:from_user_id (id, displayName, username, profileImage)')
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
    const setupNotificationSubscription = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
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
            // Instead of re-fetching all, you could also optimistically update based on payload.new
            // For simplicity and robustness, re-fetching is fine for notifications.
            fetchNotifications();
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') console.log(`Subscribed to notifications:${userId}`);
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error for notifications:${userId}:`, err);
          });
      }
    };
    setupNotificationSubscription();

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (notificationChannel) supabase.removeChannel(notificationChannel);
    };
  }, []); // Empty dependency array, runs once on mount

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
    const fromId = note.from_user?.id ?? note.from_user_id; // Prefer linked user ID if available
    await markAsRead(note.id); // Mark as read first

    // Navigate based on notification type
    if (note.type === 'friend_request' || note.type === 'profile_view') {
      setIsFadingOut(true);
      setTimeout(() => {
        router.push(`/profile/${fromId}`);
        setShowPanel(false);
        setIsFadingOut(false);
      }, 300);
    } else if (note.type === 'new_message' && note.related_entity_id) {
      setIsFadingOut(true);
      setTimeout(() => {
        router.push(`/chat/${note.related_entity_id}`);
        setShowPanel(false);
        setIsFadingOut(false);
      }, 300);
    } else {
      // Default behavior or other types, just close panel
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
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #222;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #555;
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #777;
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
          {notifications.length === 0 ? (
            <p className="text-center text-[#888]">No notifications yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              {notifications.map((note) => (
                <div
                  key={note.id}
                  className={`flex items-start p-3 rounded-lg mb-2 cursor-pointer transition ${
                    note.is_read ? 'bg-[#1a1a1a] text-[#aaa]' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'
                  }`}
                  onClick={() => handleCardClick(note)}
                >
                  <Image
                    src={note.from_user?.profileImage || '/default-avatar.png'}
                    alt="Sender"
                    width={32}
                    height={32}
                    className="rounded-full mr-3 flex-shrink-0 object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold leading-tight">
                      {note.from_user?.displayName || 'Someone'}{' '}
                      <span className="font-normal text-[#bbb]">{note.message}</span>
                    </p>
                    <p className="text-xs text-[#888] mt-1">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!note.is_read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click from triggering
                        markAsRead(note.id);
                      }}
                      className="ml-2 px-2 py-1 bg-[#9500FF] text-white text-xs rounded-full hover:bg-[#7a00d0] transition flex-shrink-0"
                      title="Mark as Read"
                    >
                      ✔
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- AddFriendsDropdown component ---
function AddFriendsDropdown() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [friendIdentifier, setFriendIdentifier] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) && !(event.target as HTMLElement).closest('button[title="Add Friends"]')) {
        setShowDropdown(false);
        setSearchResult(null); // Clear search result when closing
        setFriendIdentifier('');
        setMessage('');
      }
    };
    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchResult(null);
    setMessage('');
    if (!friendIdentifier.trim()) {
      setMessage('Please enter a username or ID.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage('You must be logged in to search for friends.');
      return;
    }

    // Prevent searching for self
    if (
      friendIdentifier.toLowerCase() === (user.user_metadata?.user_name?.toLowerCase?.() ?? '') ||
      friendIdentifier === user.id
    ) {
      setMessage('You cannot add yourself as a friend.');
      return;
    }

    // Search by username or ID
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.eq.${friendIdentifier},id.eq.${friendIdentifier}`);

    if (error) {
      console.error("Error searching for friend:", error.message);
      setMessage('Error searching for user.');
      return;
    }

    if (profiles && profiles.length > 0) {
      const foundProfile = profiles[0] as Profile;
      if (foundProfile.id === user.id) {
         setMessage('You cannot add yourself as a friend.'); // Double-check for self
      } else {
         setSearchResult(foundProfile);
      }
    } else {
      setMessage('User not found.');
    }
  };

  const handleSendFriendRequest = async () => {
    if (!searchResult || !searchResult.id) {
      setMessage('No user selected for friend request.');
      return;
    }

    const { data: currentUser } = await supabase.auth.getUser();
    if (!currentUser || !currentUser.user) {
      setMessage('You must be logged in to send friend requests.');
      return;
    }

    setIsSending(true);
    setMessage('');

    try {
      // Check if a request already exists or they are already friends
      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friends')
        .select('*')
        .or(`(user_id.eq.${currentUser.user.id},friend_id.eq.${searchResult.id}),(user_id.eq.${searchResult.id},friend_id.eq.${currentUser.user.id})`);

      if (friendshipError) throw friendshipError;

      if (existingFriendship && existingFriendship.length > 0) {
        setMessage('You are already friends or a request is pending.');
        setIsSending(false);
        return;
      }

      // Check if a notification already exists (e.g., pending friend request)
      const { data: existingNotification, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('from_user_id', currentUser.user.id)
        .eq('to_user_id', searchResult.id)
        .eq('type', 'friend_request')
        .eq('is_read', false); // Consider only unread requests

      if (notificationError) throw notificationError;

      if (existingNotification && existingNotification.length > 0) {
        setMessage('A friend request has already been sent to this user.');
        setIsSending(false);
        return;
      }


      // Send friend request (insert into notifications table)
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          from_user_id: currentUser.user.id,
          to_user_id: searchResult.id,
          type: 'friend_request',
          message: 'sent you a friend request!',
          is_read: false,
          related_entity_id: null, // No related entity for friend request initially
        });

      if (insertError) throw insertError;

      setMessage('Friend request sent!');
      setSearchResult(null); // Clear search result after sending
      setFriendIdentifier('');
      setTimeout(() => setShowDropdown(false), 1500); // Close after a short delay
    } catch (error: any) {
      console.error("Error sending friend request:", error.message);
      setMessage(`Failed to send request: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative">
      <button
        className="text-3xl relative hover:scale-110 transition focus:outline-none"
        onClick={() => setShowDropdown(!showDropdown)}
        title="Add Friends"
      >
        ➕
      </button>

      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-2 w-72 bg-[#111] border border-[#333] text-white rounded-xl p-4 shadow-xl z-50 backdrop-blur-md animate-pop-in-notif"
        >
          <h3 className="text-lg font-bold mb-3 border-b border-[#222] pb-2 text-center">Add Friend</h3>
          <form onSubmit={handleSearch} className="mb-3">
            <input
              type="text"
              placeholder="Username or User ID"
              value={friendIdentifier}
              onChange={(e) => setFriendIdentifier(e.target.value)}
              className="w-full p-2 text-sm bg-[#1e1e1e] border border-[#222] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#9500FF] mb-2"
            />
            <button
              type="submit"
              className="w-full px-4 py-2 bg-[#fe019a] text-white font-bold text-sm rounded-xl hover:bg-[#d0017e] transition shadow-md"
            >
              Search User
            </button>
          </form>

          {message && <p className="text-center text-sm mb-3">{message}</p>}

          {searchResult && (
            <div className="bg-[#1a1a1a] p-3 rounded-lg flex items-center space-x-3 mb-3">
              <Image
                src={searchResult.profileImage || '/default-avatar.png'}
                alt={searchResult.displayName || 'User'}
                width={40}
                height={40}
                className="rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="font-bold text-sm">{searchResult.displayName || 'Unknown'}</p>
                <p className="text-xs text-[#aaa]">@{searchResult.username}</p>
              </div>
              <button
                onClick={handleSendFriendRequest}
                disabled={isSending}
                className="px-3 py-1 bg-[#12f7ff] text-black font-bold text-xs rounded-xl hover:bg-[#0fd0e0] transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? 'Sending...' : 'Add Friend'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}