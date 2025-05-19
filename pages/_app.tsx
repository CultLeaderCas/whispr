// pages/_app.tsx
import "../styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Check for an active session and refresh if needed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        supabase.auth.refreshSession();
      }
    });

    // Listener for future auth state changes (e.g., sign in, sign out)
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          console.log("🔒 User signed out.");
        } else if (session) {
          console.log("🔓 Session restored.");
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return <Component {...pageProps} />;
}
