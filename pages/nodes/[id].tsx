// pages/nodes/[id].tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import NodeHeader from '@/components/NodeHeader';
import NodeSidebar from '@/components/NodeSidebar';
import ChannelList from '@/components/ChannelList';
import MemberList from '@/components/MemberList';
import MiddleChat from '@/components/MiddleChat';

export interface NodeRow {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface ChannelRow {
  id: string;
  node_id: string;
  name: string;
  type: 'text' | 'voice';
  position: number;
}

interface MemberRow {
  id: string;
  node_id: string;
  user_id: string;
  joined_at: string;
  profiles: {
    id: string;
    username: string;
    displayName: string;
    profileImage?: string;
    online_status?: 'online' | 'away' | 'dnd' | 'offline';
    chat_bubble_color?: string;
  };
}


export interface Profile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  themeColor?: string;
  online_status?: string;
  chat_bubble_color?: string;
}

export default function NodeViewPage() {
  const router = useRouter();
  const { id } = router.query;

  const [node, setNode] = useState<NodeRow | null>(null);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<ChannelRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userNodes, setUserNodes] = useState<NodeRow[]>([]);
  const [currentChannel, setCurrentChannel] = useState<ChannelRow | null>(null);

  // Fetch node details
  useEffect(() => {
    if (!id) return;
    const fetchNode = async () => {
      const { data, error } = await supabase
        .from('nodes')
        .select('*')
        .eq('id', id)
        .single();
      if (error) {
        setNode(null);
      } else {
        setNode(data as NodeRow);
      }
    };
    fetchNode();
  }, [id]);

  // Fetch channels for the node
  useEffect(() => {
    if (!id) return;
    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('node_id', id)
        .order('position', { ascending: true });

      if (!error && data) {
        setChannels(data.filter((ch: ChannelRow) => ch.type === 'text'));
        setVoiceChannels(data.filter((ch: ChannelRow) => ch.type === 'voice'));
        // Set the first text channel as default selected
        setCurrentChannel(data.find((ch: ChannelRow) => ch.type === 'text') || null);
      }
    };
    fetchChannels();
  }, [id]);

  // Fetch members for the node
  useEffect(() => {
    if (!id) return;
    const fetchMembers = async () => {
      const { data, error } = await supabase
        .from('node_members')
        .select('*, profile:profile_id (id, username, displayName, profileImage, themeColor, online_status, chat_bubble_color)')
        .eq('node_id', id);

      if (!error && data) {
        setMembers(data as MemberRow[]);
      }
    };
    fetchMembers();
  }, [id]);

  // Fetch current user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (!error && data) {
        setUserProfile(data as Profile);
      }
    };
    fetchUserProfile();
  }, []);

  // Fetch nodes user is a member of
  useEffect(() => {
    const fetchUserNodes = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('node_members')
        .select('nodes:node_id (id, name, icon)')
        .eq('user_id', user.id);
      if (!error && data) {
        setUserNodes(data.map((row: any) => row.nodes as NodeRow));
      }
    };
    fetchUserNodes();
  }, []);

  // Handler for selecting a channel
  const handleSelectChannel = (channel: ChannelRow) => {
    setCurrentChannel(channel);
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      <NodeSidebar
        userProfile={userProfile}
        userNodes={userNodes}
        currentNodeId={typeof id === 'string' ? id : ''}
        onInviteToNode={() => {/* Invite logic here */}}
        // Add other props as needed
      />
      <div className="flex-1 flex flex-col">
        {node && (
          <NodeHeader nodeId={node.id} nodeName={node.name} nodeIcon={node.icon ?? null} />
        )}
        <div className="flex flex-1">
          <ChannelList
            channels={channels}
            voiceChannels={voiceChannels}
            currentChannelId={currentChannel?.id || ''}
            onSelectChannel={handleSelectChannel} members={[]}          />
          <MiddleChat
            node={node}
            channel={currentChannel}
            userProfile={userProfile}
            members={members}
          />
          <MemberList members={members} />
        </div>
      </div>
    </div>
  );
}
