// pages/nodes/[id].tsx

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import NodeHeader from '@/components/NodeHeader';
import NodeSidebar, { ChannelRow, MemberRow } from '@/components/NodeSidebar';
//import ChannelList from '@/components/ChannelList';
//import MemberList from '@/components/MemberList';
//import MiddleChat from '@/components/MiddleChat';

export interface NodeRow {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

export interface ChannelRowFull {
  id: string;
  node_id: string;
  name: string;
  type: 'text' | 'voice';
  position: number;
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
        setChannels(data.filter((ch: ChannelRowFull) => ch.type === 'text').map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })));
        setVoiceChannels(data.filter((ch: ChannelRowFull) => ch.type === 'voice').map((vc) => ({
          id: vc.id,
          name: vc.name,
          type: vc.type,
        })));
        // Set the first text channel as default selected
        setCurrentChannel(data.find((ch: ChannelRowFull) => ch.type === 'text') || null);
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
        // Map member data to the flat shape NodeSidebar expects
        setMembers(
          data.map((m: any) => ({
            id: m.profile?.id ?? m.id,
            displayName: m.profile?.displayName ?? "",
            username: m.profile?.username ?? "",
            profileImage: m.profile?.profileImage ?? "",
            online_status: m.profile?.online_status ?? "offline",
            chat_bubble_color: m.profile?.chat_bubble_color ?? "#232428",
          }))
        );
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

  // Handler for adding a new channel (placeholder)
  const handleCreateChannel = () => {
    alert("Channel creation coming soon!");
  };

  // Handler for adding a new voice channel (placeholder)
  const handleCreateVoiceChannel = () => {
    alert("Voice channel creation coming soon!");
  };

  return (
    <div className="flex min-h-screen bg-black text-white font-sans">
      <NodeSidebar
        nodeId={typeof id === 'string' ? id : ''}
        channels={channels}
        voiceChannels={voiceChannels}
        members={members}
        selectedChannelId={currentChannel?.id || ''}
        onChannelClick={(channel) => setCurrentChannel(channel)}
        onCreateChannel={handleCreateChannel}
        onCreateVC={handleCreateVoiceChannel}
      />
      <div className="flex-1 flex flex-col">
        {node && (
          <NodeHeader nodeId={node.id} nodeName={node.name} nodeIcon={node.icon ?? null} />
        )}
        <div className="flex flex-1">
          {/* Expand with <ChannelList />, <MiddleChat />, etc, as needed! */}
        </div>
      </div>
    </div>
  );
}
