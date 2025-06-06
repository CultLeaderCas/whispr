import React from "react";
import { ChannelRow, MemberRow } from "@/pages/nodes/[id]"; // Adjust path if needed
import { HiPlus, HiUserGroup, HiVolumeUp } from "react-icons/hi";

interface NodeSidebarProps {
  channels: ChannelRow[];
  voiceChannels: ChannelRow[];
  members: MemberRow[];
  currentChannelId: string;
  onSelectChannel: (channel: ChannelRow) => void;
  onInviteClick?: () => void;
  onCreateChannel?: () => void;
  onCreateVoiceChannel?: () => void;
}

function getStatusGlow(status?: string) {
  switch (status) {
    case "online":
      return "ring-2 ring-green-400";
    case "away":
      return "ring-2 ring-yellow-400";
    case "dnd":
      return "ring-2 ring-red-400";
    default:
      return "ring-2 ring-gray-500";
  }
}

export default function NodeSidebar({
  channels,
  voiceChannels,
  members,
  currentChannelId,
  onSelectChannel,
  onInviteClick,
  onCreateChannel,
  onCreateVoiceChannel,
}: NodeSidebarProps) {
  // Only show online members in the count
  const onlineMembers = members.filter((m) => m.online_status === "online");
  return (
    <div className="w-72 bg-[#151515] border-r border-[#333] flex flex-col py-3 h-full">
      {/* --- Invite to Server --- */}
      <div className="flex items-center justify-between px-4 py-2 mb-2">
        <span className="font-semibold text-[#12f7ff]">Invite to Server</span>
        <button
          title="Invite"
          className="text-lg bg-[#9500FF] hover:bg-[#12f7ff] transition text-white rounded-full w-7 h-7 flex items-center justify-center"
          onClick={onInviteClick}
        >
          <HiUserGroup />
        </button>
      </div>
      <div className="border-b border-[#444] mx-4 mb-2" />

      {/* --- Text Channels --- */}
      <div className="px-4 flex items-center justify-between mb-1 mt-2">
        <span className="text-sm font-semibold text-[#aaa]">Text Channels</span>
        <button
          title="Create Text Channel"
          className="text-lg bg-[#272727] hover:bg-[#12f7ff] transition text-white rounded-full w-7 h-7 flex items-center justify-center"
          onClick={onCreateChannel}
        >
          <HiPlus />
        </button>
      </div>
      <div>
        {channels.length === 0 && (
          <p className="text-xs text-[#666] px-4 mb-2">No channels yet.</p>
        )}
        {channels.map((channel) => (
          <div
            key={channel.id}
            onClick={() => onSelectChannel(channel)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg cursor-pointer transition mb-1 ${
              currentChannelId === channel.id
                ? "bg-[#9500FF] text-white"
                : "hover:bg-[#222] text-[#ccc]"
            }`}
          >
            <span className="text-lg">#</span>
            <span className="truncate">{channel.name}</span>
          </div>
        ))}
      </div>
      <div className="border-b border-[#444] mx-4 my-2" />

      {/* --- Voice Channels --- */}
      <div className="px-4 flex items-center justify-between mb-1 mt-2">
        <span className="text-sm font-semibold text-[#aaa]">Voice Channels</span>
        <button
          title="Create Voice Channel"
          className="text-lg bg-[#272727] hover:bg-[#12f7ff] transition text-white rounded-full w-7 h-7 flex items-center justify-center"
          onClick={onCreateVoiceChannel}
        >
          <HiPlus />
        </button>
      </div>
      <div>
        {voiceChannels.length === 0 && (
          <p className="text-xs text-[#666] px-4 mb-2">No voice channels yet.</p>
        )}
        {voiceChannels.map((vc) => (
          <div
            key={vc.id}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg cursor-pointer transition mb-1 ${
              currentChannelId === vc.id
                ? "bg-[#12f7ff] text-black"
                : "hover:bg-[#1a1a1a] text-[#bbb]"
            }`}
            onClick={() => onSelectChannel(vc)}
          >
            <HiVolumeUp className="text-lg" />
            <span className="truncate">{vc.name}</span>
            {/* Placeholder for in-vc count: */}
            <span className="ml-auto text-xs text-[#12f7ff] font-semibold">0 in vc</span>
          </div>
        ))}
      </div>
      <div className="border-b border-[#444] mx-4 my-2" />

      {/* --- Members --- */}
      <div className="flex items-center justify-between px-4 py-2 mt-2">
        <span className="text-sm font-semibold text-[#aaa]">Members</span>
        <span className="text-xs text-[#12f7ff]">{onlineMembers.length} Online</span>
      </div>
      <div className="space-y-2 px-4 overflow-y-auto">
        {members.length === 0 && (
          <p className="text-xs text-[#666]">No members in this node.</p>
        )}
        {members.map((member) => (
          <div
            key={member.id}
            className={`flex items-center gap-2 px-2 py-1 rounded-lg`}
            style={{
              background: member.chat_bubble_color || "#232323", // Their chosen chat bubble color
            }}
          >
            <div
              className={`w-7 h-7 rounded-full border-2 object-cover ${getStatusGlow(
                member.online_status
              )} overflow-hidden`}
              style={{ borderColor: member.chat_bubble_color || "#12f7ff" }}
            >
              <img
                src={member.profileImage || "/default-avatar.png"}
                alt={member.displayName || "Member"}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-semibold text-xs truncate">
              {member.displayName}
            </span>
            {member.online_status === "online" && (
              <span className="ml-auto text-green-400 text-xs">●</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
