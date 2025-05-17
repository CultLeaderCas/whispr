import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function PulsePage() {
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) console.error('Error fetching profiles:', error.message);
      else setProfiles(data);
    };

    fetchProfiles();
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1e1f22] h-screen p-4">
          <h2 className="text-xl font-bold mb-4">Whispr</h2>
          <nav>
            <ul>
              <li className="mb-2">Friends</li>
              <li className="mb-2">Pulse</li>
              <li className="mb-2">Settings</li>
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <section className="flex-1 p-6">
          <h1 className="text-2xl font-semibold mb-4">Online Users</h1>
          <div className="space-y-4">
            {profiles.map((profile, index) => (
              <div key={index} className="flex items-center bg-[#2c2f33] p-4 rounded-lg shadow">
                <div className="w-12 h-12 bg-[#444] rounded-full overflow-hidden mr-4">
                  {profile.profileImage ? (
                    <img src={profile.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#666]" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium">{profile.displayName || 'Anonymous'}</p>
                  <p className="text-sm text-gray-400">@{profile.username}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
