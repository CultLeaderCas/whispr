import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { JSX } from 'react/jsx-runtime';

export default function PublicProfile() {
  const router = useRouter();
  const rawId = router.query.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  const [profile, setProfile] = useState<any>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [friendRequest, setFriendRequest] = useState<any | null>(null);
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
            animationDelay: `${Math.random() * 5}s`,
          }}
        />
      );
    });

    setStars(newStars);
  }, []);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchProfileData = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      setAuthUserId(user?.id || null);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        setProfile(data);
      }
    };

    fetchProfileData();
  }, [id]);

  useEffect(() => {
    if (!authUserId || !id || typeof id !== 'string') return;

    const checkFriendRequest = async () => {
      const { data } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(from_user_id.eq.${id},to_user_id.eq.${authUserId}),and(from_user_id.eq.${authUserId},to_user_id.eq.${id})`)
        .eq('status', 'pending')
        .single();

      if (data) {
        setFriendRequest(data);
      }
    };

    checkFriendRequest();
  }, [authUserId, id]);

  const handleAccept = async () => {
    if (!friendRequest) return;

    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', friendRequest.id);

    setFriendRequest(null);
    alert('✅ Friend request accepted!');
  };

  const handleDecline = async () => {
    if (!friendRequest) return;

    await supabase
      .from('friend_requests')
      .delete()
      .eq('id', friendRequest.id);

    setFriendRequest(null);
    alert('❌ Friend request declined.');
  };

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
        <div className="bg-[#111] p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-[#333]">
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

          {friendRequest && friendRequest.to_user_id === authUserId && (
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={handleAccept}
                className="bg-[#12f7ff] text-[#111] font-bold px-4 py-2 rounded-lg text-xs hover:bg-[#0fd0d0]"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                className="bg-[#9500FF] text-white font-bold px-4 py-2 rounded-lg text-xs hover:bg-[#7a00cc]"
              >
                Decline
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
