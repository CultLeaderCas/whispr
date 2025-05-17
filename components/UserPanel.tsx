// components/UserPanel.tsx

'use client';
import React, { useState } from 'react';

export default function UserPanel() {
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '2px solid #12f7ff',
      borderRadius: '1.5rem',
      padding: '2rem',
      textAlign: 'center',
      maxWidth: '360px',
      margin: '2rem auto',
      boxShadow: '0 0 18px #12f7ff',
    }}>
      <h2 style={{
        color: '#12f7ff',
        marginBottom: '1rem',
        fontSize: '1.6rem',
        fontFamily: '"Orbitron", sans-serif'
      }}>
        Customize Your Presence
      </h2>

      {avatar && (
        <img
          src={avatar}
          alt="Avatar Preview"
          style={{ width: '90px', height: '90px', borderRadius: '50%', marginBottom: '1rem' }}
        />
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        style={{ marginBottom: '1rem', color: '#fff' }}
      />

      <input
        type="text"
        placeholder="Enter your name"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{
          width: '100%',
          padding: '0.6rem 1rem',
          borderRadius: '1rem',
          border: 'none',
          marginBottom: '1rem',
          fontSize: '1rem'
        }}
      />

      <p style={{ color: '#fff' }}>
        {username ? `Hey ${username}, you’re all set!` : 'Enter your name to begin'}
      </p>
    </div>
  );
}
