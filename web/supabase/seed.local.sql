-- Fake data for the LOCAL Supabase only (npm run db:local). Never run this on the real project.
-- Runs after every migration. All names are made up; every account's password is "password123".
--
-- Fixed ids so tests can refer to people: student NN is 00000000-0000-4000-8000-0000000000NN.
-- Tests use 01 as "user A", 02 as "user B" and 20 as the admin.
--
-- Every date is relative to today, so the data never goes stale: an event 10 days away is always 10 days away.
-- scripts/db-local.sh can pin today (SEED_TODAY, passed as schub.seed_today) so the screenshot tests always see
-- the same dates. With today pinned to 2026-11-20, the dates come out as the comments next to them say.

create temp table seed_today as
  select coalesce(nullif(current_setting('schub.seed_today', true), ''), current_date::text)::date as d;
-- n days from today
create function pg_temp.day(n int) returns date language sql stable as $$ select d + n from pg_temp.seed_today $$;
-- The 1st of the month n months from this one (experience periods and awards are stored as the 1st)
create function pg_temp.month(n int) returns date language sql stable as $$
  select (date_trunc('month', d) + make_interval(months => n))::date from pg_temp.seed_today;
$$;
-- The 1st of the month a day is in
create function pg_temp.month_of(day date) returns date language sql immutable as $$ select date_trunc('month', day)::date $$;
-- This year plus n
create function pg_temp.year(n int) returns int language sql stable as $$ select extract(year from d)::int + n from pg_temp.seed_today $$;

-- Students ----------------------------------------------------------------------------

create temp table fake_students (n int, name text, uni text, grad int, headline text, skills text[], interests text[], goals text[]);

insert into fake_students values
  (1,  'Minji Placeholder', 'Korea University', pg_temp.year(+1), 'Frontend, mostly React',           '{React,TypeScript,Next.js,Figma}',            '{edtech,design}',        '{"Hackathon team"}'),
  (2,  'Jisoo Sampleton',   'Korea University', pg_temp.year(0), 'Backend and infra',                '{Python,FastAPI,PostgreSQL,Docker}',          '{fintech,edtech}',       '{"Hackathon team","Startup co-founder"}'),
  (3,  'Doyun Testwell',    'Korea University', pg_temp.year(+2), 'ML student',                       '{Python,"Machine Learning",NLP}',             '{ai,health}',            '{"Side project collaborator"}'),
  (4,  'Seoyeon Mockford',  'Korea University', pg_temp.year(+1), 'Product designer',                 '{Figma,"UI/UX Design"}',                      '{design,edtech}',        '{"Hackathon team"}'),
  (5,  'Haneul Fakename',   'Korea University', pg_temp.year(-1), 'iOS developer',                    '{Swift,Kotlin}',                              '{mobile}',               '{"Internship / job referral"}'),
  (6,  'Joon Dummyson',     'Korea University', pg_temp.year(+3), '',                                 '{JavaScript}',                                '{}',                     '{}'),
  (7,  'Yuna Fixture',      'Seoul National University', pg_temp.year(0), 'Data science',            '{Python,"Data Science",SQL}',                 '{climate,ai}',           '{"Hackathon team"}'),
  (8,  'Taeho Stubbs',      'Seoul National University', pg_temp.year(+1), 'Go and Rust',            '{Go,Rust,Redis}',                             '{infra}',                '{"Side project collaborator"}'),
  (9,  'Ara Lorem',         'Seoul National University', pg_temp.year(+2), 'Frontend learner',        '{Vue,JavaScript}',                            '{edtech}',               '{"Hackathon team"}'),
  (10, 'Minho Ipsum',       'Seoul National University', pg_temp.year(+1), 'Designer who codes',      '{Figma,React}',                               '{design,games}',         '{"Hackathon team"}'),
  (11, 'Sora Examplova',    'Seoul National University', pg_temp.year(0), 'Growth and marketing',    '{Marketing,"Business Development"}',          '{fintech}',              '{"Startup co-founder"}'),
  (12, 'Woojin Seedling',   'Seoul National University', pg_temp.year(+3), 'Java backend',           '{Java,SQL,AWS}',                              '{fintech}',              '{"Internship / job referral"}'),
  (13, 'Eunbi Notreal',     'Seoul National University', pg_temp.year(+2), 'Blockchain tinkerer',     '{Solidity,Blockchain}',                       '{crypto}',               '{"Side project collaborator"}'),
  (14, 'Kai Testerson',     'KAIST', pg_temp.year(+1), 'Robotics and vision',                         '{"Computer Vision","C++",Python}',            '{robotics,ai}',          '{"Hackathon team"}'),
  (15, 'Dana Mockingbird',  'KAIST', pg_temp.year(0), 'Full stack',                                  '{TypeScript,Node.js,PostgreSQL,React}',       '{edtech,health}',        '{"Hackathon team","Startup co-founder"}'),
  (16, 'Hyun Fakerly',      'KAIST', pg_temp.year(+2), 'Mobile apps',                                 '{Flutter,Swift}',                             '{mobile,health}',        '{"Hackathon team"}'),
  (17, 'Rin Sandbox',       'KAIST', pg_temp.year(+1), 'Frontend',                                    '{React,TypeScript}',                          '{games}',                '{"Side project collaborator"}'),
  (18, 'Jaden Prototype',   'KAIST', pg_temp.year(0), 'Product manager',                             '{"Product Management",Finance}',              '{fintech}',              '{"Startup co-founder"}'),
  (19, 'Nari Demoson',      'KAIST', pg_temp.year(+3), 'ML on the side',                              '{"Machine Learning",Python,GCP}',             '{ai,climate}',           '{"Hackathon team"}'),
  (20, 'Admin Testaccount', 'KAIST', pg_temp.year(0), 'Runs the opportunity list',                   '{Python}',                                    '{}',                     '{}');

create function pg_temp.fake_id(n int) returns uuid language sql immutable as $$
  select ('00000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid;
$$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select '00000000-0000-0000-0000-000000000000', pg_temp.fake_id(n), 'authenticated', 'authenticated',
       format('student%s@schub.test', lpad(n::text, 2, '0')),
       extensions.crypt('password123', extensions.gen_salt('bf')), now(),
       '{"provider":"email","providers":["email"]}', jsonb_build_object('name', name), now(), now(),
       '', '', '', '', '', '', '', ''
from fake_students;

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select pg_temp.fake_id(n)::text, pg_temp.fake_id(n),
       jsonb_build_object('sub', pg_temp.fake_id(n)::text, 'email', format('student%s@schub.test', lpad(n::text, 2, '0')), 'email_verified', true),
       'email', now(), now(), now()
from fake_students;

-- handle_new_user() already made an empty profile with the name; fill in the rest
update profiles p set
  university = s.uni,
  graduation_year = s.grad,
  headline = s.headline,
  bio = case when s.n = 6 then '' else 'Made-up student for local testing. ' || s.headline || '.' end,
  skills = s.skills,
  interests = s.interests,
  looking_for = '{teammates}',
  goals = s.goals,
  open_to_collaborate = s.n <> 13,
  github = case when s.n % 3 = 0 then '' else 'https://github.com/fake-student-' || s.n end,
  linkedin = case when s.n % 4 = 0 then 'https://www.linkedin.com/in/fake-student-' || s.n else '' end,
  website = case when s.n = 1 then 'https://example.com/minji' else '' end,
  telegram = 'fake_student_' || s.n,
  email = format('student%s.contact@example.com', lpad(s.n::text, 2, '0'))
from fake_students s
where p.id = pg_temp.fake_id(s.n);

-- Roles some of them are open to joining a team as (open-to-team.sql)
update profiles p set wanted_roles = r.roles
from (values
  (3,  '{"ML / AI"}'::text[]),
  (4,  '{Designer}'),
  (9,  '{Frontend}'),
  (10, '{Designer,Frontend}'),
  (15, '{Full-stack,Backend}'),
  (16, '{iOS,Android}'),
  (19, '{"ML / AI",Data}')
) as r(n, roles)
where p.id = pg_temp.fake_id(r.n);

-- Languages and work style for some of them (languages.sql); the rest leave it unset
update profiles p set languages = w.languages, hours_per_week = w.hours, work_mode = w.mode, city = w.city
from (values
  (1,  '{Korean,English}'::text[], '10-20',   'Either',    'Seoul'),
  (2,  '{Korean}',                 '5-10',    'In person', 'Seoul'),
  (3,  '{Korean,English}',         '20+',     'Remote',    ''),
  (4,  '{English}',                'Under 5', 'Remote',    'Busan'),
  (7,  '{Russian,English}',        '10-20',   'In person', 'Seoul'),
  (8,  '{Russian}',                '',        'Remote',    ''),
  (10, '{Korean,Japanese}',        '5-10',    'Either',    'Seoul'),
  (15, '{English,Uzbek}',          '20+',     'Remote',    'Daejeon')
) as w(n, languages, hours, mode, city)
where p.id = pg_temp.fake_id(w.n);

insert into admins (user_id) values (pg_temp.fake_id(20));

-- The admin's authenticator app (admin.sql: admins need a second factor). Tests make its codes from this secret.
insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
values ('00000000-0000-4000-c000-000000000020', pg_temp.fake_id(20), 'Seeded authenticator', 'totp', 'verified', now(), now(),
        'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP');

-- Experience and projects -------------------------------------------------------------

insert into experiences (user_id, role, company, type, location, remote, start_date, end_date, description, skills) values
  (pg_temp.fake_id(1),  'Frontend intern',     'Fakecorp Seoul',     'Internship',     'Seoul', false, pg_temp.month(-20), pg_temp.month(-12), 'Built pages nobody will ever see.', '{React,TypeScript}'),
  (pg_temp.fake_id(1),  'Web lead',            'KU Placeholder Club', 'Club / Society', 'Seoul', false, pg_temp.month(-11), null,        'Runs the club website.',            '{Next.js}'),
  (pg_temp.fake_id(2),  'Backend developer',   'Sample Labs',        'Part-time',      '',      true,  pg_temp.month(-29), null,         '',                                   '{Python,FastAPI}'),
  (pg_temp.fake_id(3),  'Research assistant',  'Mock NLP Lab',       'Research',       'Seoul', false, pg_temp.month(-14), null,        'Fake research on fake data.',        '{NLP}'),
  (pg_temp.fake_id(7),  'Data intern',         'Testbank',           'Internship',     'Seoul', false, pg_temp.month(-16), pg_temp.month(-15), '',                                   '{SQL}'),
  (pg_temp.fake_id(8),  'Volunteer dev',       'Open Nothing',       'Volunteer',      '',      true,  pg_temp.month(-46), pg_temp.month(-23), '',                                   '{Go}'),
  (pg_temp.fake_id(14), 'Vision engineer',     'Robo Dummy Inc',     'Full-time',      'Daejeon', false, pg_temp.month(-33), null,      'Robots that only exist here.',       '{"Computer Vision"}'),
  (pg_temp.fake_id(15), 'Freelance developer', 'Self',               'Freelance',      '',      true,  pg_temp.month(-42), null,         '',                                   '{React,Node.js}'),
  (pg_temp.fake_id(18), 'PM intern',           'Example Fintech',    'Internship',     'Seoul', false, pg_temp.month(-10), pg_temp.month(-5), '',                                   '{"Product Management"}');

insert into projects (user_id, title, tagline, description, role, built_at, result, year, url, repo_url, skills) values
  (pg_temp.fake_id(1),  'Fake Study Planner', 'Plans studies that never happen', 'A made-up project.', 'Frontend', 'Placeholder Hack 2025', 'Winner', pg_temp.year(-1), 'https://example.com/planner', 'https://github.com/fake-student-1/planner', '{React,Next.js}'),
  (pg_temp.fake_id(2),  'Mock Ledger',        'A ledger for fake money',        '',                    'Backend',  '',                      '',       pg_temp.year(0), '',                            'https://github.com/fake-student-2/ledger',  '{Python,PostgreSQL}'),
  (pg_temp.fake_id(7),  'Sample Climate Map', 'Maps made-up emissions',         '',                    'Data',     'SNU Test Challenge',    'Finalist', pg_temp.year(-1), 'https://example.com/climate', '',                                     '{"Data Science"}'),
  (pg_temp.fake_id(14), 'Dummy Drone',        'Flies in simulation only',       '',                    'Vision',   '',                      '',       pg_temp.year(-2), '',                            '',                                         '{"Computer Vision"}');

-- Opportunities: past and upcoming ------------------------------------------------------
-- The automatic checks reject past dates and more than 5 a day, so they're off while seeding.

alter table opportunities disable trigger opportunities_check;

insert into opportunities (id, title, type, organizer, location, online, url, starts_at, deadline, ends_at, description, status, submitted_by) values
  ('00000000-0000-4000-9000-000000000001', 'Placeholder Hack Seoul 2027',      'hackathon',   'Fake Org',        'Seoul',   false, 'https://example.com/hack-seoul-2027',  pg_temp.day(56), pg_temp.day(46), pg_temp.day(57), 'An upcoming fake hackathon.',      'live',    pg_temp.fake_id(20)),
  ('00000000-0000-4000-9000-000000000002', 'Mock AI Challenge Winter',         'competition', 'Sample Society',  '',        true,  'https://example.com/ai-winter',       pg_temp.day(20), pg_temp.day(10), pg_temp.day(30), 'Upcoming, online.',                'live',    pg_temp.fake_id(7)),
  ('00000000-0000-4000-9000-000000000003', 'Notreal Startup Grant',            'grant',       'Test Foundation', '',        true,  'https://example.com/grant',           null,         pg_temp.day(101), null,         '',                                 'live',    pg_temp.fake_id(15)),
  ('00000000-0000-4000-9000-000000000004', 'Placeholder Hack 2025',            'hackathon',   'Fake Org',        'Seoul',   false, 'https://example.com/hack-2025',       pg_temp.day(-559), pg_temp.day(-568), pg_temp.day(-558), 'A past fake hackathon.',           'live',    pg_temp.fake_id(20)),
  ('00000000-0000-4000-9000-000000000005', 'SNU Test Challenge',               'competition', 'Mock Club',       'Seoul',   false, 'https://example.com/snu-challenge',   pg_temp.day(-415), null,         pg_temp.day(-413), 'Past.',                            'live',    pg_temp.fake_id(8)),
  ('00000000-0000-4000-9000-000000000006', 'Fake Internship Fair',             'internship',  'Example Corp',    'Daejeon', false, 'https://example.com/fair',            pg_temp.day(73), pg_temp.day(61), null,         'Reported three times, so hidden.', 'live',    pg_temp.fake_id(12)),
  ('00000000-0000-4000-9000-000000000007', 'Removed Sample Event',             'other',       'Nobody',          '',        true,  'https://example.com/removed',         pg_temp.day(132), null,         null,         'An admin removed it.',             'removed', pg_temp.fake_id(13));

-- Place, languages and who can join (opportunity-engine.sql); 4, 5 and 7 keep only the old typed-in location
update opportunities set country = 'KR', city = 'Seoul', languages = '{Korean,English}' where id = '00000000-0000-4000-9000-000000000001';
update opportunities set languages = '{English}' where id = '00000000-0000-4000-9000-000000000002';
update opportunities set country = 'KR', city = 'Daejeon', languages = '{Korean}' where id = '00000000-0000-4000-9000-000000000006';

insert into opportunities (id, title, type, organizer, url, starts_at, deadline, ends_at, description, status, submitted_by,
                           online, country, city, languages, eligibility, eligibility_note, inferred, source, external_id, imported_at, needs_review) values
  -- Imported and live: Hack Club events are for students
  ('00000000-0000-4000-9000-000000000008', 'Sample Hack Club Jam',       'hackathon',   'Hack Club',       'https://example.com/hackclub-jam',   pg_temp.day(82), null,         pg_temp.day(83), '', 'live', null,
   false, 'US', 'Boston', '{English}', 'students', 'High school students', '{languages}', 'hackclub', 'hc-sample-1', now(), false),
  -- Imported from Luma, waiting for an admin's review
  ('00000000-0000-4000-9000-000000000009', 'Sample Luma Builders Night', 'other',       'Sample Calendar', 'https://example.com/luma-night',     pg_temp.day(61), null,         null,         '', 'live', null,
   false, 'KR', 'Seoul', '{English}', 'anyone', '', '{country,languages}', 'luma', 'luma-sample-1', now(), true),
  -- Added by a person: only people in Japan can join
  ('00000000-0000-4000-9000-000000000010', 'Tokyo Sample Ideathon',      'competition', 'Example Japan',   'https://example.com/tokyo-ideathon', pg_temp.day(105), pg_temp.day(92), null,         '', 'live', pg_temp.fake_id(10),
   false, 'JP', 'Tokyo', '{Japanese}', 'country', 'Residents of Japan', '{}', null, null, null, false);

-- A different day for each, so Newest has an order: the higher the number, the newer
update opportunities set created_at = now() - make_interval(days => 20 - right(id::text, 2)::int) where id::text like '00000000-0000-4000-9000-%';

alter table opportunities enable trigger opportunities_check;

-- Three reports hide opportunity 6 (trigger in admin.sql)
insert into reports (target_type, target_id, reporter_id, reason) values
  ('event', '00000000-0000-4000-9000-000000000006', pg_temp.fake_id(3), 'fake'),
  ('event', '00000000-0000-4000-9000-000000000006', pg_temp.fake_id(9), 'fake'),
  ('event', '00000000-0000-4000-9000-000000000006', pg_temp.fake_id(11), 'duplicate');

insert into opportunity_participants (opportunity_id, user_id, note) values
  ('00000000-0000-4000-9000-000000000001', pg_temp.fake_id(5),  'iOS dev looking for a team'),
  ('00000000-0000-4000-9000-000000000001', pg_temp.fake_id(9),  ''),
  ('00000000-0000-4000-9000-000000000001', pg_temp.fake_id(19), 'ML, any track'),
  ('00000000-0000-4000-9000-000000000002', pg_temp.fake_id(3),  'NLP');

-- Teams in different states ---------------------------------------------------------------

insert into teams (id, owner_id, title, description, roles) values
  -- Open: nobody has applied
  ('00000000-0000-4000-a000-000000000001', pg_temp.fake_id(1), 'Open Placeholder Team',  'No applicants yet.',           '{Backend,Designer}'),
  -- Full: every role has an accepted member
  ('00000000-0000-4000-a000-000000000002', pg_temp.fake_id(7), 'Full Sample Team',       'Every role is filled.',        '{Backend,ML}'),
  -- Pending applicants waiting for the owner, and one declined
  ('00000000-0000-4000-a000-000000000003', pg_temp.fake_id(2), 'Mock Team With Pending', 'Two people are waiting.',      '{Frontend,Backend,Designer}'),
  -- Partly filled: user A was accepted here
  ('00000000-0000-4000-a000-000000000004', pg_temp.fake_id(14), 'Testerson Robotics',     'One role still open.',         '{iOS,Product,Design}'),
  -- No opportunity, one declined applicant
  ('00000000-0000-4000-a000-000000000005', pg_temp.fake_id(11), 'Fakename Growth Squad',  'A side project, no event.',    '{Marketing}'),
  -- Mixed: one accepted, user A and someone else pending
  ('00000000-0000-4000-a000-000000000006', pg_temp.fake_id(18), 'Prototype Fintech',      'Applying for the fake grant.', '{Frontend,Backend,ML}');

-- Each team's event (team-entries.sql); team 5 has none. Added before the members, so nobody is notified.
insert into team_entries (team_id, opportunity_id) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-a000-000000000002', '00000000-0000-4000-9000-000000000002'),
  ('00000000-0000-4000-a000-000000000003', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-a000-000000000004', '00000000-0000-4000-9000-000000000001'),
  ('00000000-0000-4000-a000-000000000006', '00000000-0000-4000-9000-000000000003');

insert into team_applications (team_id, user_id, role, note, status) values
  ('00000000-0000-4000-a000-000000000002', pg_temp.fake_id(8),  'Backend',  'Go person',          'accepted'),
  ('00000000-0000-4000-a000-000000000002', pg_temp.fake_id(14), 'ML',       '',                   'accepted'),
  ('00000000-0000-4000-a000-000000000003', pg_temp.fake_id(9),  'Frontend', 'I know Vue',         'pending'),
  ('00000000-0000-4000-a000-000000000003', pg_temp.fake_id(15), 'Backend',  'Full stack here',    'pending'),
  ('00000000-0000-4000-a000-000000000003', pg_temp.fake_id(10), 'Designer', '',                   'declined'),
  ('00000000-0000-4000-a000-000000000004', pg_temp.fake_id(16), 'iOS',      '',                   'accepted'),
  ('00000000-0000-4000-a000-000000000004', pg_temp.fake_id(1),  'Product',  'Happy to do PM',     'accepted'),
  ('00000000-0000-4000-a000-000000000005', pg_temp.fake_id(5),  'Marketing', '',                  'declined'),
  ('00000000-0000-4000-a000-000000000006', pg_temp.fake_id(17), 'Frontend', '',                   'accepted'),
  ('00000000-0000-4000-a000-000000000006', pg_temp.fake_id(1),  'Backend',  'Learning backend',   'pending'),
  ('00000000-0000-4000-a000-000000000006', pg_temp.fake_id(19), 'ML',       '',                   'pending');

-- Team languages and work mode (languages.sql)
update teams set languages = '{Korean,English}', work_mode = 'In person' where id = '00000000-0000-4000-a000-000000000001';
update teams set languages = '{Russian}', work_mode = 'Remote' where id = '00000000-0000-4000-a000-000000000002';
update teams set languages = '{English}', work_mode = 'Either' where id = '00000000-0000-4000-a000-000000000003';

-- Connections in every state ------------------------------------------------------------------
-- User A (01) and user B (02) are not connected, so tests can connect them.

insert into connections (sender_id, receiver_id, status) values
  (pg_temp.fake_id(1),  pg_temp.fake_id(3),  'accepted'),
  (pg_temp.fake_id(4),  pg_temp.fake_id(1),  'accepted'),
  (pg_temp.fake_id(1),  pg_temp.fake_id(5),  'pending'),
  (pg_temp.fake_id(6),  pg_temp.fake_id(1),  'pending'),
  (pg_temp.fake_id(1),  pg_temp.fake_id(7),  'declined'),
  (pg_temp.fake_id(2),  pg_temp.fake_id(8),  'accepted'),
  (pg_temp.fake_id(9),  pg_temp.fake_id(2),  'pending'),
  (pg_temp.fake_id(10), pg_temp.fake_id(11), 'declined'),
  (pg_temp.fake_id(12), pg_temp.fake_id(13), 'accepted'),
  (pg_temp.fake_id(14), pg_temp.fake_id(15), 'accepted'),
  (pg_temp.fake_id(16), pg_temp.fake_id(17), 'pending'),
  (pg_temp.fake_id(18), pg_temp.fake_id(19), 'accepted'),
  (pg_temp.fake_id(20), pg_temp.fake_id(14), 'accepted');

-- Awards with confirmed, pending and declined teammates ---------------------------------------

insert into awards (id, user_id, placement, prize_name, opportunity_id, event_name, awarded_on, project_id, proof_url, description) values
  ('00000000-0000-4000-b000-000000000001', pg_temp.fake_id(1),  'Winner',            'Grand prize', '00000000-0000-4000-9000-000000000004', 'Placeholder Hack 2025', pg_temp.month_of(pg_temp.day(-559)),
     (select id from projects where title = 'Fake Study Planner'), 'https://example.com/results-2025', 'Won with a fake planner.'),
  ('00000000-0000-4000-b000-000000000002', pg_temp.fake_id(7),  'Finalist',          '',            '00000000-0000-4000-9000-000000000005', 'SNU Test Challenge',    pg_temp.month_of(pg_temp.day(-415)), null, '', ''),
  ('00000000-0000-4000-b000-000000000003', pg_temp.fake_id(2),  '2nd',               '',            null,                                   'Made-up Datathon',      pg_temp.month(-8), null, '', ''),
  ('00000000-0000-4000-b000-000000000004', pg_temp.fake_id(15), 'Track winner',      'Best Health', null,                                   'Sample Health Hack',    pg_temp.month(-5), null, '', ''),
  ('00000000-0000-4000-b000-000000000005', pg_temp.fake_id(12), 'Honorable mention', '',            null,                                   'Notreal Code Jam',      pg_temp.month(-24), null, '', '');

insert into award_teammates (award_id, user_id, status) values
  ('00000000-0000-4000-b000-000000000001', pg_temp.fake_id(3),  'confirmed'),
  ('00000000-0000-4000-b000-000000000001', pg_temp.fake_id(4),  'pending'),
  ('00000000-0000-4000-b000-000000000001', pg_temp.fake_id(5),  'declined'),
  ('00000000-0000-4000-b000-000000000002', pg_temp.fake_id(8),  'confirmed'),
  ('00000000-0000-4000-b000-000000000002', pg_temp.fake_id(14), 'confirmed'),
  -- User A has a tag waiting to be answered
  ('00000000-0000-4000-b000-000000000003', pg_temp.fake_id(1),  'pending'),
  ('00000000-0000-4000-b000-000000000003', pg_temp.fake_id(9),  'declined'),
  ('00000000-0000-4000-b000-000000000005', pg_temp.fake_id(13), 'confirmed');

-- Reports waiting for an admin: student 13 reported as spam, team 5 as fake (admin.sql)
insert into reports (target_type, target_id, reporter_id, reason, note) values
  ('person', pg_temp.fake_id(13), pg_temp.fake_id(2), 'spam', 'Sends the same message to everyone.'),
  ('team', '00000000-0000-4000-a000-000000000005', pg_temp.fake_id(4), 'fake', '');
