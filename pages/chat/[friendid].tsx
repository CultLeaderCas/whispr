import { useEffect, useState, useRef, FormEvent, JSX } from 'react';
import { supabase } from '@/lib/supabaseClient'; // Assuming this path is correct
import { useRouter } from 'next/router';
import Image from 'next/image';
import PulseLayout from '@/components/PulseLayout'; // Assuming PulseLayout is in a 'components' folder

// Define interfaces for better type safety
interface Profile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  themeColor?: string;
  online_status?: 'online' | 'away' | 'dnd' | 'offline';
  bio?: string;
  public_status?: string;
  chat_bubble_color?: string; // New: User's chosen chat bubble color
  default_chat_background?: string; // New: User's preferred chat background
}

interface Message {
  id: string;
  chat_session_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  // Join properties for sender/recipient profiles if needed (e.g., profileImage, displayName)
  sender_profile?: Pick<Profile, 'id' | 'displayName' | 'profileImage' | 'chat_bubble_color'>;
  recipient_profile?: Pick<Profile, 'id' | 'displayName' | 'profileImage' | 'chat_bubble_color'>;
}

// --- SQL Schema Updates (Reminder: Add these to your Supabase SQL Editor if you haven't already) ---
/*
-- Add chat_bubble_color to profiles table
ALTER TABLE profiles
ADD COLUMN chat_bubble_color TEXT DEFAULT '#12f7ff'; -- Default vibrant blue for sender messages

-- Add default_chat_background to profiles table (for user's own chat view background)
ALTER TABLE profiles
ADD COLUMN default_chat_background TEXT DEFAULT 'linear-gradient(135deg, #2a003f 0%, #00102a 100%)'; -- Default dark gradient

-- Create messages table (if it doesn't exist yet)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_session_id TEXT NOT NULL, -- Deterministic ID for the chat between two users
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  sender_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- Added this line for explicit sender profile
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL, -- Added this line for explicit recipient profile
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime for the 'messages' table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Optional: Add indexes for faster lookups
CREATE INDEX messages_chat_session_idx ON messages (chat_session_id);
CREATE INDEX messages_sender_idx ON messages (sender_id);
CREATE INDEX messages_recipient_idx ON messages (recipient_id);

-- RLS Policies for messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own messages" ON messages
FOR INSERT WITH CHECK (
  (auth.uid() = sender_id)
);

CREATE POLICY "Users can view messages they are part of" ON messages
FOR SELECT USING (
  (auth.uid() = sender_id) OR (auth.uid() = recipient_id)
);

-- RLS for profiles table (ensure users can read other profiles for chat details)
-- Example: Allow authenticated users to view all profiles (if not already set)
CREATE POLICY "Authenticated users can view all profiles" ON profiles
FOR SELECT USING (auth.role() = 'authenticated');
*/
// --- End SQL Schema Updates ---


export default function ChatPage() {
  const router = useRouter();
  const { friendId } = router.query;

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null); // For auto-scrolling
  const currentChatBackground = currentUser?.default_chat_background || 'linear-gradient(135deg, #2a003f 0%, #00102a 100%)';


  // Helper to generate a consistent chat session ID
  const getDeterministicChatSessionId = (id1: string, id2: string): string => {
    // Sort IDs to ensure consistency regardless of who is sender/recipient
    return [id1, id2].sort().join('_');
  };

  // 1. Fetch User Profiles and Messages
  useEffect(() => {
    let isMounted = true;
    let messageChannel: any = null;

    const fetchChatData = async () => {
      if (!router.isReady || !friendId || typeof friendId !== 'string') {
        setIsLoading(true);
        return;
      }

      setIsLoading(true);

      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (!isMounted) return;

      if (authError || !authUser) {
        console.error('🔒 Auth error or no user:', authError?.message);
        router.push('/login'); // Redirect to login if no authenticated user
        return;
      }

      // Fetch current user's full profile
      const { data: userProfileData, error: userProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!isMounted) return;
      if (userProfileError || !userProfileData) {
        console.error('❌ Error fetching current user profile:', userProfileError?.message);
        setIsLoading(false);
        return;
      }
      setCurrentUser(userProfileData as Profile);

      // Fetch friend's profile
      const { data: friendProfileData, error: friendProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId)
        .single();

      if (!isMounted) return;
      if (friendProfileError || !friendProfileData) {
        console.error('❌ Error fetching friend profile:', friendProfileError?.message);
        // Optionally redirect or show error if friend profile not found
        setIsLoading(false);
        return;
      }
      setFriendProfile(friendProfileData as Profile);

      const currentChatId = getDeterministicChatSessionId(authUser.id, friendId);
      setChatSessionId(currentChatId); // Store the generated chatSessionId

      // Fetch existing messages for this chat session
      const { data: fetchedMessages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:sender_id(id, displayName, profileImage, chat_bubble_color),
          recipient_profile:recipient_id(id, displayName, profileImage, chat_bubble_color)
        `)
        .eq('chat_session_id', currentChatId)
        .order('created_at', { ascending: true });

      if (!isMounted) return;
      if (messagesError) {
        console.error('❌ Error fetching messages:', messagesError.message);
      } else {
        setMessages(fetchedMessages as Message[] || []);
      }
      setIsLoading(false);

      // 2. Real-time Messages Subscription
      if (!messageChannel) {
        messageChannel = supabase
          .channel(`chat_messages:${currentChatId}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_session_id=eq.${currentChatId}`
          }, async (payload) => {
            if (!isMounted) return;
            console.log('Realtime message received:', payload.new);

            // Fetch sender/recipient profiles for the new message to get bubble color
            const { data: senderProfile, error: senderError } = await supabase
              .from('profiles')
              .select('id, displayName, profileImage, chat_bubble_color')
              .eq('id', payload.new.sender_id)
              .single();
            const { data: recipientProfile, error: recipientError } = await supabase
              .from('profiles')
              .select('id, displayName, profileImage, chat_bubble_color')
              .eq('id', payload.new.recipient_id)
              .single();

            if (senderError) console.error('Error fetching sender profile for realtime message:', senderError.message);
            if (recipientError) console.error('Error fetching recipient profile for realtime message:', recipientError.message);

            const newMessageWithProfiles = {
              ...payload.new as Message,
              sender_profile: senderProfile || null,
              recipient_profile: recipientProfile || null,
            };

            setMessages((prevMessages) => [...prevMessages, newMessageWithProfiles]);
          })
          .subscribe((status, err) => {
            if (status === 'SUBSCRIBED') console.log(`Subscribed to chat_messages:${currentChatId}`);
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`Subscription error for chat_messages:${currentChatId}:`, err);
          });
      }
    };

    fetchChatData();

    return () => {
      isMounted = false;
      if (messageChannel) {
        console.log(`Unsubscribing from chat_messages:${chatSessionId}`);
        supabase.removeChannel(messageChannel);
        messageChannel = null;
      }
    };
  }, [router.isReady, friendId]); // Re-run if friendId changes or router becomes ready


  // 3. Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]); // Scroll whenever messages update


  // 4. Send Message Function
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !currentUser || !friendProfile || !chatSessionId) return;

    const messageToInsert = {
      chat_session_id: chatSessionId,
      sender_id: currentUser.id,
      recipient_id: friendProfile.id,
      content: newMessageContent.trim(),
    };

    // Optimistically add message
    const optimisticMessage: Message = {
      ...messageToInsert,
      id: `optimistic-${Date.now()}`, // Temporary ID for optimistic update
      created_at: new Date().toISOString(),
      sender_profile: {
        id: currentUser.id,
        displayName: currentUser.displayName,
        profileImage: currentUser.profileImage,
        chat_bubble_color: currentUser.chat_bubble_color,
      },
      recipient_profile: {
        id: friendProfile.id,
        displayName: friendProfile.displayName,
        profileImage: friendProfile.profileImage,
        chat_bubble_color: friendProfile.chat_bubble_color,
      },
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessageContent(''); // Clear input immediately

    const { data, error } = await supabase
      .from('messages')
      .insert(messageToInsert)
      .select(`
          *,
          sender_profile:sender_id(id, displayName, profileImage, chat_bubble_color),
          recipient_profile:recipient_id(id, displayName, profileImage, chat_bubble_color)
      `)
      .single();

    if (error) {
      console.error('❌ Error sending message:', error.message);
      // Revert optimistic update if there's an error, or just rely on realtime
      setMessages((prev) => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send message. Please try again.'); // User feedback
    } else {
      console.log('✅ Message sent:', data);
      // Realtime listener will handle adding the *actual* message, so we don't double-add the final one.
      // If we remove the optimistic one immediately and rely solely on realtime, the UX might be slower.
      // So the optimistic update stays, and the realtime update will effectively replace the optimistic one if it has the same content/sender_id/created_at (or you can manage IDs).
    }
  };

  if (isLoading) {
    return (
      <PulseLayout>
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <p className="text-white text-lg">Loading chat...</p>
        </div>
      </PulseLayout>
    );
  }

  if (!currentUser || !friendProfile) {
    return (
      <PulseLayout>
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <p className="text-red-400 text-lg">Error: Could not load chat data.</p>
        </div>
      </PulseLayout>
    );
  }

  // Determine chat bubble colors
  const myBubbleColor = currentUser.chat_bubble_color || '#12f7ff'; // Default for current user
  const friendBubbleColor = friendProfile.chat_bubble_color || '#fe019a'; // Default for friend

  return (
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white">
      {/* PulseLayout provides the overall app structure and background stars. */}
      {/* If you want the chat page to have its own distinct background/stars separate from PulseLayout,
          you'd need to modify PulseLayout to allow a "chat-only" mode or move its background elements here. */}

      <div className="relative z-10 max-w-[1440px] mx-auto pt-4 flex min-h-screen">
        {/* Left Panel - Friend's Full Card */}
        <div className="w-[280px] bg-[#111] border-r border-[#333] p-4 flex flex-col items-center overflow-y-auto">
          <Image
            src={friendProfile.profileImage || '/default-avatar.png'}
            alt={friendProfile.displayName || 'Friend'}
            width={96}
            height={96}
            className="w-24 h-24 rounded-full object-cover border-2"
            style={{ borderColor: friendProfile.themeColor || '#12f7ff' }}
          />
          <p className="font-bold text-xl mt-2">{friendProfile.displayName || 'Friend'}</p>
          <p className="text-sm text-[#aaa]">@{friendProfile.username}</p>
          {friendProfile.public_status && (
            <p className="text-xs italic text-[#9500FF] mt-1 text-center">
              {friendProfile.public_status}
            </p>
          )}
          <a
            href={`/profile/${friendProfile.id}`}
            className="mt-4 px-4 py-2 bg-[#fe019a] text-white font-bold text-sm rounded-xl hover:bg-[#d0017e] transition shadow-md"
          >
            View Full Profile
          </a>

          <div className="mt-6 pt-6 border-t border-[#333] w-full text-center">
            <h4 className="text-sm font-bold mb-3">Shared Nodes</h4>
            <div className="flex justify-center space-x-3">
              <Image src="/default-node.png" className="w-10 h-10 rounded-full border border-[#9500FF]" alt="Node Icon" width={40} height={40} />
              <Image src="/default-node.png" className="w-10 h-10 rounded-full border border-[#fe019a]" alt="Node Icon" width={40} height={40} />
              <Image src="/default-node.png" className="w-10 h-10 rounded-full border border-[#12f7ff]" alt="Node Icon" width={40} height={40} />
              {/* More shared node placeholders if needed */}
            </div>
            <p className="text-xs text-[#888] mt-2">Discover common interests</p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div
          className="flex-1 flex flex-col p-6 rounded-l-2xl shadow-inner relative overflow-hidden"
          style={{ background: currentChatBackground }} // Dynamic chat background from currentUser's profile
        >
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#333] mb-4">
            <div className="flex items-center space-x-3">
              <Image
                src={friendProfile.profileImage || '/default-avatar.png'}
                alt={friendProfile.displayName || 'Friend'}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover border-2"
                style={{ borderColor: friendProfile.themeColor || '#12f7ff' }}
              />
              <div>
                <h3 className="text-lg font-bold">{friendProfile.displayName || 'Friend'}</h3>
                <p className="text-sm text-[#ccc]">
                  @{friendProfile.username} -{' '}
                  <span className={`capitalize ${friendProfile.online_status === 'online' ? 'text-green-400' : friendProfile.online_status === 'dnd' ? 'text-red-400' : friendProfile.online_status === 'away' ? 'text-yellow-400' : 'text-gray-400'}`}>
                    {friendProfile.online_status || 'offline'}
                  </span>
                </p>
              </div>
            </div>
            {/* Chat action buttons (e.g., call, video, info) */}
            <div className="flex space-x-3 text-2xl text-[#bbb]">
              <button className="hover:text-white transition">📞</button>
              <button className="hover:text-white transition">📹</button>
              <button className="hover:text-white transition">ℹ️</button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
            {messages.map((message) => {
              const isMyMessage = message.sender_id === currentUser.id;
              // Use the profile from the message's sender_profile object if available,
              // otherwise fallback to currentUser/friendProfile for immediate optimistic display
              const senderForBubble = message.sender_profile || (isMyMessage ? currentUser : friendProfile);

              // Use the chat_bubble_color from the sender's profile
              const messageBubbleColor = senderForBubble.chat_bubble_color || (isMyMessage ? myBubbleColor : friendBubbleColor);

              return (
                <div
                  key={message.id}
                  className={`flex mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`} // SENDER ON RIGHT, RECIPIENT ON LEFT
                >
                  {/* Friend's message (left aligned) includes their avatar */}
                  {!isMyMessage && (
                    <Image
                      src={senderForBubble.profileImage || '/default-avatar.png'}
                      alt={senderForBubble.displayName || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover mr-2 flex-shrink-0"
                    />
                  )}
                  {/* Message Bubble */}
                  <div
                    className={`max-w-[70%] p-3 rounded-xl shadow-md break-words ${
                      isMyMessage ? 'rounded-br-none text-white' : 'rounded-bl-none text-white'
                    }`} // Rounded corners adjust based on sender
                    style={{ backgroundColor: messageBubbleColor }} // Dynamic bubble color
                  >
                    <p>{message.content}</p>
                    <p className="text-[10px] text-opacity-70 mt-1 text-right">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {/* My message (right aligned) includes my avatar */}
                  {isMyMessage && (
                    <Image
                      src={senderForBubble.profileImage || '/default-avatar.png'}
                      alt={senderForBubble.displayName || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover ml-2 flex-shrink-0"
                    />
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} /> {/* Scroll target */}
          </div>

          {/* Message Input Area */}
          <form onSubmit={handleSendMessage} className="mt-4 flex items-center space-x-3 bg-[#1e1e1e] border border-[#333] rounded-2xl p-2 shadow-lg">
            <button type="button" className="text-xl text-[#9500FF] p-2 hover:text-[#7a00d0] transition" title="Add Attachment">
              +
            </button>
            <input
              type="text"
              placeholder="Start Typing ..."
              value={newMessageContent}
              onChange={(e) => setNewMessageContent(e.target.value)}
              className="flex-1 p-2 bg-transparent text-white placeholder-[#888] focus:outline-none text-sm"
            />
            <button type="button" className="text-xl text-[#9500FF] p-2 hover:text-[#7a00d0] transition" title="Add Emoji">
              😊
            </button>
            <button
              type="submit"
              className="bg-[#12f7ff] text-black font-bold px-5 py-2 rounded-xl text-sm hover:bg-[#0fd0e0] transition shadow-md"
              title="Send Message"
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
      `}</style>
    </div>
  );
}