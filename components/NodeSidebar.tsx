import React, { useState, useEffect } from "react";
import { HiPlus, HiUserGroup, HiVolumeUp, HiOutlineX } from "react-icons/hi";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

// --- Type Definitions ---
export interface ChannelRow {
  id: string;
  name: string;
  type?: string; // "text" or "voice"
}

export interface MemberRow {
  id: string;
  displayName: string;
  username: string;
  profileImage: string;
  online_status?: "online" | "away" | "dnd" | "offline";
  chat_bubble_color?: string;
}

export interface NodeSidebarProps {
  nodeId: string;
  channels: ChannelRow[];
  voiceChannels: ChannelRow[];
  members: MemberRow[];
  selectedChannelId: string;
  onChannelClick: (channel: ChannelRow) => void;
  onCreateChannel?: () => void;
  onCreateVC?: () => void;
}

export default function NodeSidebar({
  nodeId,
  channels,
  voiceChannels,
  members,
  selectedChannelId,
  onChannelClick,
  onCreateChannel,
  onCreateVC,
}: NodeSidebarProps) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);

  // Friends for the invite popup
  const [friends, setFriends] = useState<MemberRow[]>([]);

  useEffect(() => {
    if (!showInvite) return;
    async function fetchFriends() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Get friend ids
      const { data: friendLinks } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", user.id);
      if (!friendLinks || friendLinks.length === 0) return setFriends([]);
      const friendIds = friendLinks.map((f: any) => f.friend_id);
      // Get friend profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds);
      setFriends(profiles || []);
    }
    fetchFriends();
  }, [showInvite]);

  // Online members only (for the little badge)
  const onlineCount = members.filter((m) => m.online_status === "online").length;

  return (
    <div className="w-[270px] bg-[#18191c] border-r border-[#282a2e] flex flex-col relative h-full">
      {/* --- INVITE TO SERVER BUTTON --- */}
      <div className="p-4 flex items-center justify-between border-b border-[#282a2e]">
        <span className="font-bold text-lg text-white truncate">Server Menu</span>
        <button
          title="Invite to Server"
          onClick={() => setShowInvite(true)}
          className="ml-2 bg-[#12f7ff] text-[#18191c] hover:bg-[#0fd0e0] rounded-lg p-2 transition font-bold text-xl"
        >
          <HiUserGroup />
        </button>
      </div>

      {/* --- INVITE MODAL --- */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#18191c] border border-[#282a2e] rounded-2xl p-6 shadow-2xl w-[340px] max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-3 right-3 text-[#9500FF] hover:text-[#fe019a] text-2xl"
              onClick={() => setShowInvite(false)}
              title="Close"
            >
              <HiOutlineX />
            </button>
            <h3 className="font-bold text-lg mb-2 text-white text-center">
              Invite to Server
            </h3>
            <p className="mb-3 text-[#aaa] text-center text-sm">
              Send an invite link to your friends via DM:
            </p>
            <div className="space-y-2">
              {friends.length === 0 && (
                <p className="text-center text-[#888] text-xs">
                  No friends yet.
                </p>
              )}
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-2 bg-[#232428] rounded-lg p-2"
                >
                  <img
                    src={friend.profileImage || "/default-avatar.png"}
                    alt={friend.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="flex-1 text-white font-medium">
                    @{friend.username}
                  </span>
                  <button
                    className="bg-[#12f7ff] hover:bg-[#0fd0e0] text-[#18191c] font-bold px-2 py-1 rounded-lg text-xs"
                    onClick={async () => {
                      const inviteLink = `${window.location.origin}/join/${nodeId}`;
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        alert("You must be logged in to send invites.");
                        return;
                      }
                      // Insert invite DM
                      await supabase.from("messages").insert({
                        sender_id: user.id,
                        recipient_id: friend.id,
                        content: `You've been invited to join a server! Click here: ${inviteLink}`,
                        created_at: new Date().toISOString(),
                      });
                      alert("Invite sent to " + friend.displayName + "!");
                    }}
                  >
                    Send Invite
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center justify-center">
                <span className="text-xs text-[#aaa]">
                  Or copy invite link:
                </span>
                <button
                  className="ml-2 px-3 py-1 bg-[#9500FF] text-white rounded font-bold text-xs hover:bg-[#fe019a] transition"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/join/${nodeId}`
                    );
                    alert("Copied!");
                  }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- CHANNELS --- */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-[#aaa] uppercase tracking-wide">
            Channels
          </span>
          <button
            title="Add Channel"
            className="bg-[#282a2e] text-[#12f7ff] hover:bg-[#232428] rounded p-1.5 ml-1"
            onClick={onCreateChannel ? onCreateChannel : () => router.push(`/nodes/${nodeId}/create-channel`)}
          >
            <HiPlus />
          </button>
        </div>
        <div className="mb-3 border-b border-[#232428]" />
        {channels.length === 0 && (
          <div className="text-xs text-[#555] italic pl-1 pb-2">No text channels.</div>
        )}
        <div className="flex flex-col gap-1">
          {channels.map((channel) => (
            <button
              key={channel.id}
              className={`w-full text-left px-3 py-2 rounded-lg transition font-medium ${
                selectedChannelId === channel.id
                  ? "bg-[#9500FF] text-white"
                  : "bg-[#232428] hover:bg-[#2e2f34] text-[#bbb]"
              }`}
              onClick={() => onChannelClick(channel)}
            >
              #{channel.name}
            </button>
          ))}
        </div>
      </div>

      {/* --- VOICE CHANNELS --- */}
      <div className="px-4 pt-5">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-[#aaa] uppercase tracking-wide">
            Voice Channels
          </span>
          <button
            title="Add Voice Channel"
            className="bg-[#282a2e] text-[#12f7ff] hover:bg-[#232428] rounded p-1.5 ml-1"
            onClick={onCreateVC ? onCreateVC : () => router.push(`/nodes/${nodeId}/create-voice`)}
          >
            <HiPlus />
          </button>
        </div>
        <div className="mb-3 border-b border-[#232428]" />
        {voiceChannels.length === 0 && (
          <div className="text-xs text-[#555] italic pl-1 pb-2">No voice channels.</div>
        )}
        <div className="flex flex-col gap-1">
          {voiceChannels.map((vc) => (
            <button
              key={vc.id}
              className="w-full text-left px-3 py-2 rounded-lg transition font-medium bg-[#232428] hover:bg-[#2e2f34] text-[#bbb]"
              // onClick={() => ... handle VC join ...}
            >
              <HiVolumeUp className="inline-block mr-2" />
              {vc.name}
              <span className="text-xs text-[#555] ml-2">(0 in VC)</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- MEMBERS --- */}
      <div className="px-4 pt-5 pb-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-[#aaa] uppercase tracking-wide">
            Members
          </span>
          <span className="text-xs text-[#12f7ff]">
            {onlineCount} online
          </span>
        </div>
        <div className="mb-3 border-b border-[#232428]" />
        {members.length === 0 && (
          <div className="text-xs text-[#555] italic pl-1 pb-2">No members.</div>
        )}
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-2 rounded-lg p-2"
              style={{
                background: member.chat_bubble_color || "#232428",
              }}
            >
              <span
                className={`w-2 h-2 rounded-full mr-2`}
                style={{
                  background:
                    member.online_status === "online"
                      ? "#22C55E"
                      : member.online_status === "away"
                      ? "#F59E0B"
                      : member.online_status === "dnd"
                      ? "#EF4444"
                      : "#6B7280",
                }}
              />
              <img
                src={member.profileImage || "/default-avatar.png"}
                alt={member.displayName}
                className="w-7 h-7 rounded-full"
              />
              <span className="text-[#eee] font-medium truncate">
                {member.displayName || member.username}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
