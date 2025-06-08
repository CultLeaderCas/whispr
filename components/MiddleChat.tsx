import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    displayName: string;
    profileImage: string;
    themeColor?: string;
  };
}

interface MiddleChatProps {
  channelId: string;
  currentUserId: string;
}

export default function MiddleChat({ channelId, currentUserId }: MiddleChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch and subscribe to messages
  useEffect(() => {
    if (!channelId) return;

    let channel: any = null;

    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*, user:user_id(id, displayName, profileImage, themeColor)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true });
      if (!error && data) setMessages(data);
      setLoading(false);
    };

    fetchMessages();

    channel = supabase
      .channel(`realtime:messages:${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [channelId]);

  // Scroll to bottom on message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !channelId) return;
    setInput("");
    await supabase.from("messages").insert({
      channel_id: channelId,
      user_id: currentUserId,
      content: trimmed,
      created_at: new Date().toISOString(),
    });
  };

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-[#141622] to-[#18191c] rounded-2xl shadow-2xl mx-6 my-6 p-4 border border-[#232428] overflow-hidden relative">
      <div className="flex-1 overflow-y-auto pr-2 mb-2 custom-scroll">
        {loading && <p className="text-[#12f7ff] italic">Loading messages...</p>}
        {!loading && messages.length === 0 && (
          <div className="text-center text-[#888] italic mt-10">No messages yet. Be the first to say something! 🌟</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 mb-4 items-start ${msg.user_id === currentUserId ? "justify-end" : ""}`}
          >
            {msg.user_id !== currentUserId && (
              <Image
                src={msg.user?.profileImage || "/default-avatar.png"}
                alt={msg.user?.displayName || "User"}
                width={36}
                height={36}
                className="rounded-full border-2"
                style={{ borderColor: msg.user?.themeColor || "#12f7ff" }}
              />
            )}
            <div
              className={`rounded-xl px-4 py-2 max-w-[70%] shadow-md transition-colors ${
                msg.user_id === currentUserId
                  ? "bg-[#9500FF] text-white ml-auto"
                  : "bg-[#232428] text-[#eee]"
              }`}
              style={{
                border: msg.user_id === currentUserId ? "2px solid #12f7ff" : undefined,
                boxShadow: msg.user_id !== currentUserId ? "0 1px 8px 1px #0fd0e0aa" : undefined,
              }}
            >
              <span className="block text-xs font-bold mb-1" style={{ color: msg.user?.themeColor || "#12f7ff" }}>
                {msg.user?.displayName || "User"}
              </span>
              <span className="block break-words">{msg.content}</span>
              <span className="block text-[10px] text-[#aaa] mt-1 text-right">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
      {/* Message input */}
      <form className="flex mt-2 gap-2" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          className="flex-1 rounded-lg px-4 py-2 bg-[#141622] border border-[#9500FF] text-white focus:outline-none focus:ring-2 focus:ring-[#12f7ff]"
          maxLength={500}
        />
        <button
          type="submit"
          className="bg-[#12f7ff] text-[#18191c] font-bold px-4 py-2 rounded-lg hover:bg-[#0fd0e0] transition shadow-md"
        >
          Send
        </button>
      </form>
      <style jsx>{`
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #9500ff77; border-radius: 5px; }
      `}</style>
    </div>
  );
}
