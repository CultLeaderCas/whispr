import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Toast from './toast';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notifications')
        .select(`*, from_user:from_user_id ( id, displayName, username, profileImage )`)
        .eq('to_user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error) setNotifications(data || []);
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleAccept = async (id: string, fromUserId: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', id);

    if (error) {
      console.error('Error accepting friend request:', error);
      setToastMsg('Failed to accept friend request.');
      return;
    }

    markAsRead(id);

    await supabase.from('notifications').insert([
      {
        to_user_id: fromUserId,
        message: `Your friend request was accepted!`,
        type: 'friend_request_accepted',
        is_read: false
      }
    ]);

    setToastMsg('Friend request accepted!');
  };

  const handleDecline = async (id: string) => {
    const { error } = await supabase
      .from('friend_requests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error declining friend request:', error);
      setToastMsg('Failed to decline friend request.');
      return;
    }

    markAsRead(id);
    setToastMsg('Friend request declined.');
  };

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
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-sm text-[#888] italic text-center">
                You have no notifications.
              </p>
            )}
            {notifications.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg transition cursor-pointer ${
                  note.is_read
                    ? 'bg-[#1e1e1e] text-[#aaa]'
                    : 'bg-[#272727] text-white border border-[#9500FF]'
                }`}
                onClick={() => markAsRead(note.id)}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <img
                    src={note.from_user?.profileImage || '/default-avatar.png'}
                    alt="Sender"
                    className="w-8 h-8 rounded-full border border-[#9500FF]"
                  />
                  <div>
                    <p className="text-sm font-semibold">
                      {note.from_user?.displayName || 'Someone'} sent you a friend request!
                    </p>
                    <p className="text-xs text-[#aaa] italic">
                      @{note.from_user?.username || 'unknown'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-[#666] mt-1">
                  {note.created_at
                    ? new Date(note.created_at).toLocaleString()
                    : 'Time unknown'}
                </p>

                {note.type === 'friend_request' && (
                  <div className="mt-2 flex space-x-2">
                    <button
                      className="px-3 py-1 bg-[#12f7ff] text-[#111] rounded-lg text-xs font-bold hover:bg-[#0fd0d0]"
                      onClick={() => handleAccept(note.id, note.from_user?.id)}
                    >
                      Accept
                    </button>
                    <button
                      className="px-3 py-1 bg-[#9500FF] text-white text-xs rounded-lg font-bold hover:bg-[#7a00cc]"
                      onClick={() => handleDecline(note.id)}
                    >
                      Decline
                    </button>
                    <button
                      className="px-3 py-1 bg-[#333] text-white text-xs rounded-lg font-bold hover:bg-[#444]"
                      onClick={() => window.location.href = `/profile/${note.from_user?.id}`}
                    >
                      View Profile
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg('')} />}
    </div>
  );
}
