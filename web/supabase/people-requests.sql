-- People tabs. Run once in Supabase Dashboard → SQL Editor, after experience-details.sql. Safe to run twice.
-- 1. The sender can withdraw a connection request while it's still pending.
-- 2. Connection request notifications open /people/requests instead of /people.

-- Mirrors "Receivers can accept or decline": only your own side of the request, only while pending.
-- Guests are already blocked from deleting by the restrictive policies in auth.sql.
drop policy if exists "Senders can withdraw pending requests" on connections;
create policy "Senders can withdraw pending requests"
  on connections for delete to authenticated
  using (auth.uid() = sender_id and status = 'pending');

-- Same as in notifications.sql, with the new link for requests
create or replace function notify_connection()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into notifications (user_id, type, message, link)
    values (new.receiver_id, 'connection_request', format('%s wants to connect', display_name(new.sender_id)), '/people/requests');
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into notifications (user_id, type, message, link)
    values (new.sender_id, 'connection_accepted', format('%s accepted your connection', display_name(new.receiver_id)), '/u/' || new.receiver_id);
  end if;
  return new;
end;
$$;

-- Existing request notifications point to the new tab too
update notifications set link = '/people/requests' where type = 'connection_request' and link = '/people';
