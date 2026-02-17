import { NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';

// This route is called by a cron job (e.g., cron-job.org) to keep the Supabase project active
// It performs a lightweight query to ensure the database connection is warm
export async function GET() {
    try {
        console.log('[Keep-Alive] Ping received');

        const supabase = getServiceSupabase();

        // Insert a heartbeat record
        const { data, error } = await supabase
            .from('heartbeat')
            .insert({ source: 'cron' })
            .select()
            .single();

        if (error) {
            console.error('[Keep-Alive] Database error:', error);
            // Even if insert fails, we want to return 200 if DB is reachable, 
            // but error implies DB issue or table missing. 
            // If table missing, it's a "User needs to run migration" issue.
            return NextResponse.json(
                { status: 'error', message: error.message, timestamp: new Date().toISOString() },
                { status: 500 }
            );
        }

        return NextResponse.json({
            status: 'ok',
            message: 'Heartbeat recorded',
            timestamp: new Date().toISOString(),
            data: data
        });

    } catch (err) {
        console.error('[Keep-Alive] Unexpected error:', err);
        return NextResponse.json(
            { status: 'error', message: 'Internal Server Error', timestamp: new Date().toISOString() },
            { status: 500 }
        );
    }
}
