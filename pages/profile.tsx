// ... imports stay the same
export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<any>({
    displayName: '',
    username: '',
    bio: '',
    guildTag: '',
    tagEmoji: '💙',
    themeColor: '#12f7ff',
    innerColor: '#111111',
    profileImage: '',
  });

  const [availabilityMsg, setAvailabilityMsg] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('echno-profile');
    if (saved) {
      setProfile(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!profile.username || !profile.guildTag) {
        setAvailabilityMsg('');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', profile.username.trim())
        .eq('guildTag', profile.guildTag.trim());

      if (error) {
        setAvailabilityMsg('Error checking availability');
      } else if (data.length > 0) {
        setAvailabilityMsg('That username + guild tag is taken 😞');
      } else {
        setAvailabilityMsg('✅ Available!');
      }
    };

    const debounce = setTimeout(check, 500);
    return () => clearTimeout(debounce);
  }, [profile.username, profile.guildTag]);

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

  const handleChange = (field: keyof typeof profile, value: string) => {
    setProfile((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const payload = {
      id: uuidv4(),
      displayName: profile.displayName,
      username: profile.username,
      bio: profile.bio,
      guildTag: `${profile.tagEmoji} ${profile.guildTag}`,
      themeColor: profile.themeColor,
      innerColor: profile.innerColor,
      profileImage: profile.profileImage,
    };

    const { data, error } = await supabase.from('profiles').insert([payload]);

    if (error) {
      console.error("❌ Supabase insert error:", error);
      alert("Something went wrong saving your profile.");
    } else {
      localStorage.setItem('justSignedUp', '1');
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
        boxShadow: `0 0 80px ${profile.themeColor}`,
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
        <input
          type="text"
          placeholder="Display Name"
          value={profile.displayName}
          onChange={e => handleChange('displayName', e.target.value)}
          style={inputStyle(profile.themeColor)}
        />

        <input
          type="text"
          placeholder="Username"
          value={profile.username}
          onChange={e => handleChange('username', e.target.value)}
          style={inputStyle(profile.themeColor)}
        />

        <input
          type="text"
          placeholder="Bio"
          value={profile.bio}
          onChange={e => handleChange('bio', e.target.value)}
          style={inputStyle(profile.themeColor)}
        />

        {/* Guild Tag with Emoji Preview */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <select
            value={profile.tagEmoji}
            onChange={e => handleChange('tagEmoji', e.target.value)}
            style={{ ...inputStyle(profile.themeColor), width: '4rem', textAlign: 'center', padding: '0.5rem' }}
          >
            {['💙', '🔥', '⭐', '🌙', '🎮', '👾', '🌀'].map((emoji, i) => (
              <option key={i} value={emoji}>{emoji}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Guild Tag"
            value={profile.guildTag}
            onChange={e => handleChange('guildTag', e.target.value)}
            style={{ ...inputStyle(profile.themeColor), flex: 1 }}
          />
        </div>

        {/* Availability message */}
        <p style={{ color: availabilityMsg.includes('taken') ? 'red' : '#12f7ff', fontSize: '0.9rem', marginTop: '0.3rem' }}>
          {availabilityMsg}
        </p>

        {/* Preview */}
        <p style={{ marginTop: '0.6rem', fontSize: '1rem', color: '#ccc' }}>
          Preview: <strong>@{profile.username || 'user'}</strong> <span style={{ opacity: 0.8 }}>{profile.tagEmoji} {profile.guildTag}</span>
        </p>

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

// Reusable input style helper
function inputStyle(shadowColor: string): React.CSSProperties {
  return {
    margin: '0.6rem 0',
    padding: '0.6rem',
    width: '100%',
    borderRadius: '0.8rem',
    border: 'none',
    fontSize: '1rem',
    outline: 'none',
    background: '#111',
    color: '#fff',
    boxShadow: `0 0 6px ${shadowColor}`
  };
}
