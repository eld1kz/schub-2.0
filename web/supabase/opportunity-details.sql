-- Opportunity details: an end date and an "online" flag.
-- Run once in Supabase Dashboard → SQL Editor, after people-requests.sql. Safe to run twice.
-- Existing opportunities get no end date and online = false.

alter table opportunities
  add column if not exists ends_at date,
  add column if not exists online boolean not null default false;

-- It can't end before it starts (or, with no start date, before the deadline)
alter table opportunities drop constraint if exists ends_after_start;
alter table opportunities
  add constraint ends_after_start check (ends_at is null or ends_at >= coalesce(starts_at, deadline));
