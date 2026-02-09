-- Create the function to process daily reminders
create or replace function process_daily_reminders()
returns void
language plpgsql
security definer
as $$
begin
  -- Insert pending alerts into the queue for reminders due tomorrow
  -- We select reminders where solar_date is exactly 1 day from now
  insert into alerts_queue (to_email, subject, body_text)
  select 
    p.email,
    'Reminder: ' || r.title,
    'Hello ' || coalesce(p.full_name, 'User') || E',\n\n' ||
    'This is a reminder for your event: "' || r.title || '" which is due on ' || r.solar_date || E'.\n\n' ||
    coalesce(r.description, '') || E'\n\n' ||
    'Powered by Lunar Reminder'
  from public.reminders r
  join public.profiles p on r.user_id = p.id
  where r.solar_date = current_date + interval '2 days'
    and r.notification_enabled = true;
    
  -- Log the execution (optional, for debugging)
  raise notice 'Processed daily reminders for %', current_date + interval '2 days';
end;
$$;

-- Enable pg_cron if it's not already enabled
-- Note: usage of pg_cron requires it to be enabled in the project dashboard as well.
create extension if not exists pg_cron;

-- Schedule the job to run daily at 10:00 AM UTC
-- The job name 'daily_reminder_check' prevents duplicate schedules if re-run
select cron.schedule(
  'daily_reminder_check', 
  '10 16 * * *', 
  'select process_daily_reminders()'
);
