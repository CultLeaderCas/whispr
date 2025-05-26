// pages/nodes/[id].tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';
import Link from 'next/link';
import NodeHeader from '@/components/NodeHeader';

interface Node {
  id: string;
  name: string;
  icon?: string;
}

interface Member {
  id: string;
  username: string;
  profileImage?: string;
  online_status?: string;
}

export default function NodeViewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [node, setNode] = useState<Node | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userProfile, setUserProfile] = useState<Member | null>(null);
  const [userNodes, setUserNodes] = useState<Node[]>([]);

  useEffect(() => {
    const fetchNode = async () => {
      if (!id || typeof id !== 'string') return;

      const { data, error } = await supabase.from('nodes').select('*').eq('id', id).single();
      if (data) setNode(data);
    };

    fetchNode();
  }, [id]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!id || typeof id !== 'string') return;

      const { data, error } = await supabase
        .from('node_members')
        .select('user_id, profiles (id, username, profileImage, online_status)')
        .eq('node_id', id);

      if (data) {
        const cleaned = data.map((m: any) => m.profiles);
        setMembers(cleaned);
      }
    };

    fetchMembers();
  }, [id]);

  useEffect(() => {
    const fetchProfileAndNodes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, profileImage, online_status')
        .eq('id', user.id)
        .single();

      if (profile) setUserProfile(profile);

      const { data: memberNodes } = await supabase
        .from('node_members')
        .select('node_id, nodes(id, name, icon)')
        .eq('user_id', user.id);

      if (memberNodes) {
        const flattened = memberNodes.map((n: any) => n.nodes);
        setUserNodes(flattened);
      }
    };

    fetchProfileAndNodes();
  }, []);

  const statusColors: any = {
    online: 'border-[#22C55E]',
    away: 'border-[#F59E0B]',
    dnd: 'border-[#EF4444]',
    offline: 'border-[#6B7280]'
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      {/* Left Panel – Node List + My Profile */}
      <div className="w-[220px] bg-[#111] border-r border-[#333] p-4 flex flex-col justify-between">
        <div>
          <Link href="/pulse">
            <button className="w-full mb-4 px-3 py-2 rounded-xl bg-[#12f7ff] text-black font-bold text-sm hover:bg-[#0fd0e0] transition shadow-md">
              Back to Pulse
            </button>
          </Link>

          <h3 className="text-lg font-bold mb-2">Nodes</h3>
          <div className="space-y-3">
            {userNodes.map((node) => (
              <div
                key={node.id}
                onClick={() => router.push(`/nodes/${node.id}`)}
                className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-xl transition cursor-pointer"
              >
                <Image
                  src={node.icon || '/default-node.png'}
                  alt="Node Icon"
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full border border-[#9500FF]"
                />
                <span className="text-sm font-bold truncate">{node.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Profile Corner */}
        {userProfile && (
          <div className="mt-4 border-t border-[#333] pt-4">
            <div className="flex items-center gap-3 cursor-pointer">
              <Image
                src={userProfile.profileImage || '/default-avatar.png'}
                alt="Profile"
                width={40}
                height={40}
                className={`w-10 h-10 rounded-full object-cover border-2 ${statusColors[userProfile.online_status || 'offline']}`}
              />
              <div>
                <p className="font-bold text-sm">{userProfile.username}</p>
                <Link href="/profile">
                  <p className="text-xs text-[#aaa] underline">Edit Profile</p>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
{node && (
  <NodeHeader
    nodeId={node.id}
    nodeName={node.name}
    nodeIcon={node.icon ?? null}
  />
)}

        <div className="flex-1 flex">
          {/* Channel List */}
          <div className="w-[200px] border-r border-[#333] p-4">
            <h2 className="text-sm font-bold uppercase text-[#aaa] mb-2"># Channels</h2>
            <p className="text-cyan-400 hover:underline cursor-pointer"># general</p>
          </div>

          {/* Chat Area */}
          <div className="flex-1 p-4">
            <p className="text-[#aaa] italic">Welcome to the node!</p>
          </div>

          {/* Member List */}
          <div className="w-[200px] border-l border-[#333] p-4">
            <h2 className="text-sm font-bold uppercase text-[#aaa] mb-2">Members</h2>
            {members.length === 0 ? (
              <p className="text-sm italic text-[#555]">Coming soon...</p>
            ) : (
              <ul className="space-y-2">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-2">
                    <Image
                      src={member.profileImage || '/default-avatar.png'}
                      alt="User"
                      width={28}
                      height={28}
                      className={`w-7 h-7 rounded-full object-cover border-2 ${statusColors[member.online_status || 'offline']}`}
                    />
                    <span className="text-sm">{member.username}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
