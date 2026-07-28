import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const SUPABASE_URL = 'https://zcugdaebtnnegfqyapxe.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdWdkYWVidG5uZWdmcXlhcHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTA4MjAsImV4cCI6MjA4NTE4NjgyMH0.wjqwCihrcwN4b00nBqw_9BC88jcXD6tF_ByxhUzCW9I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

export async function signInWithGoogle() {
  const redirectTo = 'lunar-reminder://';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const res = await WebBrowser.openAuthSessionAsync(data?.url ?? '', redirectTo);
  if (res.type === 'success') {
    const parsed = new URL(res.url);
    const code = parsed.searchParams.get('code');
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else {
      const hash = new URLSearchParams(parsed.hash.slice(1));
      const access_token = hash.get('access_token');
      const refresh_token = hash.get('refresh_token');
      if (access_token) await supabase.auth.setSession({ access_token, refresh_token });
    }
  }
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getReminders(userId) {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('user_id', userId)
    .order('solar_date', { ascending: true });
  if (error) { console.error('getReminders:', error); return []; }
  return data || [];
}

export async function saveReminder(userId, reminderData) {
  const { id, title, recurrence, isLunar, notification_enabled, solar_date, lunarDate } = reminderData;
  const payload = {
    user_id: userId,
    title,
    recurrence: recurrence || 'none',
    lunar_date: { month: lunarDate.month, day: lunarDate.day, isLunar },
    solar_date,
    notification_enabled: notification_enabled !== undefined ? notification_enabled : true,
  };
  const { error } = id
    ? await supabase.from('reminders').update(payload).eq('id', id)
    : await supabase.from('reminders').insert(payload);
  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function deleteReminder(reminderId) {
  const { error } = await supabase.from('reminders').delete().eq('id', reminderId);
  return !error;
}

export async function hasActiveSubscription(userId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .single();
  return !!data;
}
