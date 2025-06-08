import React, { useState, useEffect } from "react";
import {
  HiPlus,
  HiUserGroup,
  HiVolumeUp,
  HiOutlineX,
  HiSparkles,
  HiUser,
  HiStar
} from "react-icons/hi";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export interface ChannelRow {
  id: string;
  name: string;
  type?: string;
}
export interface MemberRow {
  id: string;
  displayName: string;
  username: string;
  profileImage: string;
  online_status?: "online" | "away" | "dnd" | "offline";
  chat_bubble_color?: string;
  is_owner?: boolean;
  is_admin?: boolean;
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
}: NodeSidebarProps) {
  const router = useRouter();

  // Current user/admin state
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [showVCModal, setShowVCModal] = useState(false);
  const [friends, setFriends] = useState<MemberRow[]>([]);
  const [profileView, setProfileView] = useState<MemberRow | null>(null);
  const [channelName, setChannelName] = useState("");
  const [vcName, setVCName] = useState("");
  const [creationBurst, setCreationBurst] = useState(false);

  // Fetch user and admin status
  useEffect(() => {
    let mounted = true;
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted || !user) return;
      setUserId(user.id);
      // Check ownership/admin status in node_members (assuming you have is_owner/is_admin fields)
      const { data } = await supabase
        .from("node_members")
        .select("is_owner, is_admin")
        .eq("user_id", user.id)
        .eq("node_id", nodeId)
        .single();
      setIsAdmin(data?.is_owner || data?.is_admin);
    }
    checkAdmin();
    return () => { mounted = false; };
  }, [nodeId]);

  // Fetch friends when inviting
  useEffect(() => {
    if (!showInvite) return;
    async function fetchFriends() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: friendLinks } = await supabase
        .from("friends")
        .select("friend_id")
        .eq("user_id", user.id);
      if (!friendLinks || friendLinks.length === 0) return setFriends([]);
      const friendIds = friendLinks.map((f: any) => f.friend_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", friendIds);
      setFriends(profiles || []);
    }
    fetchFriends();
  }, [showInvite]);

  // ---- CHANNEL CREATION ----
  const createChannel = async (type: "text" | "voice") => {
    const name = type === "text" ? channelName.trim() : vcName.trim();
    if (!name) return;
    await supabase.from("channels").insert({
      node_id: nodeId,
      name,
      type,
      position: (type === "text" ? channels.length : voiceChannels.length) + 1,
    });
    // Animation for burst!
    setCreationBurst(true);
    setTimeout(() => setCreationBurst(false), 800);
    setChannelName("");
    setVCName("");
    setShowChannelModal(false);
    setShowVCModal(false);
  };

  // --- Online member count ---
  const onlineCount = members.filter((m) => m.online_status === "online").length;

  // --- Owner always #1, then admins, then online, then the rest
  const sortedMembers = [
    ...members.filter((m) => m.is_owner),
    ...members.filter((m) => !m.is_owner && m.is_admin),
    ...members.filter(
      (m) => !m.is_owner && !m.is_admin && m.online_status === "online"
    ),
    ...members.filter(
      (m) => !m.is_owner && !m.is_admin && m.online_status !== "online"
    ),
  ].filter((v, i, arr) => arr.findIndex((vv) => vv.id === v.id) === i);

  return (
    <div className="w-[270px] bg-[#18191c] border-r border-[#282a2e] flex flex-col relative h-full overflow-y-auto">
      {/* ---- BURST ANIMATION ---- */}
      {creationBurst && (
        <div className="pointer-events-none absolute inset-0 z-50 animate-pulse">
          <div className="absolute left-1/2 top-20 -translate-x-1/2">
            <HiSparkles className="text-[#12f7ff] text-7xl drop-shadow-glow animate-spin-slow" />
          </div>
        </div>
      )}

      {/* --- INVITE BUTTON --- */}
      <div className="p-4 flex items-center justify-between border-b border-[#282a2e]">
        <span className="font-bold text-lg text-white truncate flex items-center gap-1">
          Server Menu <HiStar className="ml-1 text-[#9500FF] animate-pulse" />
        </span>
        <button
          title="Invite to Server"
          onClick={() => setShowInvite(true)}
          className="ml-2 bg-[#12f7ff] text-[#18191c] hover:bg-[#0fd0e0] rounded-lg p-2 transition font-bold text-xl shadow-[0_0_8px_2px_#12f7ff44]"
        >
          <HiUserGroup />
        </button>
      </div>

      {/* ---- INVITE MODAL ---- */}
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
                      const { data: node } = await supabase
                        .from("nodes")
                        .select("name, icon")
                        .eq("id", nodeId)
                        .single();
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user) {
                        alert("You must be logged in to send invites.");
                        return;
                      }
                      // Send DM
                      await supabase.from("messages").insert({
                        sender_id: user.id,
                        recipient_id: friend.id,
                        content: `[INVITE]\nServer: ${node?.name || "Server"}\n![icon](${node?.icon || "/default-node.png"})\nJoin here: ${inviteLink}`,
                        created_at: new Date().toISOString(),
                        type: "server_invite",
                      });
                      // Send Notification
                      await supabase.from("notifications").insert({
                        from_user_id: user.id,
                        to_user_id: friend.id,
                        type: "server_invite",
                        message: `You've been invited to join ${node?.name || "a server"}!`,
                        link: `/join/${nodeId}`,
                        created_at: new Date().toISOString(),
                        is_read: false,
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

      {/* ---- CREATE CHANNEL MODAL ---- */}
      {showChannelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gradient-to-br from-[#222448] via-[#18191c] to-[#232428] border border-[#9500FF] rounded-2xl p-7 shadow-2xl w-[340px] relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-[#9500FF] hover:text-[#fe019a] text-2xl"
              onClick={() => setShowChannelModal(false)}
              title="Close"
            >
              <HiOutlineX />
            </button>
            <h3 className="font-bold text-xl mb-3 text-white text-center">
              <HiSparkles className="inline text-[#12f7ff] mr-1" />
              New Channel
            </h3>
            <input
              className="w-full mb-4 p-2 rounded-lg bg-[#18191c] border border-[#282a2e] text-white focus:ring-2 focus:ring-[#12f7ff] transition"
              placeholder="Channel name"
              value={channelName}
              onChange={e => setChannelName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <button
              className="w-full bg-gradient-to-r from-[#9500FF] via-[#12f7ff] to-[#0fd0e0] text-white font-bold py-2 rounded-lg hover:scale-105 hover:from-[#12f7ff] transition-all duration-200 shadow-[0_0_12px_1px_#12f7ff88]"
              onClick={() => createChannel("text")}
              disabled={!channelName.trim()}
            >
              <HiPlus className="inline mr-1 -mt-1" />
              Create Channel
            </button>
            <style jsx>{`
              .animate-fade-in { animation: fadeIn 0.3s ease; }
              @keyframes fadeIn { from { opacity: 0; transform: scale(0.95);} to {opacity: 1; transform: scale(1);} }
            `}</style>
          </div>
        </div>
      )}

      {/* ---- CREATE VOICE CHANNEL MODAL ---- */}
      {showVCModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-gradient-to-br from-[#0fd0e0] via-[#232428] to-[#9500FF] border border-[#9500FF] rounded-2xl p-7 shadow-2xl w-[340px] relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-[#9500FF] hover:text-[#fe019a] text-2xl"
              onClick={() => setShowVCModal(false)}
              title="Close"
            >
              <HiOutlineX />
            </button>
            <h3 className="font-bold text-xl mb-3 text-white text-center">
              <HiVolumeUp className="inline text-[#12f7ff] mr-1" />
              New Voice Channel
            </h3>
            <input
              className="w-full mb-4 p-2 rounded-lg bg-[#18191c] border border-[#282a2e] text-white focus:ring-2 focus:ring-[#9500FF] transition"
              placeholder="Voice channel name"
              value={vcName}
              onChange={e => setVCName(e.target.value)}
              maxLength={30}
              autoFocus
            />
            <button
              className="w-full bg-gradient-to-r from-[#12f7ff] via-[#9500FF] to-[#0fd0e0] text-white font-bold py-2 rounded-lg hover:scale-105 hover:via-[#12f7ff] transition-all duration-200 shadow-[0_0_12px_1px_#9500ff77]"
              onClick={() => createChannel("voice")}
              disabled={!vcName.trim()}
            >
              <HiPlus className="inline mr-1 -mt-1" />
              Create Voice Channel
            </button>
          </div>
        </div>
      )}

      {/* --- CHANNELS --- */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-sm text-[#aaa] uppercase tracking-wide">
            Channels
          </span>
          {isAdmin && (
            <button
              title="Add Channel"
              className="bg-[#282a2e] text-[#12f7ff] hover:bg-[#232428] rounded p-1.5 ml-1 animate-pulse"
              onClick={() => setShowChannelModal(true)}
            >
              <HiPlus />
            </button>
          )}
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
                  ? "bg-gradient-to-r from-[#9500FF] via-[#12f7ff] to-[#0fd0e0] text-white shadow-md"
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
          {isAdmin && (
            <button
              title="Add Voice Channel"
              className="bg-[#282a2e] text-[#12f7ff] hover:bg-[#232428] rounded p-1.5 ml-1 animate-pulse"
              onClick={() => setShowVCModal(true)}
            >
              <HiPlus />
            </button>
          )}
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
            {members.length} member{members.length !== 1 && "s"} / {onlineCount} online
          </span>
        </div>
        <div className="mb-3 border-b border-[#232428]" />
        {sortedMembers.length === 0 ? (
          <div className="text-xs text-[#555] italic pl-1 pb-2">No members yet.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-lg p-2 cursor-pointer transition hover:scale-[1.02] hover:shadow-md"
                style={{
                  background: member.chat_bubble_color || "#232428",
                  border: member.is_owner
                    ? "2px solid #12f7ff"
                    : member.is_admin
                    ? "1.5px solid #9500FF"
                    : undefined,
                }}
                onClick={() => setProfileView(member)}
                title={member.is_owner ? "Owner" : member.is_admin ? "Admin" : "Member"}
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
                <span className="text-[#eee] font-medium truncate flex items-center gap-1">
                  {member.displayName || member.username}
                  {member.is_owner && (
                    <HiStar className="ml-1 text-[#12f7ff] animate-pulse" title="Owner" />
                  )}
                  {!member.is_owner && member.is_admin && (
                    <HiUser className="ml-1 text-[#9500FF] animate-bounce" title="Admin" />
                  )}
                </span>
                <span className="text-xs text-[#888]">
                  {member.online_status === "online"
                    ? "Online"
                    : member.online_status === "away"
                    ? "Away"
                    : member.online_status === "dnd"
                    ? "DND"
                    : "Offline"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MEMBER PROFILE MODAL --- */}
      {profileView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-gradient-to-br from-[#12f7ff] via-[#232428] to-[#9500FF] rounded-2xl p-8 shadow-2xl min-w-[320px] max-w-[90vw] border border-[#9500FF] relative animate-fade-in">
            <button
              className="absolute top-3 right-3 text-[#9500FF] hover:text-[#fe019a] text-2xl"
              onClick={() => setProfileView(null)}
              title="Close"
            >
              <HiOutlineX />
            </button>
            <div className="flex flex-col items-center gap-2">
              <img
                src={profileView.profileImage || "/default-avatar.png"}
                alt={profileView.displayName}
                className="w-20 h-20 rounded-full border-4"
                style={{
                  borderColor: profileView.is_owner
                    ? "#12f7ff"
                    : profileView.is_admin
                    ? "#9500FF"
                    : "#aaa",
                }}
              />
              <h2 className="text-2xl font-bold text-white mt-2 flex items-center gap-2">
                {profileView.displayName || profileView.username}
                {profileView.is_owner && (
                  <HiStar className="text-[#12f7ff] animate-pulse" title="Owner" />
                )}
                {!profileView.is_owner && profileView.is_admin && (
                  <HiUser className="text-[#9500FF] animate-bounce" title="Admin" />
                )}
              </h2>
              <p className="text-[#bbb] text-center italic">
                @{profileView.username}
              </p>
              <p className="text-[#12f7ff] mt-1 font-semibold">
                Status:{" "}
                <span>
                  {profileView.online_status === "online"
                    ? "Online"
                    : profileView.online_status === "away"
                    ? "Away"
                    : profileView.online_status === "dnd"
                    ? "DND"
                    : "Offline"}
                </span>
              </p>
              <p className="mt-2 text-[#eee] text-center">
                {profileView.chat_bubble_color
                  ? (
                    <>
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1"
                        style={{
                          background: profileView.chat_bubble_color,
                          border: "1px solid #333",
                        }}
                      ></span>
                      <span>Chat Color Active</span>
                    </>
                  )
                  : null}
              </p>
              <button
                className="mt-4 px-6 py-2 rounded-xl bg-gradient-to-r from-[#9500FF] via-[#12f7ff] to-[#0fd0e0] text-white font-bold shadow-md hover:scale-105 transition"
                onClick={() => setProfileView(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
