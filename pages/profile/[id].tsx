import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PublicProfile() {
  const router = useRouter();
  const { id } = router.query;

  const [profile, setProfile] = useState<any>(null);

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
    <main className="min-h-screen bg-black text-white font-sans flex items-center justify-center">
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
    </main>
  );
}
