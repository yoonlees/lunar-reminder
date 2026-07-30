import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Called daily by Fly.io cron. Finds reminders due tomorrow and sends push notifications.
export async function POST(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceSupabase();

  // Find reminders where solar_date is tomorrow and notification_enabled
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select('title, user_id, profiles(push_token)')
    .eq('solar_date', tomorrowStr)
    .eq('notification_enabled', true);

  if (error) {
    console.error('send-notifications query error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const messages = reminders
    .filter(r => r.profiles?.push_token)
    .map(r => ({
      to: r.profiles.push_token,
      sound: 'default',
      title: '내일 일정 알림',
      body: r.title,
      data: {},
    }));

  if (messages.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });

  const result = await res.json();
  return NextResponse.json({ sent: messages.length, result });
}
