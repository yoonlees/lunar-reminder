import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, title, description, lunarDate, solarDate, recurrence, notificationEnabled } = body;

        console.log('[API] Creating reminder for user:', userId);

        if (!userId || !title || !solarDate) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('reminders')
            .insert({
                user_id: userId,
                title,
                description: description || null,
                lunar_date: lunarDate,
                solar_date: solarDate,
                recurrence: recurrence || 'none',
                notification_enabled: notificationEnabled !== undefined ? notificationEnabled : true
            })
            .select()
            .single();

        if (error) {
            console.error('[API] Database error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error('[API] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        console.log('[API] Fetching reminders for user:', userId);

        const supabase = getServiceSupabase();

        const { data, error } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', userId)
            .order('solar_date', { ascending: true });

        if (error) {
            console.error('[API] Database error fetching reminders:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        console.log('[API] Fetched', data?.length, 'reminders');
        return NextResponse.json(data || []);
    } catch (err) {
        console.error('[API] Unexpected error in GET:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
