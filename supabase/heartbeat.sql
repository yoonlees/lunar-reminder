-- Create a table to track heartbeat/cron executions
create table if not exists heartbeat (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  source text default 'cron'
);

-- Add RLS policies (optional, but good practice)
alter table heartbeat enable row level security;

-- Allow service role to insert (api route uses service role)
create policy "Service role can insert heartbeat"
  on heartbeat
  for insert
  to service_role
  with check (true);

-- Allow service role to read (if needed)
create policy "Service role can read heartbeat"
  on heartbeat
  for select
  to service_role
  using (true);
