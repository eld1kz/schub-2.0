-- Connections on profile pages. Run once in Supabase Dashboard → SQL Editor, after portfolio.sql.
-- RLS keeps the connections table private to the two people in each row (the People and
-- Opportunity pages rely on that), so a profile's accepted connections are read through this
-- function instead. It returns only id, name and photo, never contact details.

create or replace function connections_of(profile_id uuid)
returns table (id uuid, name text, avatar_url text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.avatar_url
  from connections c
  join profiles p on p.id = case when c.sender_id = profile_id then c.receiver_id else c.sender_id end
  where c.status = 'accepted'
    and (c.sender_id = profile_id or c.receiver_id = profile_id)
  order by c.created_at desc;
$$;

revoke execute on function connections_of(uuid) from public, anon;
grant execute on function connections_of(uuid) to authenticated;
