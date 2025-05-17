import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const badgeOptions = ['💙', '💖', '🌙', '⭐', '🎮', '👑', '🔥', '🎧', '⚡', '🧩'];

export default function Profile() {
  const router = useRouter();
  const outerColorRef = useRef(null);
  const innerColorRef = useRef(null);
  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState({
    displayName: '',
    username: '',
    bio: '',
    badge: '🎮',
    tagLabel: '',
    themeColor: '#ff007f',
    innerColor: '#222',
    profileImage: '',
  });

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (profile.tagLabel.length < 2 || profile.tagLabel.length > 12) {
      alert('Tag must be 2–12 characters.');
      return;
    }
    localStorage.setItem('echno-profile', JSON.stringify(profile));
    router.push('/pulse');
  };

  const openColorPicker = (ref) => {
    if (ref.current) ref.current.click();
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleChange('profileImage', imageUrl);
    }
  };

  return (
    <>
      <Head>
        <title>Create Profile – Whispr</title>
      </Head>

      <style jsx>{`
        .container {
          min-height: 100vh;
          background: linear-gradient(145deg, #0a001f, #1a003f);
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 2rem;
          font-family: Orbitron, sans-serif;
          color: white;
        }

        .form {
          width: 100%;
          max-width: 500px;
          background: ${profile.innerColor};
          border-radius: 2rem;
          padding: 2rem;
          box-shadow: 0 0 40px ${profile.themeColor};
          text-align: center;
        }

        .avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          margin: 0 auto 1rem;
          border: 4px solid ${profile.themeColor};
          background: url(${profile.profileImage || '/images/default-pfp.png'}) center/cover no-repeat;
        }

        .upload-button {
          margin-bottom: 1.5rem;
          padding: 0.5rem 1rem;
          background-color: ${profile.themeColor};
          color: #111;
          font-weight: bold;
          border-radius: 1rem;
          cursor: pointer;
          font-size: 0.95rem;
          box-shadow: 0 0 10px ${profile.themeColor};
          transition: 0.3s;
        }

        .upload-button:hover {
          transform: scale(1.05);
        }

        input, textarea {
          width: 100%;
          padding: 0.75rem;
          margin-bottom: 1rem;
          border-radius: 1rem;
          border: none;
          font-size: 1rem;
          background: #111;
          color: white;
        }

        .badges {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .badge {
          font-size: 1.5rem;
          padding: 0.4rem;
          border-radius: 0.5rem;
          cursor: pointer;
          border: 2px solid transparent;
          transition: all 0.2s ease;
        }

        .badge:hover {
          transform: scale(1.15);
        }

        .badge.selected {
          border-color: ${profile.themeColor};
          background: #222;
          box-shadow: 0 0 10px ${profile.themeColor};
        }

        .color-picker-btn {
          width: 100%;
          margin-bottom: 1rem;
          border-radius: 1rem;
          padding: 0.7rem;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          background: ${profile.themeColor};
          color: black;
          box-shadow: 0 0 10px ${profile.themeColor};
          transition: transform 0.2s;
        }

        .color-picker-btn:hover {
          transform: scale(1.03);
        }

        .hidden {
          display: none;
        }

        .preview {
          background: #000;
          border-radius: 1.5rem;
          padding: 1.5rem;
          margin-top: 2rem;
          color: white;
          box-shadow: 0 0 25px ${profile.themeColor};
        }

        .preview h2 {
          font-size: 1.6rem;
          margin-bottom: 0.5rem;
        }

        .preview .tagline {
          color: #ccc;
          font-size: 1rem;
        }

        button.save {
          background: ${profile.themeColor};
          color: #111;
          padding: 0.8rem 1.6rem;
          border-radius: 1rem;
          font-weight: bold;
          font-size: 1rem;
          border: none;
          cursor: pointer;
          margin-top: 1.5rem;
          box-shadow: 0 0 18px ${profile.themeColor};
          transition: 0.3s;
        }

        button.save:hover {
          transform: scale(1.05);
        }

        a {
          display: inline-block;
          margin-top: 1rem;
          font-size: 0.85rem;
          color: ${profile.themeColor};
          text-decoration: underline;
          cursor: pointer;
        }
      `}</style>

      <div className="container">
        <div className="form">
          <div className="avatar" />
          <button className="upload-button" onClick={() => fileInputRef.current.click()}>
            Upload Profile
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
          />

          <input
            type="text"
            placeholder="Display Name"
            value={profile.displayName}
            onChange={(e) => handleChange('displayName', e.target.value)}
          />

          <input
            type="text"
            placeholder="Username"
            value={profile.username}
            onChange={(e) => handleChange('username', e.target.value)}
          />

          <textarea
            placeholder="Status or Bio"
            rows={2}
            value={profile.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
          />

          <input
            type="text"
            placeholder="Tag Label (e.g. CULT)"
            value={profile.tagLabel}
            onChange={(e) => handleChange('tagLabel', e.target.value)}
            maxLength={12}
          />

          <div className="badges">
            {badgeOptions.map((badge) => (
              <div
                key={badge}
                className={`badge ${profile.badge === badge ? 'selected' : ''}`}
                onClick={() => handleChange('badge', badge)}
              >
                {badge}
              </div>
            ))}
          </div>

          <button className="color-picker-btn" onClick={() => openColorPicker(outerColorRef)}>
            Pick Profile Glow
          </button>
          <input
            type="color"
            ref={outerColorRef}
            className="hidden"
            value={profile.themeColor}
            onChange={(e) => handleChange('themeColor', e.target.value)}
          />

          <button className="color-picker-btn" onClick={() => openColorPicker(innerColorRef)}>
            Pick Panel Color
          </button>
          <input
            type="color"
            ref={innerColorRef}
            className="hidden"
            value={profile.innerColor}
            onChange={(e) => handleChange('innerColor', e.target.value)}
          />

          <div className="preview">
            <h2>{profile.displayName} {profile.badge}{profile.tagLabel && profile.tagLabel.length > 0 ? profile.tagLabel : ''}</h2>
            <div className="tagline">{profile.bio}</div>
          </div>

          <button className="save" onClick={handleSave}>Save Profile</button>
          <a onClick={() => router.push('/')}>Return to Home</a>
        </div>
      </div>
    </>
  );
}
