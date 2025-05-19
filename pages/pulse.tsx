import { useEffect, useState, useRef } from 'react'; 
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function PulsePage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    };
    loadUser();
  }, []);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (data) setProfiles(data);
    };
    fetchProfiles();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser?.id) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', currentUser.id)
        .eq('read', false);
      if (data) setNotifications(data);
    };
    fetchNotifications();
  }, [currentUser]);

  const markAllRead = async () => {
    if (!currentUser) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', currentUser.id);
    setNotifications([]);
    setShowDropdown(false);
  };

  const handleBellClick = () => {
    setShowDropdown((prev) => !prev);
  };

  return (
    <div className="relative min-h-screen bg-black text-white">
      <div className="absolute top-5 right-5 flex gap-4 items-center">
        <button
          onClick={handleBellClick}
          ref={bellRef}
          className="relative text-white text-xl"
        >
          🔔
          {notifications.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 rounded-full text-xs px-1">
              {notifications.length}
            </span>
          )}
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-10 w-64 bg-[#111] border border-[#333] rounded-xl shadow-lg z-50 p-4">
            <h3 className="text-lg font-bold mb-2">Notifications</h3>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400">No new notifications.</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.map((notif) => (
                  <li key={notif.id} className="text-sm">
                    {notif.message}
                  </li>
                ))}
              </ul>
            )}
            {notifications.length > 0 && (
              <button
                onClick={markAllRead}
                className="mt-3 bg-[#12f7ff] text-black px-3 py-1 rounded-md text-sm font-semibold hover:bg-[#0fd0d0] transition"
              >
                Mark all as read
              </button>
            )}
          </div>
        )}
      </div>

      {/* Placeholder profiles grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-10">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="bg-[#111] border border-[#333] rounded-2xl p-6 text-center shadow-xl"
          >
            <img
              src={profile.profileImage || '/default-avatar.png'}
              alt={profile.username}
              className="w-20 h-20 mx-auto rounded-full object-cover border-4"
              style={{ borderColor: profile.themeColor || '#12f7ff' }}
            />
            <h2 className="mt-3 text-lg font-bold">{profile.displayName}</h2>
            <p className="text-sm text-gray-400">@{profile.username}</p>
            <p className="mt-2 text-sm text-gray-300">{profile.bio}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
