// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cykrjyufrpoziwxcxjan.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5a3JqeXVmcnBveml3eGN4amFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczNzU2NzIsImV4cCI6MjA2Mjk1MTY3Mn0._OAouUP_oeZvVNRnAXHzhemODNppR2L0g6h0aigwbOI';

export const supabase = createClient(supabaseUrl, supabaseKey);
