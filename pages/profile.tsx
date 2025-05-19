import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.refreshSession();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        console.log('Signed out.');
      } else if (session) {
        console.log('Session restored.');
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
