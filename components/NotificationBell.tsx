import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";

interface Notification {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  type: string; // e.g., 'friend_request', 'message', 'alert' etc.
  // These are populated by the select query's join
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
  // State to hold the current user's ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Function to fetch notifications (used for initial load and real-time updates)
  const fetchNotifications = useCallback(async (userId: string) => {
    if (!userId) {
      setNotifications([]); // Clear notifications if user is not available
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
  }, []); // No dependencies other than it's a stable function

  // --- Effect to get current user and set up Realtime Subscription ---
  useEffect(() => {
    let channel: any = null; // Declare channel here to be accessible in cleanup

    const setupNotifications = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("❌ Auth error or no user for notifications:", authError?.message);
        setCurrentUserId(null);
        setNotifications([]); // Clear notifications if no user
        return;
      }

      setCurrentUserId(user.id); // Set the current user ID
      fetchNotifications(user.id); // Fetch initial notifications

      // Subscribe to changes for the current user's notifications
      channel = supabase
        .channel(`notifications_channel:${user.id}`) // Unique channel name per user
        .on(
          'postgres_changes',
          {
            event: '*', // Listen for INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'notifications',
            filter: `to_user_id=eq.${user.id}` // Only get changes relevant to this user
          },
          (payload) => {
            console.log("Realtime notification change detected:", payload);
            // Re-fetch all notifications to ensure consistency and correct order/filtering
            fetchNotifications(user.id);
          }
        )
        .subscribe();
    };

    setupNotifications();

    // Cleanup subscription on component unmount or user logout
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [fetchNotifications]); // Depend on fetchNotifications to re-run if it changes (due to useCallback)

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    if (!currentUserId) {
        console.error("Cannot mark as read: User not authenticated.");
        return;
    }
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("to_user_id", currentUserId); // Ensure only updating current user's notification

    if (error) {
      console.error("Error marking notification as read:", error.message);
      return;
    }

    // Update local state immediately for responsiveness
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const getFromUserId = (note: Notification) =>
    note.from_user?.id ?? note.from_user_id;

  const getDisplayName = (note: Notification) =>
    note.from_user?.displayName ?? "Someone";

  const handleCardClick = async (note: Notification) => {
    const fromId = getFromUserId(note);
    await markAsRead(note.id); // Mark as read when clicked

    setIsFadingOut(true); // Start fade-out animation

    // Delay navigation and panel hiding to allow animation to play
    setTimeout(() => {
      setShowPanel(false); // Hide the panel
      setIsFadingOut(false); // Reset fade state for next time
      // Navigate to the profile page
      window.location.href = `/profile/${fromId}`;
    }, 300); // Wait for animation duration
  };

  return (
    <div className="relative">
      <style jsx>{`
        .fade-out {
          animation: fadeOut 0.3s ease forwards;
        }
        @keyframes fadeOut {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: 0;
            transform: scale(0.98);
          }
        }
        /* Custom Scrollbar Styles */
        .custom-scroll::-webkit-scrollbar {
          width: 8px; /* width of the scrollbar */
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #272727; /* color of the tracking area */
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: #555; /* color of the scroll thumb */
          border-radius: 4px; /* roundness of the scroll thumb */
          border: 2px solid #272727; /* creates padding around scroll thumb */
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #777; /* color of the scroll thumb on hover */
        }
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
          className={`absolute right-0 mt-2 w-80 bg-[#111] border border-[#333] text-white rounded-xl p-4 shadow-xl z-50 backdrop-blur transition-opacity duration-300 ${
            isFadingOut ? "fade-out" : ""
          }`}
        >
          <h3 className="text-lg font-bold mb-2">Notifications</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll">
            {notifications.length === 0 && (
              <p className="text-sm text-[#888] italic text-center">
                You have no notifications.
              </p>
            )}

            {notifications.map((note) => {
              const fromId = getFromUserId(note);
              const name = getDisplayName(note);

              return (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.015] hover:border-[#12f7ff] ${
                    note.is_read
                      ? "bg-[#1e1e1e] text-[#aaa]"
                      : "bg-[#272727] text-white border border-[#9500FF]"
                  }`}
                  onClick={() => handleCardClick(note)}
                >
                  <p className="text-sm italic">
                    <span className="font-semibold text-white italic">
                      {name}
                    </span>{" "}
                    {/* Display message based on type for better clarity */}
                    {note.type === 'friend_request' ? 'sent you a friend request!' : note.message}
                  </p>

                  <p className="text-xs text-[#666] mt-1">
                    {new Date(note.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}