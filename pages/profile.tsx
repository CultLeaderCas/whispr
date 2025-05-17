import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>({
    displayName: '',
    username: '',
    bio: '',
    tagLabel: '',
    badge: '',
    themeColor: '#12f7ff',
    innerColor: '#111111',
    profileImage: '',
  });

  useEffect(() => {
    const saved = localStorage.getItem('echno-profile');
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const themePickerRef = useRef<HTMLInputElement>(null);
  const innerPickerRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setProfile((prev: any) => ({ ...prev, profileImage: result }));
    };
    reader.readAsDataURL(file);
  };

  const openColorPicker = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) ref.current.click();
  };

  const handleChange = (field: keyof typeof profile, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (profile.tagLabel.length < 2 || profile.tagLabel.length > 12) {
      alert('Tag must be 2–12 characters.');
      return;
    }

    const { error } = await supabase.from('profiles').insert([
      {
        id: uuidv4(),
        displayName: profile.displayName,
        username: profile.username,
        bio: profile.bio,
        tagLabel: profile.tagLabel,
        badge: profile.badge,
        themeColor: profile.themeColor,
        innerColor: profile.innerColor,
        profileImage: profile.profileImage
      }
    ]);

    if (error) {
      console.error("Supabase insert error:", error.message);
      alert("Something went wrong saving your profile.");
    } else {
      alert("Profile saved successfully!");
      router.push('/pulse');
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Orbitron, sans-serif'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        padding: '3rem 2rem',
        borderRadius: '2rem',
        backgroundColor: profile.innerColor || '#222',
        boxShadow: `0 0 80px ${profile.themeColor || '#12f7ff'}`,
        color: 'white',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Profile Picture Upload */}
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          overflow: 'hidden',
          margin: '0 auto',
          border: `4px solid ${profile.themeColor}`,
          boxShadow: `0 0 20px ${profile.themeColor}`,
          position: 'relative'
        }}>
          {profile.profileImage ? (
            <img src={profile.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#111' }} />
          )}
          <button onClick={() => fileInputRef.current?.click()} style={{
            position: 'absolute',
            bottom: '4px',
            right: '4px',
            backgroundColor: '#000',
            color: '#fff',
            fontSize: '0.6rem',
            padding: '0.2rem 0.4rem',
            borderRadius: '0.4rem',
            border: 'none',
            cursor: 'pointer'
          }}>
            Upload
          </button>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
        </div>

        {/* Input Fields */}
        {['displayName', 'username', 'bio', 'tagLabel', 'badge'].map((field, index) => (
          <input
            key={index}
            type="text"
            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
            value={profile[field]}
            onChange={e => handleChange(field as keyof typeof profile, e.target.value)}
            style={{
              margin: '0.6rem 0',
              padding: '0.6rem',
              width: '100%',
              borderRadius: '0.8rem',
              border: 'none',
              fontSize: '1rem',
              outline: 'none',
              background: '#111',
              color: '#fff',
              boxShadow: `0 0 6px ${profile.themeColor}`
            }}
          />
        ))}

        {/* Color Pickers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '1rem 0' }}>
          <div onClick={() => openColorPicker(themePickerRef)} style={{
            backgroundColor: profile.themeColor,
            width: '100%',
            height: '2.5rem',
            borderRadius: '0.6rem',
            cursor: 'pointer',
            boxShadow: `0 0 8px ${profile.themeColor}`
          }} />
          <div onClick={() => openColorPicker(innerPickerRef)} style={{
            backgroundColor: profile.innerColor,
            width: '100%',
            height: '2.5rem',
            borderRadius: '0.6rem',
            cursor: 'pointer',
            boxShadow: `0 0 8px ${profile.innerColor}`
          }} />
        </div>

        <input type="color" ref={themePickerRef} onChange={e => handleChange('themeColor', e.target.value)} style={{ display: 'none' }} />
        <input type="color" ref={innerPickerRef} onChange={e => handleChange('innerColor', e.target.value)} style={{ display: 'none' }} />

        {/* Save Button */}
        <button onClick={handleSave} style={{
          backgroundColor: profile.themeColor,
          color: '#111',
          padding: '0.8rem 2rem',
          borderRadius: '1.2rem',
          fontWeight: 'bold',
          border: 'none',
          fontSize: '1.2rem',
          cursor: 'pointer',
          marginTop: '1.2rem',
          boxShadow: `0 0 15px ${profile.themeColor}`
        }}>
          Save Profile
        </button>
      </div>
    </main>
  );
}
