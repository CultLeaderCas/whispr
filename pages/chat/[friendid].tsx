// pages/chat/[friendId].tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import Image from 'next/image'; // Assuming Next.js Image component for optimization

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    id: string;
    displayName: string;
    profileImage: string;
  };
  receiver?: {
    id: string;
    displayName: string;
    profileImage: string;
  };
}

interface Profile {
  id: string;
  displayName: string;
  username: string;
  profileImage: string;
  themeColor?: string; // Assuming you have this in your profile table
}

export default function ChatScreen() {
  const router = useRouter();
  const { friendId } = router.query; // Get friendId from URL
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref for auto-scrolling

  // --- Fetch Current User Profile ---
  useEffect(() => {
    const fetchCurrentUser = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error("Auth error or no user:", authError?.message);
        router.push('/login'); // Redirect to login if not authenticated
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError || !profile) {
        console.error("Error fetching current user profile:", profileError?.message);
        router.push('/onboarding'); // Redirect to onboarding if no profile
        return;
      }
      setCurrentUser(profile);
    };
    fetchCurrentUser();
  }, [router]);

  // --- Fetch Friend Profile ---
  useEffect(() => {
    const fetchFriendProfile = async () => {
      if (!friendId) return; // Wait for friendId to be available

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId as string)
        .single();

      if (error || !data) {
        console.error("Error fetching friend profile:", error?.message);
        setFriendProfile(null);
        // Optionally redirect to a 404 page or friends list if friend not found
        return;
      }
      setFriendProfile(data);
    };
    fetchFriendProfile();
  }, [friendId]);


  // --- Fetch Messages & Realtime Subscription ---
  const fetchMessages = useCallback(async () => {
    if (!currentUser?.id || !friendProfile?.id) {
      setMessages([]);
      return;
    }

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id (id, displayName, profileImage),
        receiver:receiver_id (id, displayName, profileImage)
      `)
      .or(`(sender_id.eq.${currentUser.id},receiver_id.eq.${friendProfile.id}),(sender_id.eq.${friendProfile.id},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error.message);
      return;
    }
    setMessages(data || []);
    // Scroll to bottom after messages load
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentUser?.id, friendProfile?.id]);

  useEffect(() => {
    if (!currentUser?.id || !friendProfile?.id) return;

    fetchMessages(); // Initial fetch

    const channel = supabase
      .channel(`chat_room:${currentUser.id}-${friendProfile.id}`) // Unique channel for this chat
      .on(
        'postgres_changes',
        {
          event: 'INSERT', // Only listen for new messages
          schema: 'public',
          table: 'messages',
          // Filter to messages either sent by current user to friend, or by friend to current user
          filter: `(sender_id.eq.${currentUser.id}.and.receiver_id.eq.${friendProfile.id}).or(sender_id.eq.${friendProfile.id}.and.receiver_id.eq.${currentUser.id})`
        },
        (payload) => {
          console.log('New message received:', payload);
          // Add the new message to state. Ensure it's correctly typed.
          setMessages((prevMessages) => [...prevMessages, payload.new as Message]);
          // Scroll to bottom when new message arrives
          if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
          }
        }
      )
      .subscribe();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id, friendProfile?.id, fetchMessages]);

  // --- Send Message Handler ---
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !currentUser?.id || !friendProfile?.id) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: currentUser.id,
        receiver_id: friendProfile.id,
        content: newMessageContent.trim(),
        is_read: false, // Messages are unread by default when sent
      });

    if (error) {
      console.error("Error sending message:", error.message);
      alert('Failed to send message.');
    } else {
      setNewMessageContent(''); // Clear input
    }
  };

  if (!currentUser || !friendProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        Loading chat...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">
      {/* Left Panel: Friend's Profile & Shared Nodes */}
      <div className="w-80 bg-[#111] border-r border-[#333] p-6 flex flex-col">
        <div className="text-center">
          <Image
            src={friendProfile.profileImage || '/default-avatar.png'}
            alt={friendProfile.displayName || 'Friend Profile'}
            width={120}
            height={120}
            className="rounded-full object-cover mx-auto mb-4 border-4"
            style={{ borderColor: friendProfile.themeColor || '#12f7ff' }}
          />
          <h2 className="text-2xl font-bold">{friendProfile.displayName}</h2>
          <p className="text-sm text-[#aaa]">@{friendProfile.username}</p>
        </div>

        <div className="mt-8 pt-6 border-t border-[#333]">
          <h3 className="text-lg font-semibold mb-4">Shared Nodes</h3>
          {/* Example Shared Nodes - you'd fetch these from your database */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-xl transition cursor-pointer">
              <Image src="/default-node.png" alt="Node" width={40} height={40} className="rounded-full border border-[#9500FF]" />
              <span className="text-sm">CultOfCas</span>
            </div>
            <div className="flex items-center gap-3 p-2 hover:bg-[#222] rounded-xl transition cursor-pointer">
              <Image src="/default-node.png" alt="Node" width={40} height={40} className="rounded-full border border-[#9500FF]" />
              <span className="text-sm">Fortnite Community</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gradient-to-br from-[#4d00a0] to-[#6a00c7]"> {/* Gradient background */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scroll">
          {messages.length === 0 && (
            <div className="text-center text-[#ddd] text-lg mt-10">
              Start a conversation with {friendProfile.displayName}!
            </div>
          )}
          {messages.map((message) => {
            const isSender = message.sender_id === currentUser.id;
            const messageProfile = isSender ? currentUser : friendProfile;

            return (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${isSender ? 'justify-end' : ''}`}
              >
                {!isSender && (
                  <Image
                    src={messageProfile?.profileImage || '/default-avatar.png'}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full object-cover border-2 border-[#12f7ff] flex-shrink-0"
                  />
                )}
                <div
                  className={`max-w-[70%] p-3 rounded-2xl ${
                    isSender
                      ? 'bg-[#12f7ff] text-[#111] rounded-br-none'
                      : 'bg-[#1e1e1e] text-white rounded-bl-none'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs text-right mt-1 opacity-70">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {isSender && (
                  <Image
                    src={messageProfile?.profileImage || '/default-avatar.png'}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="rounded-full object-cover border-2 border-[#fe019a] flex-shrink-0"
                  />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} /> {/* Element to scroll into view */}
        </div>

        {/* Message Input Area */}
        <form onSubmit={handleSendMessage} className="p-4 bg-[#111] border-t border-[#333] flex items-center gap-3">
          <input
            type="text"
            value={newMessageContent}
            onChange={(e) => setNewMessageContent(e.target.value)}
            placeholder="Start Typing ..."
            className="flex-1 px-5 py-3 bg-[#1e1e1e] text-white rounded-full focus:outline-none focus:ring-2 focus:ring-[#9500FF] placeholder:text-[#888]"
          />
          <button
            type="submit"
            className="p-3 bg-[#12f7ff] text-[#111] rounded-full hover:bg-[#0fd0d0] transition focus:outline-none focus:ring-2 focus:ring-[#9500FF]"
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
          {/* Optional: Add more buttons like image/attachment here */}
          <button
            type="button"
            className="p-3 bg-[#9500FF] text-white rounded-full hover:bg-[#7a00cc] transition focus:outline-none focus:ring-2 focus:ring-[#fe019a]"
            aria-label="Add attachment"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </form>
      </div>

      {/* Custom Scrollbar Styles for the chat area */}
      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar {
          width: 8px; /* width of the scrollbar */
        }
        .custom-scroll::-webkit-scrollbar-track {
          background: #272727; /* color of the tracking area */
          border-radius: 4px;
        }
        .custom-scroll::-webkit-scrollbar-thumb {
          background-color: #555; /* color of the scroll thumb */
          border-radius: 4px; /* roundness of the scroll thumb */
          border: 2px solid #272727; /* creates padding around scroll thumb */
        }
        .custom-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #777; /* color of the scroll thumb on hover */
        }
      `}</style>
    </div>
  );
}