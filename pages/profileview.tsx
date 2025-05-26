import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ProfileView() {
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState<string>('online');

  useEffect(() => {
    const saved = localStorage.getItem('echno-profile');
    if (saved) {
      setProfile(JSON.parse(saved));
    }

    const savedStatus = localStorage.getItem('echno-status');
    if (savedStatus) {
      setStatus(savedStatus);
    }
  }, []);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value;
    setStatus(newStatus);
    localStorage.setItem('echno-status', newStatus);
  };

  if (!profile) return <p>Loading...</p>;

  const statusStyles: Record<string, any> = {
    online: {
      backgroundColor: '#00ff7f',
      boxShadow: '0 0 8px #00ff7f, 0 0 16px #00ff7f',
    },
    away: {
      backgroundColor: '#ffcc00',
      boxShadow: '0 0 8px #ffcc00, 0 0 16px #ffcc00',
      animation: 'pulseAway 2s infinite',
    },
    dnd: {
      backgroundColor: '#ff0033',
      boxShadow: '0 0 8px #ff0033, 0 0 18px #ff0033',
      animation: 'pulseDND 1.5s infinite',
    },
    offline: {
      backgroundColor: '#555a',
      boxShadow: 'none',
    }
  };

  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a001f',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: 'Orbitron, sans-serif',
    }}>
      <style>{`
        @keyframes pulseAway {
          0%, 100% { box-shadow: 0 0 8px #ffcc00, 0 0 16px #ffcc00; }
          50% { box-shadow: 0 0 14px #ffcc00, 0 0 28px #ffcc00; }
        }
        @keyframes pulseDND {
          0%, 100% { box-shadow: 0 0 8px #ff0033, 0 0 18px #ff0033; }
          50% { box-shadow: 0 0 14px #ff0033, 0 0 30px #ff0033; }
        }
      `}</style>
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
        {/* Profile Picture */}
<div style={{
  width: '120px',
  height: '120px',
  borderRadius: '50%',
  overflow: 'visible', // important
  margin: '0 auto',
  border: `4px solid ${profile.themeColor}`,
  boxShadow: `0 0 20px ${profile.themeColor}`,
  position: 'relative'
}}>
  {profile.profileImage ? (
    <img src={profile.profileImage} alt="Profile" style={{
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: '50%'
    }} />
  ) : (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#111' }}>Profile</div>
  )}
  
  {/* 💡 Glowing Status Indicator */}
  <div style={{
    position: 'absolute',
    top: '-8px',
    right: '-8px',
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '2px solid #111',
    backgroundColor: statusStyles[status].backgroundColor,
    boxShadow: statusStyles[status].boxShadow,
    animation: statusStyles[status].animation || 'none',
    zIndex: 10
  }} />
</div>


        {/* Display Name */}
        <h1 style={{
          fontSize: '2rem',
          margin: '1rem 0 0.3rem',
          fontWeight: '700',
        }}>
          {profile.displayName} <span style={{ fontSize: '1.6rem' }}>{profile.badge}</span>
        </h1>

        {/* Username + Tag */}
        <p style={{
          color: '#ccc',
          fontStyle: 'italic',
          fontSize: '1rem',
          marginBottom: '0.3rem'
        }}>
          @{profile.username}
          {profile.tag && (
            <span style={{
              marginLeft: '0.5rem',
              background: '#0d0d0d',
              padding: '0.2rem 0.6rem',
              borderRadius: '0.6rem',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              color: profile.themeColor,
              boxShadow: `0 0 8px ${profile.themeColor}`,
              display: 'inline-flex',
              alignItems: 'center'
            }}>
              {profile.badge}{profile.tag}
            </span>
          )}
        </p>

        {/* Bio */}
        <p style={{
          fontSize: '1rem',
          fontStyle: 'italic',
          marginBottom: '0.5rem',
          color: '#ccc'
        }}>
          {profile.bio || 'No status set.'}
        </p>

        {/* View Bio Link */}
        <p style={{
          fontSize: '0.9rem',
          color: profile.themeColor,
          textDecoration: 'underline',
          cursor: 'pointer',
          marginBottom: '1rem'
        }}>
          View Full Bio
        </p>

        {/* 🌐 Status Selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '0.5rem' }}>Status:</label>
          <select value={status} onChange={handleStatusChange} style={{
            backgroundColor: '#0d0d0d',
            color: profile.themeColor,
            border: `2px solid ${profile.themeColor}`,
            borderRadius: '0.5rem',
            padding: '0.3rem 0.7rem',
            fontFamily: 'Orbitron, sans-serif',
            fontWeight: 'bold',
            boxShadow: `0 0 10px ${profile.themeColor}`
          }}>
            <option value="online">🟢 Online</option>
            <option value="away">🟡 Away</option>
            <option value="dnd">🔴 Do Not Disturb</option>
            <option value="offline">⚫ Offline</option>
          </select>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/profile">
            <button style={{
              backgroundColor: profile.themeColor,
              color: '#111',
              padding: '0.7rem 1.6rem',
              borderRadius: '1rem',
              fontWeight: 'bold',
              border: 'none',
              fontSize: '1rem',
              cursor: 'pointer',
              boxShadow: `0 0 15px ${profile.themeColor}`
            }}>
              Edit Profile
            </button>
          </Link>
          <Link href="/">
            <button style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '0.7rem 1.6rem',
              borderRadius: '1rem',
              fontWeight: 'bold',
              fontSize: '1rem',
              border: `2px solid ${profile.themeColor}`,
              boxShadow: `0 0 12px ${profile.themeColor}`
            }}>
              Home
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
