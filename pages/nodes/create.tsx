// pages/nodes/create.tsx

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';

export default function CreateNodePage() {
  const [nodeName, setNodeName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIconFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  };

  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!iconFile) return null;

    const fileExt = iconFile.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('node-icons')
      .upload(fileName, iconFile);

    if (error) {
      console.error('Image upload failed:', error.message);
      return null;
    }

    const { data: publicUrl } = supabase
      .storage
      .from('node-icons')
      .getPublicUrl(fileName);

    return publicUrl.publicUrl;
  };

const handleCreateNode = async () => {
  if (!nodeName.trim()) {
    alert('Node name is required.');
    return;
  }

  const file = fileInputRef.current?.files?.[0];
  let publicUrl = null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (file && user) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('node-icons')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError.message);
      alert('Failed to upload image.');
      return;
    }

    const { data } = supabase.storage
      .from('node-icons')
      .getPublicUrl(filePath);

    publicUrl = data?.publicUrl;
  }

  const { error } = await supabase.from('nodes').insert([
    {
      name: nodeName.trim(),
      icon: publicUrl,
    },
  ]);

  if (error) {
    alert('Failed to create node: ' + error.message);
  } else {
    router.push('/pulse');
  }
};

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f001f] text-white font-sans">
      <div className="bg-[#111] p-8 rounded-2xl shadow-lg w-full max-w-md border border-[#333]">
        <h1 className="text-2xl font-bold text-center mb-6">
          🌐 Create a New Node
        </h1>

        {/* Image Preview and Upload */}
        <div className="flex flex-col items-center mb-6">
          {imagePreview ? (
            <img
              src={imagePreview}
              alt="Node Icon Preview"
              className="w-24 h-24 rounded-full border-2 border-[#9500FF] mb-2 object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#222] border-2 border-[#555] mb-2" />
          )}
          <button
            className="text-xs px-3 py-1 bg-[#333] text-white border border-[#9500FF] rounded hover:bg-[#444] transition"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Node Icon
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>

        <label className="block text-sm font-bold mb-1">Node Name</label>
        <input
          type="text"
          value={nodeName}
          onChange={(e) => setNodeName(e.target.value)}
          placeholder="e.g. Starbase Alpha"
          className="w-full mb-4 px-4 py-2 rounded bg-[#222] border border-[#444] focus:outline-none"
        />

        <button
          onClick={handleCreateNode}
          className="w-full bg-[#12f7ff] hover:bg-[#0fd0e0] text-black font-bold py-2 rounded-xl shadow-lg transition flex items-center justify-center gap-2"
        >
          Create Node <span className="text-lg">➕</span>
        </button>

        <p className="text-center mt-4 text-sm text-[#aaa]">
          Need to go back?{' '}
          <a href="/pulse" className="text-[#f0f] underline">
            Return to Pulse
          </a>
        </p>
      </div>
    </main>
  );
}
