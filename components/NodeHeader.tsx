// components/NodeHeader.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

interface NodeHeaderProps {
  nodeId: string;
  nodeName: string;
  nodeIcon?: string | null;
}

// (Removed duplicate export and implementation)


interface Member {
  id: string;
  displayName: string;
  profileImage: string;
  online_status: 'online' | 'away' | 'dnd' | 'offline';
}

export default function NodeHeader({ nodeId, nodeName, nodeIcon }: NodeHeaderProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [vcCount, setVcCount] = useState<number>(0);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('node_members')
        .select('profile:profile_id(id, displayName, profileImage, online_status)')
        .eq('node_id', nodeId);

      if (error) {
        console.error('Error fetching members:', error);
      } else {
        const onlineMembers = data
          .map((m: any) => m.profile)
          .filter((m: Member) => m.online_status !== 'offline');
        setMembers(onlineMembers);
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
