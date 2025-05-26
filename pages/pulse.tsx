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
  themeColor?: string;
  online_status?: 'online' | 'away' | 'dnd' | 'offline';
  bio?: string;
  public_status?: string;
}

// Re-introduced for dynamic glow effects (from original PulseLayout)
const statusGlowStyles = {
  online: '0 0 0 2px #22C55E, 0 0 10px 5px rgba(34,197,94,0.7)',
  away: '0 0 0 2px #F59E0B, 0 0 10px 5px rgba(245,158,11,0.7)',
  dnd: '0 0 0 2px #EF4444, 0 0 10px 5px rgba(239,68,68,0.7)',
  offline: '0 0 0 2px #6B7280, 0 0 8px 3px rgba(107,114,128,0.5)',
};

// --- NotificationBell Component ---
function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    let notificationChannel: any = null;

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
            fetchNotifications(); // Re-fetch on any change to ensure up-to-date notifications
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

  // --- NEW: handleAcceptFriendRequest function ---
  const handleAcceptFriendRequest = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation(); // Prevent the parent div's onClick from firing

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No user logged in to accept friend request.');
      return;
    }

    const requesterId = note.from_user?.id ?? note.from_user_id;
    const currentUserId = user.id;

    try {
      // 1. Insert into friends table for both users (bidirectional friendship)
      // Check for existing friendship first to prevent unique constraint errors
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${requesterId}),and(user_id.eq.${requesterId},friend_id.eq.${currentUserId})`);

      if (checkError) throw checkError;

      if (existingFriendship && existingFriendship.length > 0) {
        console.warn('Friendship already exists or is pending. Deleting notification.');
        // If already friends, just delete the notification
      } else {
        // Only insert if friendship doesn't exist
        const { error: insertError1 } = await supabase
          .from('friends')
          .insert({
            user_id: currentUserId,
            friend_id: requesterId,
          });

        if (insertError1) throw insertError1;

        const { error: insertError2 } = await supabase
          .from('friends')
          .insert({
            user_id: requesterId,
            friend_id: currentUserId,
          });

        if (insertError2) throw insertError2;

        console.log('Friend request accepted and friendship established!');
      }

      // 2. Delete the friend request notification
      const { error: deleteNotificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', note.id);

      if (deleteNotificationError) console.error('Error deleting notification after acceptance:', deleteNotificationError.message);

      // Optimistically update UI by removing the notification
      setNotifications((prev) => prev.filter((n) => n.id !== note.id));

      // Optional: Give feedback to user
      alert(`You are now friends with ${note.from_user?.displayName || 'Someone'}!`);

    } catch (error: any) {
      console.error("Error accepting friend request:", error.message);
      alert(`Failed to accept friend request: ${error.message}`);
    }
  };

  // --- NEW: handleDenyFriendRequest function ---
  const handleDenyFriendRequest = async (e: React.MouseEvent, note: any) => {
    e.stopPropagation(); // Prevent the parent div's onClick from firing

    try {
      // Delete the notification
      const { error: deleteNotificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', note.id);

      if (deleteNotificationError) throw deleteNotificationError;

      console.log('Friend request denied.');
      setNotifications((prev) => prev.filter((n) => n.id !== note.id)); // Remove from UI
      alert(`Friend request from ${note.from_user?.displayName || 'Someone'} denied.`);
    } catch (error: any) {
      console.error("Error denying friend request:", error.message);
      alert(`Failed to deny friend request: ${error.message}`);
    }
  };

  // --- MODIFIED: handleCardClick function ---
  // This now handles navigation for non-friend-request types,
  // or navigation to profile if a friend request has already been acted upon (is_read).
  const handleCardClick = async (note: any) => {
    const fromId = note.from_user?.id ?? note.from_user_id;
    await markAsRead(note.id); // Mark as read always when card is clicked

    // Only navigate if it's not an unread friend request (which has dedicated buttons)
    if (note.type === 'new_message' && note.related_entity_id) {
      setIsFadingOut(true);
      setTimeout(() => {
        router.push(`/chat/${note.related_entity_id}`);
        setShowPanel(false);
        setIsFadingOut(false);
      }, 300);
    } else if (note.type === 'profile_view' || (note.type === 'friend_request' && note.is_read)) {
      // If it's a profile view or a read friend request, navigate to profile
      setIsFadingOut(true);
      setTimeout(() => {
        router.push(`/profile/${fromId}`);
        setShowPanel(false);
        setIsFadingOut(false);
      }, 300);
    } else {
      // Default behavior or other types, just close panel
      // For unread friend requests, clicking the card just closes the panel
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
                  // onClick moved conditionally into handleCardClick or specific buttons
                  className={`flex items-start p-3 rounded-lg mb-2 transition ${
                    note.is_read ? 'bg-[#1a1a1a] text-[#aaa]' : 'bg-[#2a2a2a] hover:bg-[#3a3a3a]'
                  } ${note.type !== 'friend_request' || note.is_read ? 'cursor-pointer' : ''}`} // Cursor for clickable items
                  onClick={
                    // Only allow main card click for navigation if not an unread friend request
                    note.type !== 'friend_request' || note.is_read
                      ? () => handleCardClick(note)
                      : undefined // No main card click for unread friend requests
                  }
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

                    {/* --- NEW: Friend Request Action Buttons --- */}
                    {note.type === 'friend_request' && !note.is_read && (
                      <div className="mt-2 flex space-x-2">
                        <button
                          onClick={(e) => handleAcceptFriendRequest(e, note)}
                          className="px-2 py-1 bg-[#22C55E] text-white text-xs rounded-lg hover:bg-[#1DA54D] transition"
                        >
                          Accept
                        </button>
                        <button
                          onClick={(e) => handleDenyFriendRequest(e, note)}
                          className="px-2 py-1 bg-[#EF4444] text-white text-xs rounded-lg hover:bg-[#CC3333] transition"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                    {/* --- END NEW LOGIC --- */}

                  </div>
                  {/* Mark as Read button - now only for non-friend-request types OR already read friend requests (though typically not needed then) */}
                  {!note.is_read && note.type !== 'friend_request' && (
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
// (Your existing AddFriendsDropdown component, unchanged for this integration)
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

    // Prevent searching for self
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
      // Check if a request already exists or they are already friends
      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${currentUser.user.id},friend_id.eq.${searchResult.id}),and(user_id.eq.${searchResult.id},friend_id.eq.${currentUser.user.id})`);

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

                  </div>
                  {/* Mark as Read button - now only for non-friend-request types OR already read friend requests (though typically not needed then) */}
                  {!note.is_read && note.type !== 'friend_request' && (
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

  // Prevent searching for self
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
      // Check if a request already exists or they are already friends
      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friends')
        .select('*')
.or(`and(user_id.eq.${currentUser.user.id},friend_id.eq.${searchResult.id}),and(user_id.eq.${searchResult.id},friend_id.eq.${currentUser.user.id})`);

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
