import { useEffect, useState } from 'react';
import Head from 'next/head';

type User = {
  name: string;
  tag: string;
  color: string;
  presence: 'online' | 'away' | 'dnd' | 'offline';
  game: string;
  music: string;
};

const presenceColors: Record<string, string> = {
  online: '#00ff7f',
  away: '#ffcc00',
  dnd: '#ff0033',
  offline: '#111111',
};

export default function Pulse() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // 💡 Replace this with a backend fetch when you're ready
    // Example: setUsers(await fetchUsersFromSupabase());
  }, []);

  return (
    <>
      <Head>
        <title>Whispr — Pulse</title>
      </Head>

      <style jsx>{`
        body {
          margin: 0;
          background: #0a001f;
          color: white;
          font-family: Orbitron, sans-serif;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
        }
        .status-bar {
          font-size: 1rem;
          color: #ccc;
          margin-bottom: 2rem;
        }
        .users {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          justify-content: center;
        }
        .user-card {
          background: #111;
          border-radius: 1rem;
          padding: 1rem;
          width: 200px;
          text-align: center;
        }
        .avatar {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          margin-bottom: 0.5rem;
          border: 3px solid #fff;
        }
        .user-name {
          font-weight: bold;
          margin-bottom: 0.3rem;
        }
        .user-tag {
          color: #ccc;
          font-size: 0.9rem;
          margin-bottom: 0.6rem;
        }
        .user-status {
          font-size: 0.85rem;
          color: #aaa;
          white-space: pre-line;
        }
      `}</style>

      <div className="container">
        <h1>Welcome to Whispr</h1>

        <div className="status-bar">
          {users.length} online • {users.filter(u => u.game).length} gaming • {users.filter(u => u.music).length} listening
        </div>

        <div className="users">
          {users.map((user, i) => (
            <div key={i} className="user-card" style={{ boxShadow: `0 0 12px ${user.color}` }}>
              <img
                src="/images/default-pfp.png"
                alt={user.name}
                className="avatar"
                style={{ borderColor: presenceColors[user.presence] || '#fff' }}
              />
              <div className="user-name">{user.name}</div>
              <div className="user-tag">{user.tag}</div>
              <div className="user-status">
                {user.game}
                {'\n'}
                {user.music}
              </div>
            </div>
          ))}
          {users.length === 0 && <p style={{ color: '#666' }}>No users online yet.</p>}
        </div>
      </div>
    </>
  );
}
