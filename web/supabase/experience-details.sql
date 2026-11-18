-- Experience details: type, location, remote, and the skills used.
-- Run once in Supabase Dashboard → SQL Editor, after goals.sql. Safe to run twice.
-- Existing entries get empty values, so nothing needs backfilling.

alter table experiences
  add column if not exists type text not null default ''
    check (type in ('', 'Internship', 'Part-time', 'Full-time', 'Research', 'Club / Society', 'Freelance', 'Volunteer', 'Hackathon team')),
  add column if not exists location text not null default '' check (length(location) <= 80),
  add column if not exists remote boolean not null default false,
  add column if not exists skills text[] not null default '{}' check (cardinality(skills) <= 20);
