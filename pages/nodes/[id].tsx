// pages/nodes/[id].tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

interface Node {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
}

export default function NodeViewPage() {
  const router = useRouter();
  const { id: nodeId } = router.query;

  const [node, setNode] = useState<Node | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!nodeId || typeof nodeId !== 'string') return;

    const fetchNode = async () => {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', nodeId)
        .single();

      if (error) {
        console.error('Failed to fetch node:', error.message);
      } else {
        setNode(data);
      }
      setLoading(false);
    };

    fetchNode();
  }, [nodeId]);

  if (loading) {
    return <div className="text-white p-6">Loading...</div>;
  }

  if (!node) {
    return <div className="text-red-400 p-6">Node not found.</div>;
  }

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-white">
      {/* Left Sidebar */}
      <div className="w-[240px] bg-[#111] p-4 border-r border-[#333] space-y-4">
        <h2 className="font-bold text-lg">Nodes</h2>
        <button
          onClick={() => router.push('/pulse')}
          className="w-full bg-[#12f7ff] text-black font-bold px-4 py-2 rounded-xl hover:bg-[#0fd0e0] transition"
        >
          Back to Pulse
        </button>
      </div>

      {/* Node Main View */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-[#333] flex items-center gap-4 bg-[#1a1a1a]">
          {node.icon ? (
            <Image
              src={node.icon}
              alt="Node Icon"
              width={48}
              height={48}
              className="rounded-full object-cover border border-[#9500FF]"
            />
          ) : (
            <div className="w-12 h-12 bg-[#333] rounded-full" />
          )}
          <div>
            <h1 className="font-bold text-xl">{node.name}</h1>
            <p className="text-xs text-[#888]">Node ID: {node.id}</p>
          </div>
        </div>

        {/* Placeholder for chats and channels */}
        <div className="flex-1 flex">
          <div className="w-[280px] bg-[#111] border-r border-[#333] p-4">
            <h3 className="text-sm font-bold mb-2"># Channels</h3>
            <ul className="space-y-2">
              <li className="text-[#12f7ff] cursor-pointer"># general</li>
            </ul>
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            <p className="italic text-[#aaa]">Welcome to the node!</p>
          </div>

          <div className="w-[280px] bg-[#111] border-l border-[#333] p-4">
            <h3 className="text-sm font-bold mb-2">Members</h3>
            <p className="text-sm text-[#666] italic">Coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
