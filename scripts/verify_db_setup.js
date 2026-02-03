
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load .env.local manually since we are not in Next.js environment
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = envContent.split('\n').reduce((acc, line) => {
    const [key, val] = line.split('=');
    if (key && val) acc[key.trim()] = val.trim();
    return acc;
}, {});

const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase environment variables in .env.local');
    process.exit(1);
}

console.log('Checking connection to:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    try {
        console.log('Attempting to query "reminders" table...');
        const { data, error } = await supabase.from('reminders').select('*').limit(1);

        if (error) {
            console.error('❌ Error querying reminders table:', error.message);
            console.error('   Hint: Did you run the migration SQL in Supabase?');
            console.error('   Error details:', JSON.stringify(error, null, 2));
        } else {
            console.log('✅ Success! "reminders" table exists and is accessible.');
            console.log('   Data sample:', data);
        }
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

check();
