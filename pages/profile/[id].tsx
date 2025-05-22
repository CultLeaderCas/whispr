import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import PulseLayout from '../pulse'; // use '../pulse' if pulse.tsx is in /pages

export default function UserProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [friendRequestStatus, setFriendRequestStatus] = useState<'none' | 'incoming' | 'outgoing' | 'accepted'>('none');

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchData = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) return;

      setCurrentUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Failed to fetch profile:', error.message);
        return;
      }

      setProfile(data);

      const { data: requests } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`from_user_id.eq.${id},to_user_id.eq.${id}`)
        .eq('status', 'pending');

      if (requests && requests.length > 0) {
        const req = requests[0];
        if (req.to_user_id === user.id && req.status === 'pending') {
          setFriendRequestStatus('incoming');
        } else if (req.from_user_id === user.id) {
          setFriendRequestStatus('outgoing');
        }
      } else {
        setFriendRequestStatus('none');
      }
    };

    fetchData();
  }, [id]);

  const handleAccept = async () => {
    if (!currentUser || !id) return;

    await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('from_user_id', id)
      .eq('to_user_id', currentUser.id);

    setFriendRequestStatus('accepted');
  };

  const handleDecline = async () => {
    if (!currentUser || !id) return;

    await supabase
      .from('friend_requests')
      .delete()
      .eq('from_user_id', id)
      .eq('to_user_id', currentUser.id);

    setFriendRequestStatus('none');
  };

  if (!profile) return null;

  return (
    <PulseLayout>
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-[#2a2a2a] rounded-3xl p-8 w-[340px] text-center shadow-xl border border-[#444]">
          <img
            src={profile.profileImage || '/default-avatar.png'}
            alt="Profile"
            className="w-24 h-24 rounded-full mx-auto border-2 border-[#9500FF] mb-4 object-cover"
          />
          <h2 className="text-2xl font-bold">{profile.displayName || 'Unknown'}</h2>
          <p className="text-sm text-[#aaa]">@{profile.username}</p>
          <p className="italic text-sm mt-2">{profile.bio || 'No bio set.'}</p>

          {friendRequestStatus === 'incoming' && (
            <div className="mt-4 flex gap-3 justify-center">
              <button
                onClick={handleAccept}
                className="bg-[#12f7ff] text-black font-bold px-4 py-1 rounded-lg text-sm hover:bg-[#0fd0d0]"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                className="bg-[#9500FF] text-white font-bold px-4 py-1 rounded-lg text-sm hover:bg-[#7a00cc]"
              >
                Decline
              </button>
            </div>
          )}

          {friendRequestStatus === 'outgoing' && (
            <p className="text-xs text-[#888] mt-3 italic">Friend request sent.</p>
          )}

          {friendRequestStatus === 'accepted' && (
            <p className="text-xs text-green-400 mt-3 italic">You are now friends.</p>
          )}
        </div>
      </div>
    </PulseLayout>
  );
}
