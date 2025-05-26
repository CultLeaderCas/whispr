// pages/nodes/create.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function CreateNodePage() {
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleCreateNode = async () => {
    if (!name.trim()) {
      alert("Node name is required!");
      return;
    }

    setIsSubmitting(true);

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      alert("You must be logged in to create a node.");
      return;
    }

    const { error } = await supabase.from('nodes').insert({
      name,
      icon: iconUrl || null,
      creator_id: user.id
    });

    if (error) {
      console.error('Error creating node:', error.message);
      alert("Failed to create node.");
      setIsSubmitting(false);
      return;
    }

    router.push('/pulse'); // Redirect to pulse after creation
  };

  return (
    <main className="min-h-screen bg-[#0a001f] text-white font-sans flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#111] rounded-3xl p-8 shadow-2xl border border-[#333]">
        <h1 className="text-2xl font-bold mb-4 text-center">🌐 Create a New Node</h1>

        <label className="block mb-2 text-sm font-semibold">Node Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Starbase Alpha"
          className="w-full p-3 rounded-lg bg-[#1e1e1e] text-white border border-[#444] mb-4 focus:outline-none focus:ring-2 focus:ring-[#9500FF]"
        />

        <label className="block mb-2 text-sm font-semibold">Node Icon URL (Optional)</label>
        <input
          type="text"
          value={iconUrl}
          onChange={(e) => setIconUrl(e.target.value)}
          placeholder="https://example.com/icon.png"
          className="w-full p-3 rounded-lg bg-[#1e1e1e] text-white border border-[#444] mb-6 focus:outline-none focus:ring-2 focus:ring-[#12f7ff]"
        />

        <button
          onClick={handleCreateNode}
          disabled={isSubmitting}
          className="w-full bg-[#12f7ff] hover:bg-[#0fd0e0] text-black font-bold py-3 px-6 rounded-xl shadow-md transition"
        >
          {isSubmitting ? 'Creating...' : 'Create Node ➕'}
        </button>

        <p className="text-center mt-4 text-sm text-[#aaa]">
          Need to go back?{' '}
          <a href="/pulse" className="underline text-[#fe019a] hover:text-pink-300">
            Return to Pulse
          </a>
        </p>
      </div>
    </main>
  );
}
