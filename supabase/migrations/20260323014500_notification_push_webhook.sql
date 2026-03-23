-- Supabase database webhook for new in-app notifications.
-- Before applying this migration in a real Supabase project:
-- 1. Store the edge function URL in Vault as `push_webhook_url`
--    (example: https://<project-ref>.functions.supabase.co/send-push-notification)
-- 2. Store the shared secret in Vault as `push_webhook_secret`
-- 3. Deploy the `send-push-notification` edge function with matching env vars.

create extension if not exists pg_net with schema extensions;
create extension if not exists vault with schema extensions;

create or replace function public.queue_push_notification_webhook()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  webhook_url text;
  webhook_secret text;
  webhook_headers jsonb;
begin
  select decrypted_secret
    into webhook_url
    from vault.decrypted_secrets
   where name = 'push_webhook_url'
   limit 1;

  if webhook_url is null then
    raise notice 'push_webhook_url secret is not configured; skipping push webhook for notification %', new.id;
    return new;
  end if;

  select decrypted_secret
    into webhook_secret
    from vault.decrypted_secrets
   where name = 'push_webhook_secret'
   limit 1;

  webhook_headers :=
    jsonb_build_object('Content-Type', 'application/json') ||
    case
      when webhook_secret is not null then jsonb_build_object('Authorization', 'Bearer ' || webhook_secret)
      else '{}'::jsonb
    end;

  perform net.http_post(
    url := webhook_url,
    headers := webhook_headers,
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', null
    )
  );

  return new;
end;
$$;

drop trigger if exists send_push_notification_webhook on public."Notification";

create trigger send_push_notification_webhook
after insert on public."Notification"
for each row
execute function public.queue_push_notification_webhook();
