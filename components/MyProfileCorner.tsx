import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

// Optionally import Profile interface if you have it shared somewhere
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

// You may want to keep this in a shared file if you use it in multiple places
const statusGlowStyles = {
  online: '0 0 0 2px #22C55E, 0 0 10px 5px rgba(34,197,94,0.7)',
  away: '0 0 0 2px #F59E0B, 0 0 10px 5px rgba(245,158,11,0.7)',
  dnd: '0 0 0 2px #EF4444, 0 0 10px 5px rgba(239,68,68,0.7)',
  offline: '0 0 0 2px #6B7280, 0 0 8px 3px rgba(107,114,128,0.5)',
};

export default function MyProfileCorner() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [currentBio, setCurrentBio] = useState('');
  const [currentPublicStatus, setCurrentPublicStatus] = useState('');
  const [currentOnlineStatus, setCurrentOnlineStatus] = useState<'online' | 'away' | 'dnd' | 'offline'>('offline');

  useEffect(() => {
    let isMounted = true;
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
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!isMounted) return;

      if (error || !data) {
        setProfile(null);
        return;
      }

      setProfile(data as Profile);
      setCurrentBio(data.bio || '');
      setCurrentPublicStatus(data.public_status || '');
      setCurrentOnlineStatus(data.online_status || 'offline');

      if (!channel) {
        channel = supabase
          .channel(`my_profile_changes:${user.id}`)
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, payload => {
            if (!isMounted) return;
            const newProfile = payload.new as Profile;
            setProfile(newProfile);
            setCurrentBio(newProfile.bio || '');
            setCurrentPublicStatus(newProfile.public_status || '');
            setCurrentOnlineStatus(newProfile.online_status || 'offline');
          })
          .subscribe();
      }
    };

    if (router.isReady) {
      setupProfileAndSubscription();
    }

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
    };
  }, [router.isReady]);

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

  const handleUpdateProfile = async (field: keyof Profile, value: any) => {
    if (!profile?.id) return;
    setProfile(prev => prev ? { ...prev, [field]: value } : null);
    if (field === 'online_status') setCurrentOnlineStatus(value);
    if (field === 'bio') setCurrentBio(value);
    if (field === 'public_status') setCurrentPublicStatus(value);

    const updates = {
      [field]: value,
      updated_at: new Date().toISOString(),
    };

    await supabase.from('profiles').update(updates).eq('id', profile.id);
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

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debounceUpdate = (value: string, field: 'bio' | 'public_status') => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = setTimeout(() => {
      handleUpdateProfile(field, value);
    }, 700);
  };

  const debouncedUpdateBio = (value: string) => debounceUpdate(value, 'bio');
  const debouncedUpdatePublicStatus = (value: string) => debounceUpdate(value, 'public_status');

  if (!profile) {
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
      <div
        className="bg-[#111] border border-[#333] text-white rounded-2xl shadow-xl p-3 flex items-center space-x-3 cursor-pointer hover:bg-[#1e1e1e] transition-all duration-200 backdrop-blur-md"
        onClick={() => setShowSettings(!showSettings)}
      >
        <div
          className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 transition-shadow duration-200 ease-in-out`}
          style={{
            boxShadow: statusGlowStyles[profile.online_status || 'offline'],
            border: `2px solid ${profile.themeColor || '#12f7ff'}`
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
        <div className="flex flex-col">
          <p className="text-sm font-bold">{profile.displayName || 'Me'}</p>
          <p className="text-xs text-[#aaa]">@{profile.username}</p>
          {profile.public_status && (
            <p className="text-xs italic text-[#9500FF] mt-1 truncate">
              {profile.public_status}
            </p>
          )}
        </div>
      </div>
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
          <div className="flex items-center space-x-3 mb-4 border-b border-[#222] pb-3">
            <div
              className={`relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0 transition-shadow duration-200 ease-in-out`}
              style={{
                boxShadow: statusGlowStyles[profile.online_status || 'offline'],
                border: `2px solid ${profile.themeColor || '#12f7ff'}`
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
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-2">Online Status</label>
            <div className="flex justify-around space-x-1 sm:space-x-2">
              {(['online', 'away', 'dnd', 'offline'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
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
            <button
              type="button"
              onClick={() => handleUpdateProfile('online_status', currentOnlineStatus)}
              className="w-full mt-3 bg-[#12f7ff] text-[#111] font-bold px-3 py-1 rounded-lg text-sm hover:bg-[#0fd0d0] transition"
            >
              💾 Save Status
            </button>
          </div>
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
            <p className="text-right text-xs text-[#666] mt-1">{currentBio.length}/150{'}'}</p>
          </div>
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
