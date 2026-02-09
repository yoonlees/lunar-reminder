-- Enable the pg_net extension to make HTTP requests
create extension if not exists pg_net;

-- Create a table to store secrets securely
create table if not exists private_secrets (
  key text primary key,
  value text not null
);

-- Insert the ALERT_SECRET (Replace 'some-long-random-string' with your actual secret)
insert into private_secrets(key, value)
values ('ALERT_SECRET', 'some-long-random-string')
on conflict (key) do update set value = excluded.value;

-- Revoke access to the secrets table from public roles
revoke all on table private_secrets from anon, authenticated;
grant select on table private_secrets to service_role; -- Allow service_role to read (optional, depending on trigger execution context)

-- Create a queue table for alerts
create table if not exists alerts_queue (
  id bigserial primary key,
  to_email text not null,
  subject text not null,
  body_text text not null,
  created_at timestamptz default now(),
  sent_at timestamptz,
  send_error text
);

-- Create a function to send the email via the Fly.io endpoint
create or replace function send_alert_email_via_fly()
returns trigger
language plpgsql
security definer
as $$
declare
  alert_secret text;
  req_id bigint;
  fly_app_url text := 'https://lunar-reminder.fly.dev'; -- UPDATE THIS with your actual Fly app URL if different
begin
  select value into alert_secret
  from private_secrets
  where key = 'ALERT_SECRET';

  -- fire-and-forget HTTP POST
  select net.http_post(
    url := fly_app_url || '/api/internal/db-alert-email',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-alert-secret', alert_secret
    ),
    body := jsonb_build_object(
      'to', new.to_email,
      'subject', new.subject,
      'text', new.body_text
    )
  ) into req_id;

  return new;
exception when others then
  -- Log error or handle failure gracefully if needed (though pg_net is async)
  raise notice 'Error sending email alert: %', SQLERRM;
  return new;
end;
$$;

-- Create the trigger on the alerts_queue table
drop trigger if exists trg_send_alert_email on alerts_queue;

create trigger trg_send_alert_email
after insert on alerts_queue
for each row
execute function send_alert_email_via_fly();
