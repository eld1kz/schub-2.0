-- Everyone on a team can reach everyone else on it. Run once in Supabase Dashboard → SQL Editor,
-- after own-images.sql. Safe to run twice.
-- Replaces contact_for from teams.sql, where only the owner and each accepted member saw each other's
-- telegram and email; two members of the same team couldn't. Now the team is the owner plus everyone
-- accepted, and any two people on the same team see each other's contact details. Pending and declined
-- applicants are not on the team and see nothing. Accepted connections work as before.

create or replace function contact_for(profile_id uuid)
returns table (telegram text, email text)
language sql stable security definer set search_path = public as $$
  with members as (
    select t.id as team_id, t.owner_id as user_id from teams t
    union
    select a.team_id, a.user_id from team_applications a where a.status = 'accepted'
  )
  select p.telegram, p.email
  from profiles p
  where p.id = profile_id
    and (
      p.id = auth.uid()
      or exists (
        select 1 from connections c
        where c.status = 'accepted'
          and ((c.sender_id = auth.uid() and c.receiver_id = p.id)
            or (c.sender_id = p.id and c.receiver_id = auth.uid()))
      )
      or exists (
        select 1 from members me join members them on them.team_id = me.team_id
        where me.user_id = auth.uid() and them.user_id = p.id
      )
    );
$$;
