-- Onboarding goals. Run once in Supabase Dashboard → SQL Editor, after notifications.sql.
-- What someone is on Schub for. Separate from looking_for, which says who they want to team up with.

alter table profiles
  add column if not exists goals text[] not null default '{}'
    check (goals <@ array['Hackathon team', 'Side project collaborator', 'Startup co-founder', 'Internship / job referral']);

-- contact.sql made profile columns readable one by one, so new ones need their own grant
grant select (goals) on profiles to authenticated;
