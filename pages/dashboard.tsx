import Head from 'next/head';

export default function Dashboard() {
  return (
    <>
      <Head>
        <title>Whispr UI Hub</title>
        <meta name="description" content="Full dashboard layout inspired by Cas's custom UI mockup" />
      </Head>

      <style>{`
        body {
          margin: 0;
          background-color: #0a001f;
          font-family: Orbitron, sans-serif;
          overflow: hidden;
        }

        .wrapper {
          display: flex;
          height: 100vh;
          width: 100vw;
          color: white;
        }

        .servers {
          width: 70px;
          background: #111;
          border-right: 2px solid #222;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 0;
          gap: 0.7rem;
        }

        .server-icon {
          width: 45px;
          height: 45px;
          border-radius: 50%;
          background-color: #555;
          box-shadow: 0 0 8px #9500FF;
        }

        .channels {
          width: 220px;
          background: #1a1a1a;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-right: 2px solid #222;
        }

        .channel-group h3 {
          font-size: 1rem;
          margin-bottom: 0.5rem;
        }

        .channel {
          padding: 0.5rem;
          border-radius: 0.5rem;
          background: #222;
          margin-bottom: 0.3rem;
          font-size: 0.9rem;
          cursor: pointer;
        }

        .chat-area {
          flex: 1;
          background: #121212;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1rem;
        }

        .chat-input {
          display: flex;
          align-items: center;
          border-top: 2px solid #333;
          padding: 1rem;
          background: #0f0f0f;
        }

        .chat-input input {
          flex: 1;
          padding: 0.8rem;
          font-size: 1rem;
          background: #222;
          color: white;
          border: none;
          border-radius: 1rem;
        }

        .chat-input button {
          margin-left: 1rem;
          background: #12f7ff;
          color: #111;
          padding: 0.6rem 1rem;
          border-radius: 1rem;
          border: none;
          font-weight: bold;
        }

        .users {
          width: 270px;
          background: #1c0033;
          padding: 1rem;
          border-left: 2px solid #222;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .user {
          background: linear-gradient(90deg, #222, #333);
          padding: 0.6rem;
          border-radius: 0.8rem;
          font-size: 0.9rem;
          box-shadow: 0 0 10px #fe019a;
        }

        .user span {
          display: block;
          font-size: 0.75rem;
          color: #aaa;
        }
      `}</style>

      <div className="wrapper">
        <div className="servers">
          {[...Array(10)].map((_, i) => (
            <div className="server-icon" key={i}></div>
          ))}
        </div>

        <div className="channels">
          <div className="channel-group">
            <h3>CHAT</h3>
            <div className="channel">&gt; general</div>
            <div className="channel">&gt; ideas</div>
            <div className="channel">&gt; feedback</div>
          </div>
          <div className="channel-group">
            <h3>VOICE CHAT</h3>
            <div className="channel">&gt; Lounge</div>
            <div className="channel">&gt; Studio</div>
          </div>
        </div>

        <div className="chat-area">
          <div className="chat-input">
            <input type="text" placeholder="Start Typing…" />
            <button>➕</button>
          </div>
        </div>

        <div className="users">
          <div className="user">
            Cas @CultLeaderCas
            <span>Playing: ✨ Music & Game</span>
          </div>
          <div className="user">
            Joykeeper @User
            <span>Playing: Chill Synthwave</span>
          </div>
          <div className="user">
            Zephir @User
            <span>In Voice • Listening 💙</span>
          </div>
        </div>
      </div>
    </>
  );
}
