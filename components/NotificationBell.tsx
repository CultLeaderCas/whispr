import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: session } = await supabase.auth.getUser();
      const user = session?.user;
      if (!user) return;

      const { data, error } = await supabase
  .from("notifications")
  .select("*, from_user:from_user_id(id, displayName, username, profileImage)")
  .eq("to_user_id", user.id)
  .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Notification fetch error:", error.message);
        return;
      }

      setNotifications(data || []);
    };

    const interval = setInterval(fetchNotifications, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleAccept = async (noteId: string, fromUserId: string) => {
    await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("from_user_id", fromUserId);

    await supabase.from("notifications").insert([
      {
        to_user_id: fromUserId,
        message: `Your friend request was accepted!`,
        type: "friend_request_accepted",
        is_read: false,
      },
    ]);

    markAsRead(noteId);
  };

  const handleDecline = async (noteId: string, fromUserId: string) => {
    await supabase.from("friend_requests").delete().eq("from_user_id", fromUserId);
    markAsRead(noteId);
  };

  const getFromUserId = (note: any) =>
    note.from_user?.id ?? note.from_user_id;

  const getDisplayName = (note: any) =>
    note.from_user?.displayName ?? "Someone";

  return (
    <div className="relative">
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
        <div className="absolute right-0 mt-2 w-80 bg-[#111] border border-[#333] text-white rounded-xl p-4 shadow-xl z-50 backdrop-blur">
          <h3 className="text-lg font-bold mb-2">Notifications</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto custom-scroll">
            {notifications.length === 0 && (
              <p className="text-sm text-[#888] italic text-center">
                You have no notifications.
              </p>
            )}
console.log("🔍 note.type:", note.type);
            {notifications.map((note, i) => {
              const fromId = getFromUserId(note);
              const name = getDisplayName(note);
              return (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg transition cursor-pointer ${
                    note.is_read
                      ? "bg-[#1e1e1e] text-[#aaa]"
                      : "bg-[#272727] text-white border border-[#9500FF]"
                  }`}
                  onClick={() => markAsRead(note.id)}
                >
                  <p className="text-sm italic">
                    <span className="font-semibold text-white italic">
                      {name}
                    </span>{" "}
                    sent you a friend request!
                  </p>

                  <p className="text-xs text-[#666] mt-1">
                    {new Date(note.created_at).toLocaleString()}
                  </p>

                  {/* ✅ Always show buttons for now, fallback active */}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAccept(note.id, fromId);
                      }}
                      className="flex-1 bg-[#12f7ff] text-[#111] font-bold px-2 py-1 rounded-lg text-xs hover:bg-[#0fd0d0]"
                    >
                      Accept
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecline(note.id, fromId);
                      }}
                      className="flex-1 bg-[#9500FF] text-white font-bold px-2 py-1 rounded-lg text-xs hover:bg-[#7a00cc]"
                    >
                      Decline
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/profile/${fromId}`;
                      }}
                      className="flex-1 bg-[#333] text-white font-bold px-2 py-1 rounded-lg text-xs hover:bg-[#444]"
                    >
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
