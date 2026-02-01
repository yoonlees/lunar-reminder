
import { createClient } from '@supabase/supabase-js'

// Keys from legacy_backup/supabase-client.js
const SUPABASE_URL = 'https://zcugdaebtnnegfqyapxe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdWdkYWVidG5uZWdmcXlhcHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTA4MjAsImV4cCI6MjA4NTE4NjgyMH0.wjqwCihrcwN4b00nBqw_9BC88jcXD6tF_ByxhUzCW9I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            // redirectTo: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
            redirectTo: typeof window !== 'undefined' ? window.location.origin : 'https://lunar.kiwishare.com'
        }
    });
    if (error) console.error('Error logging in:', error);
    return data;
}

export async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Error signing out:', error);
}

export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
}
