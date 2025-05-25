// pages/chat/[friendId].tsx
import { useEffect, useState, useRef, FormEvent, JSX } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import Image from 'next/image';

// Define interfaces for better type safety (UNCHANGED)
interface Profile {
  id: string;
  username: string;
  displayName: string;
  profileImage: string;
  themeColor?: string;
  online_status?: 'online' | 'away' | 'dnd' | 'offline';
  bio?: string;
  public_status?: string;
  chat_bubble_color?: string;
  default_chat_background?: string;
}

interface Message {
  id: string;
  chat_session_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  sender_profile?: Pick<Profile, 'id' | 'displayName' | 'profileImage' | 'chat_bubble_color'> | null;
  recipient_profile?: Pick<Profile, 'id' | 'displayName' | 'profileImage' | 'chat_bubble_color'> | null;
}

// --- StatusGlowStyles (copied from pulse.tsx for consistency if needed for ChatPage) ---
const statusGlowStyles = {
  online: '0 0 0 2px #22C55E, 0 0 10px 5px rgba(34,197,94,0.7)',
  away: '0 0 0 2px #F59E0B, 0 0 10px 5px rgba(245,158,11,0.7)',
  dnd: '0 0 0 2px #EF4444, 0 0 10px 5px rgba(239,68,68,0.7)',
  offline: '0 0 0 2px #6B7280, 0 0 8px 3px rgba(107,114,128,0.5)',
};


export default function ChatPage() {
  const router = useRouter();
  const { friendId } = router.query;

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageContent, setNewMessageContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentChatBackground = currentUser?.default_chat_background || 'linear-gradient(135deg, #2a003f 0%, #00102a 100%)';

  // --- START: Copied from pages/pulse.tsx for background and stars ---
  const [stars, setStars] = useState<JSX.Element[]>([]);

  useEffect(() => {
    const colors = ['#12f7ff', '#fe019a', '#9500FF'];
    const newStars = Array.from({ length: 70 }).map((_, i) => {
      const size = Math.random() * 3 + 1;
      const top = Math.random() * 100;
      const left = Math.random() * 100;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const duration = Math.random() * 4 + 2;

      return (
        <div
          key={i}
          className="twinkle"
          style={{
            position: 'absolute',
            top: `${top}%`,
            left: `${left}%`,
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: color,
            borderRadius: '50%',
            opacity: 0.8,
            animationDuration: `${duration}s`,
            animationDelay: `${Math.random() * 5}s`
          }}
        />
      );
    });
    setStars(newStars);
  }, []);
  // --- END: Copied from pages/pulse.tsx for background and stars ---


  const getDeterministicChatSessionId = (id1: string, id2: string): string => {
    return [id1, id2].sort().join('_');
  };

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
        router.push('/login');
        return;
      }

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

      const { data: friendProfileData, error: friendProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId)
        .single();

      if (!isMounted) return;
      if (friendProfileError || !friendProfileData) {
        console.error('❌ Error fetching friend profile:', friendProfileError?.message);
        setIsLoading(false);
        return;
      }
      setFriendProfile(friendProfileData as Profile);

      const currentChatId = getDeterministicChatSessionId(authUser.id, friendId);
      setChatSessionId(currentChatId);

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

            const { data: senderProfile, error: senderProfileError } = await supabase
              .from('profiles')
              .select('id, displayName, profileImage, chat_bubble_color')
              .eq('id', payload.new.sender_id)
              .single();

            if (senderProfileError) {
              console.error('Error fetching sender profile for realtime message:', senderProfileError.message);
            }

            const { data: recipientProfile, error: recipientProfileError } = await supabase
              .from('profiles')
              .select('id, displayName, profileImage, chat_bubble_color')
              .eq('id', payload.new.recipient_id)
              .single();

            if (recipientProfileError) {
              console.error('Error fetching recipient profile for realtime message:', recipientProfileError.message);
            }

            const newMessageWithProfiles: Message = {
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
  }, [router.isReady, friendId]);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageContent.trim() || !currentUser || !friendProfile || !chatSessionId) return;

    const messageToInsert = {
      chat_session_id: chatSessionId,
      sender_id: currentUser.id,
      recipient_id: friendProfile.id,
      content: newMessageContent.trim(),
    };

    const optimisticMessage: Message = {
      ...messageToInsert,
      id: `optimistic-${Date.now()}`,
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
    setNewMessageContent('');

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
      setMessages((prev) => prev.filter(msg => msg.id !== optimisticMessage.id));
      alert('Failed to send message. Please try again.');
    } else {
      console.log('✅ Message sent:', data);
    }
  };

  if (isLoading) {
    return (
      // Wrap loading state in the same layout div for consistency
      <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white">
        {/* Copied stars background */}
        <div className="absolute inset-0 z-0">{stars}</div>
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <p className="text-white text-lg">Loading chat...</p>
        </div>
        {/* Copied global CSS for twinkle animation */}
        <style jsx global>{`
          @keyframes twinkle {
            0% { opacity: 0.3; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1.2); }
          }
          .twinkle { animation: twinkle infinite alternate ease-in-out; }
        `}</style>
      </div>
    );
  }

  if (!currentUser || !friendProfile) {
    return (
      // Wrap error state in the same layout div for consistency
      <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white">
        {/* Copied stars background */}
        <div className="absolute inset-0 z-0">{stars}</div>
        <div className="relative z-10 flex-1 flex items-center justify-center min-h-[calc(100vh-80px)]">
          <p className="text-red-400 text-lg">Error: Could not load chat data.</p>
        </div>
        {/* Copied global CSS for twinkle animation */}
        <style jsx global>{`
          @keyframes twinkle {
            0% { opacity: 0.3; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1.2); }
          }
          .twinkle { animation: twinkle infinite alternate ease-in-out; }
        `}</style>
      </div>
    );
  }

  const myBubbleColor = currentUser.chat_bubble_color || '#12f7ff';
  const friendBubbleColor = friendProfile.chat_bubble_color || '#fe019a';

  return (
    // This is the main wrapper div, styled exactly like your PulsePage's outer div
    <div className="relative min-h-screen bg-black overflow-hidden font-sans text-white">
      {/* Background stars from PulsePage */}
      <div className="absolute inset-0 z-0">{stars}</div>

      {/* Global CSS for the star animation */}
      <style jsx global>{`
        @keyframes twinkle {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
        .twinkle { animation: twinkle infinite alternate ease-in-out; }
      `}</style>

      {/* The actual chat page content, wrapped to be on top of the stars */}
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
            </div>
            <p className="text-xs text-[#888] mt-2">Discover common interests</p>
          </div>
        </div>

        {/* Main Chat Area */}
        <div
          className="flex-1 flex flex-col p-6 rounded-l-2xl shadow-inner relative overflow-hidden"
          style={{ background: currentChatBackground }}
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
              const senderForBubble = message.sender_profile || (isMyMessage ? currentUser : friendProfile);
              const messageBubbleColor = senderForBubble?.chat_bubble_color || (isMyMessage ? myBubbleColor : friendBubbleColor);

              return (
                <div
                  key={message.id}
                  className={`flex mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMyMessage && (
                    <Image
                      src={senderForBubble?.profileImage || '/default-avatar.png'}
                      alt={senderForBubble?.displayName || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover mr-2 flex-shrink-0"
                    />
                  )}
                  <div
                    className={`max-w-[70%] p-3 rounded-xl shadow-md break-words ${
                      isMyMessage ? 'rounded-br-none text-white' : 'rounded-bl-none text-white'
                    }`}
                    style={{ backgroundColor: messageBubbleColor }}
                  >
                    <p>{message.content}</p>
                    <p className="text-[10px] text-opacity-70 mt-1 text-right">
                      {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {isMyMessage && (
                    <Image
                      src={senderForBubble?.profileImage || '/default-avatar.png'}
                      alt={senderForBubble?.displayName || 'User'}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover ml-2 flex-shrink-0"
                    />
                  )}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
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
    </div>
  );
}