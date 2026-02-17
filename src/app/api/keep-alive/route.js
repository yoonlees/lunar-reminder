import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// This route is called by a cron job (e.g., cron-job.org) to keep the Supabase project active
// It performs a lightweight query to ensure the database connection is warm
export async function GET() {
    try {
        console.log('[Keep-Alive] Ping received');

        const supabase = getServiceSupabase();

        // Use a lightweight query
        const { data, error } = await supabase
            .from('reminders')
            .select('id')
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found", which is fine
            console.error('[Keep-Alive] Database error:', error);
            return NextResponse.json(
                { status: 'error', message: error.message, timestamp: new Date().toISOString() },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: 'ok',
            message: 'Supabase is alive',
            timestamp: new Date().toISOString(),
            data: data ? 'Connection verified' : 'Connection verified (empty table)'
        });

    } catch (err) {
        console.error('[Keep-Alive] Unexpected error:', err);
        return NextResponse.json(
            { status: 'error', message: 'Internal Server Error', timestamp: new Date().toISOString() },
            { status: 500 }
        );
    }
}
