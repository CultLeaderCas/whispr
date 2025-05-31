import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from 'next/image'; // NEW for profile images
import { useRouter } from 'next/router'; // NEW for navigation

interface Notification {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string;
  related_entity_id?: string; // For new_message routing
  from_user?: {
    id: string;
    displayName: string;
    username: string;
    profileImage: string;
  };
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null); // NEW
  const router = useRouter(); // NEW

  const fetchNotifications = useCallback(async (userId: string) => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select(`*, from_user:from_user_id (id, displayName, username, profileImage)`)
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("❌ Notification fetch error:", error.message);
      return;
    }
    setNotifications(data || []);
  }, []);

  useEffect(() => {
    let channel: any = null;
    const setupNotifications = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setCurrentUserId(null);
        setNotifications([]);
        return;
      }
      setCurrentUserId(user.id);
      fetchNotifications(user.id);

      channel = supabase
        .channel(`notifications_channel:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `to_user_id=eq.${user.id}`
          },
          () => fetchNotifications(user.id)
        )
        .subscribe();
    };
    setupNotifications();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchNotifications]);

  // NEW: Handle click outside to close panel
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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    if (!currentUserId) return;
    await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("to_user_id", currentUserId);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  // NEW: Friend accept/deny
  const handleAcceptFriendRequest = async (e: React.MouseEvent, note: Notification) => {
    e.stopPropagation();
    if (!currentUserId) return;
    const requesterId = note.from_user?.id ?? note.from_user_id;
    try {
      await supabase.from('friends').insert([
        { user_id: currentUserId, friend_id: requesterId },
        { user_id: requesterId, friend_id: currentUserId },
      ]);
      await supabase.from('notifications').delete().eq('id', note.id);
      setNotifications(prev => prev.filter(n => n.id !== note.id));
      alert(`You are now friends with ${note.from_user?.displayName || 'Someone'}!`);
    } catch (error: any) {
      alert(error.message);
    }
  };
  const handleDenyFriendRequest = async (e: React.MouseEvent, note: Notification) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', note.id);
    setNotifications(prev => prev.filter(n => n.id !== note.id));
  };

  // NEW: Routing based on notification type
  const handleCardClick = async (note: Notification) => {
    const fromId = note.from_user?.id ?? note.from_user_id;
    await markAsRead(note.id);
    setIsFadingOut(true);
    setTimeout(() => {
      setShowPanel(false);
      setIsFadingOut(false);
      if (note.type === 'friend_request' || note.type === 'profile_view') {
        router.push(`/profile/${fromId}`);
      } else if (note.type === 'new_message' && note.related_entity_id) {
        router.push(`/chat/${note.related_entity_id}`);
      }
    }, 300);
  };

  return (
    <div className="relative">
      <style jsx>{`
        .fade-out { animation: fadeOut 0.3s ease forwards; }
        @keyframes fadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.98); }
        }
        .custom-scroll::-webkit-scrollbar { width: 8px; }
        .custom-scroll::-webkit-scrollbar-track { background: #272727; border-radius: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background-color: #555; border-radius: 4px; border: 2px solid #272727; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background-color: #777; }
      `}</style>

      <button
        className="text-3xl relative hover:scale-110 transition"
        onClick={() => setShowPanel(!showPanel)}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-[#fe019a] text-white text-xs px-2 rounded-full font-bold shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div
          ref={panelRef}
          className={`absolute right-0 mt-2 w-80 bg-[#111] border border-[#333] text-white rounded-xl p-4 shadow-xl z-50 backdrop-blur transition-opacity duration-300 ${isFadingOut ? "fade-out" : ""}`}
        >
          <h3 className="text-lg font-bold mb-2">Notifications</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll">
            {notifications.length === 0 && (
              <p className="text-sm text-[#888] italic text-center">
                You have no notifications.
              </p>
            )}

            {notifications.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg transition-all duration-200 cursor-pointer hover:scale-[1.015] ${
                  note.is_read
                    ? "bg-[#1e1e1e] text-[#aaa]"
                    : "bg-[#272727] text-white border border-[#9500FF]"
                }`}
                onClick={() => handleCardClick(note)}
              >
                {/* PROFILE IMAGE & NAME */}
                <div className="flex items-center mb-1">
                  <Image
                    src={note.from_user?.profileImage || '/default-avatar.png'}
                    alt="Sender"
                    width={32}
                    height={32}
                    className="rounded-full mr-2 object-cover"
                  />
                  <span className="font-semibold">{note.from_user?.displayName || "Someone"}</span>
                  {/* MARK AS READ BUTTON */}
                  {!note.is_read && (
                    <button
                      onClick={e => { e.stopPropagation(); markAsRead(note.id); }}
                      className="ml-auto px-2 py-1 bg-[#9500FF] text-white text-xs rounded-full hover:bg-[#7a00d0]"
                      title="Mark as Read"
                    >✔</button>
                  )}
                </div>
                <p className="text-sm italic">
                  {note.type === 'friend_request'
                    ? 'sent you a friend request!'
                    : note.message}
                </p>
                <p className="text-xs text-[#666] mt-1">
                  {new Date(note.created_at).toLocaleString()}
                </p>
                {/* ACCEPT/DENY BUTTONS */}
                {note.type === 'friend_request' && !note.is_read && (
                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={e => handleAcceptFriendRequest(e, note)}
                      className="px-2 py-1 bg-[#22C55E] text-white text-xs rounded-lg hover:bg-[#1DA54D]"
                    >Accept</button>
                    <button
                      onClick={e => handleDenyFriendRequest(e, note)}
                      className="px-2 py-1 bg-[#EF4444] text-white text-xs rounded-lg hover:bg-[#CC3C3C]"
                    >Deny</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
