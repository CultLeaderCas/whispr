import { useEffect } from 'react';

export default function toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3500); // Auto-close after 3.5s
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      background: '#111',
      color: '#fff',
      padding: '1rem 1.5rem',
      borderRadius: '1rem',
      boxShadow: '0 0 20px #9500FF',
      fontWeight: 'bold',
      fontSize: '0.95rem',
      zIndex: 9999,
      animation: 'fadeIn 0.5s ease'
    }}>
      {message}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}