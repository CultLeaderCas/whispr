import { useState } from 'react';

type Channel = { id: string; name: string };
type NodeSidebarProps = {
  nodeId: string;
  channels?: Channel[];
  voiceChannels?: Channel[];
  onCreateChannel: () => void;
  onCreateVC: () => void;
};

export default function NodeSidebar({
  nodeId,
  channels = [],
  voiceChannels = [],
  onCreateChannel,
  onCreateVC,
}: NodeSidebarProps) {
  const [showInvite, setShowInvite] = useState(false);

  // Invite link (adjust origin as needed)
  const inviteLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${nodeId}`;

  return (
    <aside className="w-[260px] bg-[#18191c] border-r border-[#282a2e] flex flex-col h-full">
      {/* Invite Button */}
      <div className="p-4">
        <button
          className="w-full mb-2 px-4 py-2 rounded-xl bg-[#12f7ff] text-[#18191c] font-bold text-sm hover:bg-[#0fd0e0] transition shadow"
          onClick={() => setShowInvite(true)}
        >
          + Invite to Server
        </button>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-[#18191c] border border-[#282a2e] rounded-2xl p-6 shadow-2xl w-[340px]">
            <h3 className="font-bold text-lg mb-2 text-white text-center">Invite to Server</h3>
            <p className="mb-3 text-[#aaa] text-center text-sm">Share this link to invite others:</p>
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={inviteLink}
                readOnly
                className="flex-1 bg-[#232428] border border-[#333] rounded-lg px-2 py-1 text-white text-xs"
                onFocus={e => e.target.select()}
              />
              <button
                className="bg-[#fe019a] hover:bg-[#d0017e] text-white rounded-lg px-3 py-1 font-bold text-xs transition"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  alert('Invite link copied!');
                }}
              >
                Copy
              </button>
            </div>
            <button
              className="w-full mt-2 px-4 py-2 rounded-xl bg-[#12f7ff] text-[#18191c] font-bold text-sm hover:bg-[#0fd0e0] transition"
              onClick={() => setShowInvite(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Channels Section */}
      <div className="flex-1 px-4 pb-4 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="uppercase text-xs font-bold tracking-wide text-[#aaa]">Channels</span>
            <button
              className="text-[#12f7ff] text-lg font-bold px-2 hover:text-[#9500FF] transition"
              onClick={onCreateChannel}
              title="Create Channel"
            >
              +
            </button>
          </div>
          <div className="space-y-1">
            {channels.map(channel => (
              <div key={channel.id} className="py-2 px-3 rounded-lg hover:bg-[#232428] flex items-center">
                <span className="font-medium text-white">{channel.name}</span>
              </div>
            ))}
            {channels.length === 0 && (
              <div className="py-2 px-3 rounded-lg text-[#888] text-xs italic">
                No channels yet.
              </div>
            )}
          </div>
        </div>

        {/* Separator Line */}
        <div className="border-t border-[#282a2e] my-3"></div>

        {/* Voice Channels Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="uppercase text-xs font-bold tracking-wide text-[#aaa]">Voice Channels</span>
            <button
              className="text-[#12f7ff] text-lg font-bold px-2 hover:text-[#9500FF] transition"
              onClick={onCreateVC}
              title="Create Voice Channel"
            >
              +
            </button>
          </div>
          <div className="space-y-1">
            {voiceChannels.map(vc => (
              <div key={vc.id} className="py-2 px-3 rounded-lg hover:bg-[#232428] flex items-center">
                <span className="font-medium text-white">{vc.name}</span>
                {/* You can add a mic/headphone icon here! */}
              </div>
            ))}
            {voiceChannels.length === 0 && (
              <div className="py-2 px-3 rounded-lg text-[#888] text-xs italic">
                No voice channels yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
