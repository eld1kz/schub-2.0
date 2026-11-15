-- Contact after connecting. Run once in Supabase Dashboard → SQL Editor, after opportunities.sql.
-- Telegram and email live on profiles but are only readable by the owner and accepted connections.

alter table profiles
  add column if not exists telegram text not null default '' check (length(telegram) <= 32),
  add column if not exists email    text not null default '' check (length(email) <= 254);

-- Every signed-in user can read profiles, so take these two columns out of the API:
-- select is granted column by column, on everything except telegram and email.
-- Note: columns added to profiles later need their own "grant select (column) on profiles to authenticated".
revoke select on profiles from anon, authenticated;

do $$
begin
  execute format(
    'grant select (%s) on profiles to authenticated',
    (select string_agg(quote_ident(column_name), ', ')
       from information_schema.columns
      where table_schema = 'public' and table_name = 'profiles'
        and column_name not in ('telegram', 'email'))
  );
end;
$$;

-- The only way to read contact details: returns a row for yourself or an accepted connection, nothing otherwise.
create or replace function contact_for(profile_id uuid)
returns table (telegram text, email text)
language sql stable security definer set search_path = public as $$
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
    );
$$;

-- Receivers may only change the status of a request. Without this they could rewrite sender_id
-- and make it look like anyone had connected with them.
revoke update on connections from anon, authenticated;
grant update (status) on connections to authenticated;
