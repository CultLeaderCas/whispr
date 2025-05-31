import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

// Place this in a types file if you want to share it, or leave here for now:
export interface Profile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  themeColor?: string;
  online_status?: 'online' | 'away' | 'dnd' | 'offline';
  bio?: string;
  public_status?: string;
}

export default function AddFriendsDropdown() {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [friendIdentifier, setFriendIdentifier] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('button[title="Add Friends"]')
      ) {
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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchResult(null);
    setMessage('');

    const identifier = friendIdentifier.trim();
    if (!identifier) {
      setMessage('Please enter a username or ID.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage('You must be logged in to search.');
      return;
    }

    if (identifier === user.id || identifier.toLowerCase() === user.user_metadata?.username?.toLowerCase()) {
      setMessage('You cannot add yourself, silly goose.');
      return;
    }

    let profileData = null;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    try {
      if (uuidRegex.test(identifier)) {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', identifier).single();
        if (error) throw error;
        profileData = data;
      } else {
        const { data, error } = await supabase.from('profiles').select('*').eq('username', identifier).single();
        if (error) throw error;
        profileData = data;
      }

      if (!profileData) {
        setMessage('User not found.');
        return;
      }

      setSearchResult(profileData);
    } catch (error: any) {
      console.error("Search error:", error.message);
      setMessage('Error searching for user.');
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
      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friends')
        .select('*')
        .or(
  `and(user_id.eq.${currentUser.user.id},friend_id.eq.${searchResult.id}),and(user_id.eq.${searchResult.id},friend_id.eq.${currentUser.user.id})`
)

      if (friendshipError) throw friendshipError;

      if (existingFriendship && existingFriendship.length > 0) {
        setMessage('You are already friends or a request is pending.');
        setIsSending(false);
        return;
      }

      const { data: existingNotification, error: notificationError } = await supabase
        .from('notifications')
        .select('*')
        .eq('from_user_id', currentUser.user.id)
        .eq('to_user_id', searchResult.id)
        .eq('type', 'friend_request')
        .eq('is_read', false);

      if (notificationError) throw notificationError;

      if (existingNotification && existingNotification.length > 0) {
        setMessage('A friend request has already been sent to this user.');
        setIsSending(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          from_user_id: currentUser.user.id,
          to_user_id: searchResult.id,
          type: 'friend_request',
          message: 'sent you a friend request!',
          is_read: false,
        });

      if (insertError) throw insertError;

      setMessage('Friend request sent!');
      setSearchResult(null);
      setFriendIdentifier('');
      setTimeout(() => setShowDropdown(false), 1500);
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
