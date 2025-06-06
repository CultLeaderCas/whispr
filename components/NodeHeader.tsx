import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

interface NodeHeaderProps {
  nodeId: string;
  nodeName: string;
  nodeIcon?: string | null;
}

interface Member {
  id: string;
  displayName: string;
  profileImage: string;
  online_status: 'online' | 'away' | 'dnd' | 'offline';
  themeColor?: string; // For chat bubble color background (future: set this per user)
}

export default function NodeHeader({ nodeId, nodeName, nodeIcon }: NodeHeaderProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [vcCount, setVcCount] = useState<number>(0);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('node_members')
        .select('profile:profile_id(id, displayName, profileImage, online_status, themeColor)')
        .eq('node_id', nodeId);

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        setMembers(data.map((m: any) => m.profile));
      }
    };

    const fetchVCCount = async () => {
      const { count, error } = await supabase
        .from('node_voice_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('node_id', nodeId);
      if (!error) setVcCount(count || 0);
    };

    fetchMembers();
    fetchVCCount();
  }, [nodeId]);

  // Calculate online members (not offline)
  const onlineCount = members.filter((m) => m.online_status === 'online').length;

  return (
    <div className="flex items-center justify-between px-6 py-3 border-b border-[#333] bg-[#111]">
      <div className="flex items-center gap-3">
        {nodeIcon ? (
          <Image src={nodeIcon} alt="Node Icon" width={40} height={40} className="rounded-full" />
        ) : (
          <div className="w-10 h-10 bg-[#333] rounded-full" />
        )}
        <h1 className="text-xl font-bold text-white">{nodeName}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* VC Count */}
        <div className="text-sm text-[#12f7ff] font-semibold">🎧 {vcCount} in VC</div>
        {/* Online Count */}
        <div className="text-sm text-[#fe019a] font-semibold">
          <span className="mr-1">🟢</span>
          {onlineCount} Members online
        </div>
        {/* Avatars */}
        <div className="flex -space-x-2">
          {members.slice(0, 5).map((member) => (
            <Image
              key={member.id}
              src={member.profileImage || '/default-avatar.png'}
              alt={member.displayName}
              width={32}
              height={32}
              className="rounded-full border-2 border-[#12f7ff]"
              title={member.displayName}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
