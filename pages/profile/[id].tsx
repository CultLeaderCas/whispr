import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import PulseLayout from '../pulse';

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

// Function to handle accepting a friend request
const handleAccept = async () => {
  // Ensure we have the necessary IDs before proceeding
  // 'id' here is assumed to be the sender's user_id (from_user_id)
  if (!currentUser || !id) {
    console.error("Missing currentUser or sender ID for accept action.");
    return;
  }

  try {
    // 1. Update the status of the original friend request to 'accepted'
    // We are identifying the specific request using both from_user_id and to_user_id
    // This matches the RLS policy for the receiver to update their pending request.
    const { error: updateRequestError } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('from_user_id', id)          // The ID of the user who sent the request
      .eq('to_user_id', currentUser.id); // The ID of the current user (receiver)

    if (updateRequestError) {
      console.error("Error updating friend request status to accepted:", updateRequestError.message);
      // You might want to show a more specific error to the user
      alert("Failed to accept friend request. Please try again.");
      return;
    }

    // 2. Insert friendship in both directions into the 'friends' table
    // This establishes the bidirectional friendship after acceptance.
    const { error: insertFriendsError } = await supabase.from('friends').insert([
      { user_id: currentUser.id, friend_id: id },    // Current user is friend with sender
      { user_id: id, friend_id: currentUser.id },    // Sender is friend with current user
    ]);

    if (insertFriendsError) {
      console.error("Error inserting friendship records:", insertFriendsError.message);
      // You might want to revert the status update if this fails, or handle differently
      alert("Friend request accepted but failed to establish friendship. Contact support.");
      return;
    }

    // 3. Successfully handled on backend, now update frontend state
    setFriendRequestStatus('accepted'); // Update local component state
    console.log("Friend request accepted and friendship established.");
    alert("You are now friends!"); // Temporary confirmation

    // IMPORTANT: Refresh your UI list of pending friend requests.
    // Choose one of the following methods based on your state management:
    // A) If you have a function to re-fetch all pending requests:
    // if (typeof fetchPendingFriendRequests === 'function') {
    //   await fetchPendingFriendRequests();
    // }
    // B) If you manage pending requests in local state (e.g., useState):
    // if (typeof setPendingFriendRequests === 'function') {
    //   setPendingFriendRequests(prev => prev.filter(req => !(req.from_user_id === id && req.to_user_id === currentUser.id)));
    // }

  } catch (err) {
    console.error("An unexpected error occurred during friend request acceptance:", err);
    alert("An unexpected error occurred. Please try again.");
  }
};

// Function to handle declining a friend request
const handleDecline = async () => {
  // Ensure we have the necessary IDs before proceeding
  // 'id' here is assumed to be the sender's user_id (from_user_id)
  if (!currentUser || !id) {
    console.error("Missing currentUser or sender ID for decline action.");
    return;
  }

  try {
    // 1. Update the status of the friend request to 'rejected'
    // It's generally better to update to 'rejected' for historical record, rather than deleting.
    const { error: updateRequestError } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' }) // <-- Changed from .delete() to .update()
      .eq('from_user_id', id)          // The ID of the user who sent the request
      .eq('to_user_id', currentUser.id); // The ID of the current user (receiver)

    if (updateRequestError) {
      console.error("Error updating friend request status to rejected:", updateRequestError.message);
      alert("Failed to decline friend request. Please try again.");
      return;
    }

    // 2. Successfully handled on backend, now update frontend state
    setFriendRequestStatus('none'); // Update local component state
    console.log("Friend request declined.");
    alert("Friend request declined."); // Temporary confirmation

    // IMPORTANT: Refresh your UI list of pending friend requests.
    // Choose one of the following methods based on your state management:
    // A) If you have a function to re-fetch all pending requests:
    // if (typeof fetchPendingFriendRequests === 'function') {
    //   await fetchPendingFriendRequests();
    // }
    // B) If you manage pending requests in local state (e.g., useState):
    // if (typeof setPendingFriendRequests === 'function') {
    //   setPendingFriendRequests(prev => prev.filter(req => !(req.from_user_id === id && req.to_user_id === currentUser.id)));
    // }

  } catch (err) {
    console.error("An unexpected error occurred during friend request decline:", err);
    alert("An unexpected error occurred. Please try again.");
  }
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