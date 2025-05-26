import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image';

interface Node {
  id: string;
  name: string;
  icon: string;
}

interface Profile {
  id: string;
  displayName: string;
  profileImage: string;
  themeColor?: string;
}

export default function NodeSidebar({ currentUser }: { currentUser: Profile | null }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchNodes = async () => {
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('node_memberships')
        .select('node_id, nodes (id, name, icon)')
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error fetching nodes:', error.message);
      } else {
        const clean = data.map((entry: any) => entry.nodes).filter((n: any) => !!n);
        setNodes(clean);
      }
    };

    fetchNodes();
  }, [currentUser]);

  const handleNodeClick = (nodeId: string) => {
    router.push(`/nodes/${nodeId}`);
  };

  return (
    <div className="w-[80px] bg-[#0e0e0e] border-r border-[#222] flex flex-col justify-between py-4">
      <div className="space-y-3 px-2 overflow-y-auto">
        {nodes.map((node) => (
          <div
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            className="w-14 h-14 rounded-2xl overflow-hidden mx-auto cursor-pointer border-2 border-[#9500FF] hover:scale-105 transition"
          >
            <Image
              src={node.icon || '/default-node.png'}
              alt={node.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {currentUser && (
        <div className="px-2 mt-4">
          <div className="w-14 h-14 rounded-2xl overflow-hidden mx-auto border-2 border-[#12f7ff]">
            <Image
              src={currentUser.profileImage || '/default-avatar.png'}
              alt={currentUser.displayName}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          </div>
          <button
            onClick={() => router.push('/profile')}
            className="mt-2 text-[10px] w-full bg-[#12f7ff] text-black font-bold rounded-full px-2 py-1 text-center hover:bg-[#0fd0e0] transition"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}
