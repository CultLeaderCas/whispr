import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>(null);
  const [availabilityMsg, setAvailabilityMsg] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) setProfile(data);
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile || !profile.username) return;

    const check = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', profile.username.trim());

      if (error) {
        setAvailabilityMsg('Error checking availability');
      } else if (data.length > 0) {
        setAvailabilityMsg('That username is taken 😞');
      } else {
        setAvailabilityMsg('✅ Available!');
      }
    };

    const debounce = setTimeout(check, 500);
    return () => clearTimeout(debounce);
  }, [profile?.username]);

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

  const openColorPicker = (ref: React.RefObject<HTMLInputElement | null>) => {
    if (ref.current) ref.current.click();
  };

  const handleChange = (field: string, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };

const handleSave = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    alert("Not logged in.");
    return;
  }

  const payload = {
    id: user.id,
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    emoji: profile.emoji,
    themeColor: profile.themeColor,
    innerColor: profile.innerColor,
    profileImage: profile.profileImage,
    email: user.email, // 💙 This line adds the email to the database
  };

  const { error } = await supabase
    .from('profiles')
    .upsert([payload], { onConflict: 'id' });

  if (error) {
    console.error("❌ Supabase upsert error:", error);
    alert("Something went wrong saving your profile.");
  } else {
    localStorage.setItem('justSignedUp', '1');
    router.push('/pulse');
  }
};

  if (!profile) return <main style={{ background: '#000', color: '#fff', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</main>;

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
        backgroundColor: profile.innerColor,
        boxShadow: `0 0 80px ${profile.themeColor}`,
        color: 'white',
        textAlign: 'center'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          overflow: 'hidden',
          margin: '0 auto',
          border: `4px solid ${profile.themeColor}`,
          boxShadow: `0 0 20px ${profile.themeColor}`
        }}>
          {profile.profileImage ? (
            <img src={profile.profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: '#111' }} />
          )}
        </div>

        <button onClick={() => fileInputRef.current?.click()} style={{
          marginTop: '0.6rem',
          backgroundColor: '#111',
          color: profile.themeColor,
          fontSize: '0.8rem',
          padding: '0.4rem 1rem',
          borderRadius: '0.6rem',
          border: `1px solid ${profile.themeColor}`,
          cursor: 'pointer',
          boxShadow: `0 0 6px ${profile.themeColor}`
        }}>
          Upload Photo
        </button>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />

        {/* Display Name */}
        <input
          type="text"
          placeholder="Display Name"
          value={profile.displayName}
          onChange={e => handleChange('displayName', e.target.value)}
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

        {/* Username (locked after set) */}
        <input
          type="text"
          placeholder="Username"
          value={profile.username}
          onChange={e => handleChange('username', e.target.value)}
          disabled={!!profile.username}
          style={{
            margin: '0.6rem 0',
            padding: '0.6rem',
            width: '100%',
            borderRadius: '0.8rem',
            border: 'none',
            fontSize: '1rem',
            outline: 'none',
            background: profile.username ? '#222' : '#111',
            color: profile.username ? '#666' : '#fff',
            boxShadow: `0 0 6px ${profile.themeColor}`,
            cursor: profile.username ? 'not-allowed' : 'text'
          }}
        />
        {profile.username && (
          <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '-0.4rem', marginBottom: '0.6rem' }}>
            Usernames cannot be changed after creation.
          </p>
        )}

        {/* Bio */}
        <input
          type="text"
          placeholder="Bio"
          value={profile.bio}
          onChange={e => handleChange('bio', e.target.value)}
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

        {/* Color Pickers */}
        <div style={{ marginTop: '1rem', marginBottom: '1rem' }}>
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
            border: '2px solid #333',
            cursor: 'pointer',
            marginTop: '0.6rem',
            boxShadow: `0 0 8px ${profile.innerColor}`
          }} />
        </div>

        <input type="color" ref={themePickerRef} onChange={e => handleChange('themeColor', e.target.value)} style={{ display: 'none' }} />
        <input type="color" ref={innerPickerRef} onChange={e => handleChange('innerColor', e.target.value)} style={{ display: 'none' }} />

        {/* Emoji */}
        <input
          type="text"
          value={profile.emoji}
          onChange={e => handleChange('emoji', e.target.value)}
          maxLength={2}
          style={{
            width: '4rem',
            textAlign: 'center',
            fontSize: '1.5rem',
            background: '#111',
            border: 'none',
            color: '#fff',
            borderRadius: '0.6rem',
            boxShadow: `0 0 6px ${profile.themeColor}`,
            marginBottom: '1rem'
          }}
        />

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
          boxShadow: `0 0 15px ${profile.themeColor}`
        }}>
          Save Profile
        </button>

        <div style={{ marginTop: '2rem' }}>
          <a
            href="/pulse"
            style={{
              color: '#12f7ff',
              fontSize: '0.9rem',
              textDecoration: 'underline',
              display: 'inline-block',
              marginTop: '1rem'
            }}
          >
            ⬅ Back to Pulse
          </a>
        </div>
      </div>
    </main>
  );
}
