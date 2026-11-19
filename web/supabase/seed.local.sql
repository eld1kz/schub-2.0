-- Fake data for the LOCAL Supabase only (npm run db:local). Never run this on the real project.
-- Runs after every migration. All names are made up; every account's password is "password123".
--
-- Fixed ids so tests can refer to people: student NN is 00000000-0000-4000-8000-0000000000NN.
-- Tests use 01 as "user A", 02 as "user B" and 20 as the admin.

-- Students ----------------------------------------------------------------------------

create temp table fake_students (n int, name text, uni text, grad int, headline text, skills text[], interests text[], goals text[]);

insert into fake_students values
  (1,  'Minji Placeholder', 'Korea University', 2027, 'Frontend, mostly React',           '{React,TypeScript,Next.js,Figma}',            '{edtech,design}',        '{"Hackathon team"}'),
  (2,  'Jisoo Sampleton',   'Korea University', 2026, 'Backend and infra',                '{Python,FastAPI,PostgreSQL,Docker}',          '{fintech,edtech}',       '{"Hackathon team","Startup co-founder"}'),
  (3,  'Doyun Testwell',    'Korea University', 2028, 'ML student',                       '{Python,"Machine Learning",NLP}',             '{ai,health}',            '{"Side project collaborator"}'),
  (4,  'Seoyeon Mockford',  'Korea University', 2027, 'Product designer',                 '{Figma,"UI/UX Design"}',                      '{design,edtech}',        '{"Hackathon team"}'),
  (5,  'Haneul Fakename',   'Korea University', 2025, 'iOS developer',                    '{Swift,Kotlin}',                              '{mobile}',               '{"Internship / job referral"}'),
  (6,  'Joon Dummyson',     'Korea University', 2029, '',                                 '{JavaScript}',                                '{}',                     '{}'),
  (7,  'Yuna Fixture',      'Seoul National University', 2026, 'Data science',            '{Python,"Data Science",SQL}',                 '{climate,ai}',           '{"Hackathon team"}'),
  (8,  'Taeho Stubbs',      'Seoul National University', 2027, 'Go and Rust',            '{Go,Rust,Redis}',                             '{infra}',                '{"Side project collaborator"}'),
  (9,  'Ara Lorem',         'Seoul National University', 2028, 'Frontend learner',        '{Vue,JavaScript}',                            '{edtech}',               '{"Hackathon team"}'),
  (10, 'Minho Ipsum',       'Seoul National University', 2027, 'Designer who codes',      '{Figma,React}',                               '{design,games}',         '{"Hackathon team"}'),
  (11, 'Sora Examplova',    'Seoul National University', 2026, 'Growth and marketing',    '{Marketing,"Business Development"}',          '{fintech}',              '{"Startup co-founder"}'),
  (12, 'Woojin Seedling',   'Seoul National University', 2029, 'Java backend',           '{Java,SQL,AWS}',                              '{fintech}',              '{"Internship / job referral"}'),
  (13, 'Eunbi Notreal',     'Seoul National University', 2028, 'Blockchain tinkerer',     '{Solidity,Blockchain}',                       '{crypto}',               '{"Side project collaborator"}'),
  (14, 'Kai Testerson',     'KAIST', 2027, 'Robotics and vision',                         '{"Computer Vision","C++",Python}',            '{robotics,ai}',          '{"Hackathon team"}'),
  (15, 'Dana Mockingbird',  'KAIST', 2026, 'Full stack',                                  '{TypeScript,Node.js,PostgreSQL,React}',       '{edtech,health}',        '{"Hackathon team","Startup co-founder"}'),
  (16, 'Hyun Fakerly',      'KAIST', 2028, 'Mobile apps',                                 '{Flutter,Swift}',                             '{mobile,health}',        '{"Hackathon team"}'),
  (17, 'Rin Sandbox',       'KAIST', 2027, 'Frontend',                                    '{React,TypeScript}',                          '{games}',                '{"Side project collaborator"}'),
  (18, 'Jaden Prototype',   'KAIST', 2026, 'Product manager',                             '{"Product Management",Finance}',              '{fintech}',              '{"Startup co-founder"}'),
  (19, 'Nari Demoson',      'KAIST', 2029, 'ML on the side',                              '{"Machine Learning",Python,GCP}',             '{ai,climate}',           '{"Hackathon team"}'),
  (20, 'Admin Testaccount', 'KAIST', 2026, 'Runs the opportunity list',                   '{Python}',                                    '{}',                     '{}');

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

insert into admins (user_id) values (pg_temp.fake_id(20));

-- Experience and projects -------------------------------------------------------------

insert into experiences (user_id, role, company, type, location, remote, start_date, end_date, description, skills) values
  (pg_temp.fake_id(1),  'Frontend intern',     'Fakecorp Seoul',     'Internship',     'Seoul', false, '2025-03-01', '2025-11-01', 'Built pages nobody will ever see.', '{React,TypeScript}'),
  (pg_temp.fake_id(1),  'Web lead',            'KU Placeholder Club', 'Club / Society', 'Seoul', false, '2025-12-01', null,        'Runs the club website.',            '{Next.js}'),
  (pg_temp.fake_id(2),  'Backend developer',   'Sample Labs',        'Part-time',      '',      true,  '2024-06-01', null,         '',                                   '{Python,FastAPI}'),
  (pg_temp.fake_id(3),  'Research assistant',  'Mock NLP Lab',       'Research',       'Seoul', false, '2025-09-01', null,        'Fake research on fake data.',        '{NLP}'),
  (pg_temp.fake_id(7),  'Data intern',         'Testbank',           'Internship',     'Seoul', false, '2025-07-01', '2025-08-01', '',                                   '{SQL}'),
  (pg_temp.fake_id(8),  'Volunteer dev',       'Open Nothing',       'Volunteer',      '',      true,  '2023-01-01', '2024-12-01', '',                                   '{Go}'),
  (pg_temp.fake_id(14), 'Vision engineer',     'Robo Dummy Inc',     'Full-time',      'Daejeon', false, '2024-02-01', null,      'Robots that only exist here.',       '{"Computer Vision"}'),
  (pg_temp.fake_id(15), 'Freelance developer', 'Self',               'Freelance',      '',      true,  '2023-05-01', null,         '',                                   '{React,Node.js}'),
  (pg_temp.fake_id(18), 'PM intern',           'Example Fintech',    'Internship',     'Seoul', false, '2026-01-01', '2026-06-01', '',                                   '{"Product Management"}');

insert into projects (user_id, title, tagline, description, role, built_at, result, year, url, repo_url, skills) values
  (pg_temp.fake_id(1),  'Fake Study Planner', 'Plans studies that never happen', 'A made-up project.', 'Frontend', 'Placeholder Hack 2025', 'Winner', 2025, 'https://example.com/planner', 'https://github.com/fake-student-1/planner', '{React,Next.js}'),
  (pg_temp.fake_id(2),  'Mock Ledger',        'A ledger for fake money',        '',                    'Backend',  '',                      '',       2026, '',                            'https://github.com/fake-student-2/ledger',  '{Python,PostgreSQL}'),
  (pg_temp.fake_id(7),  'Sample Climate Map', 'Maps made-up emissions',         '',                    'Data',     'SNU Test Challenge',    'Finalist', 2025, 'https://example.com/climate', '',                                     '{"Data Science"}'),
  (pg_temp.fake_id(14), 'Dummy Drone',        'Flies in simulation only',       '',                    'Vision',   '',                      '',       2024, '',                            '',                                         '{"Computer Vision"}');

-- Opportunities: past and upcoming ------------------------------------------------------
-- The automatic checks reject past dates and more than 5 a day, so they're off while seeding.

alter table opportunities disable trigger opportunities_check;

insert into opportunities (id, title, type, organizer, location, online, url, starts_at, deadline, ends_at, description, status, submitted_by) values
  ('00000000-0000-4000-9000-000000000001', 'Placeholder Hack Seoul 2027',      'hackathon',   'Fake Org',        'Seoul',   false, 'https://example.com/hack-seoul-2027',  '2027-01-15', '2027-01-05', '2027-01-16', 'An upcoming fake hackathon.',      'live',    pg_temp.fake_id(20)),
  ('00000000-0000-4000-9000-000000000002', 'Mock AI Challenge Winter',         'competition', 'Sample Society',  '',        true,  'https://example.com/ai-winter',       '2026-12-10', '2026-11-30', '2026-12-20', 'Upcoming, online.',                'live',    pg_temp.fake_id(7)),
  ('00000000-0000-4000-9000-000000000003', 'Notreal Startup Grant',            'grant',       'Test Foundation', '',        true,  'https://example.com/grant',           null,         '2027-03-01', null,         '',                                 'live',    pg_temp.fake_id(15)),
  ('00000000-0000-4000-9000-000000000004', 'Placeholder Hack 2025',            'hackathon',   'Fake Org',        'Seoul',   false, 'https://example.com/hack-2025',       '2025-05-10', '2025-05-01', '2025-05-11', 'A past fake hackathon.',           'live',    pg_temp.fake_id(20)),
  ('00000000-0000-4000-9000-000000000005', 'SNU Test Challenge',               'competition', 'Mock Club',       'Seoul',   false, 'https://example.com/snu-challenge',   '2025-10-01', null,         '2025-10-03', 'Past.',                            'live',    pg_temp.fake_id(8)),
  ('00000000-0000-4000-9000-000000000006', 'Fake Internship Fair',             'internship',  'Example Corp',    'Daejeon', false, 'https://example.com/fair',            '2027-02-01', '2027-01-20', null,         'Reported three times, so hidden.', 'live',    pg_temp.fake_id(12)),
  ('00000000-0000-4000-9000-000000000007', 'Removed Sample Event',             'other',       'Nobody',          '',        true,  'https://example.com/removed',         '2027-04-01', null,         null,         'An admin removed it.',             'removed', pg_temp.fake_id(13));

alter table opportunities enable trigger opportunities_check;

-- Three reports hide opportunity 6 (trigger in opportunities.sql)
insert into opportunity_reports (opportunity_id, user_id, reason) values
  ('00000000-0000-4000-9000-000000000006', pg_temp.fake_id(3), 'fake'),
  ('00000000-0000-4000-9000-000000000006', pg_temp.fake_id(9), 'fake'),
  ('00000000-0000-4000-9000-000000000006', pg_temp.fake_id(11), 'duplicate');

insert into opportunity_participants (opportunity_id, user_id, note) values
  ('00000000-0000-4000-9000-000000000001', pg_temp.fake_id(5),  'iOS dev looking for a team'),
  ('00000000-0000-4000-9000-000000000001', pg_temp.fake_id(9),  ''),
  ('00000000-0000-4000-9000-000000000001', pg_temp.fake_id(19), 'ML, any track'),
  ('00000000-0000-4000-9000-000000000002', pg_temp.fake_id(3),  'NLP');

-- Teams in different states ---------------------------------------------------------------

insert into teams (id, owner_id, opportunity_id, title, description, roles) values
  -- Open: nobody has applied
  ('00000000-0000-4000-a000-000000000001', pg_temp.fake_id(1),  '00000000-0000-4000-9000-000000000001', 'Open Placeholder Team',  'No applicants yet.',           '{Backend,Designer}'),
  -- Full: every role has an accepted member
  ('00000000-0000-4000-a000-000000000002', pg_temp.fake_id(7),  '00000000-0000-4000-9000-000000000002', 'Full Sample Team',       'Every role is filled.',        '{Backend,ML}'),
  -- Pending applicants waiting for the owner, and one declined
  ('00000000-0000-4000-a000-000000000003', pg_temp.fake_id(2),  '00000000-0000-4000-9000-000000000001', 'Mock Team With Pending', 'Two people are waiting.',      '{Frontend,Backend,Designer}'),
  -- Partly filled: user A was accepted here
  ('00000000-0000-4000-a000-000000000004', pg_temp.fake_id(14), '00000000-0000-4000-9000-000000000001', 'Testerson Robotics',     'One role still open.',         '{iOS,Product,Design}'),
  -- No opportunity, one declined applicant
  ('00000000-0000-4000-a000-000000000005', pg_temp.fake_id(11), null,                                   'Fakename Growth Squad',  'A side project, no event.',    '{Marketing}'),
  -- Mixed: one accepted, user A and someone else pending
  ('00000000-0000-4000-a000-000000000006', pg_temp.fake_id(18), '00000000-0000-4000-9000-000000000003', 'Prototype Fintech',      'Applying for the fake grant.', '{Frontend,Backend,ML}');

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
  ('00000000-0000-4000-b000-000000000001', pg_temp.fake_id(1),  'Winner',            'Grand prize', '00000000-0000-4000-9000-000000000004', 'Placeholder Hack 2025', '2025-05-01',
     (select id from projects where title = 'Fake Study Planner'), 'https://example.com/results-2025', 'Won with a fake planner.'),
  ('00000000-0000-4000-b000-000000000002', pg_temp.fake_id(7),  'Finalist',          '',            '00000000-0000-4000-9000-000000000005', 'SNU Test Challenge',    '2025-10-01', null, '', ''),
  ('00000000-0000-4000-b000-000000000003', pg_temp.fake_id(2),  '2nd',               '',            null,                                   'Made-up Datathon',      '2026-03-01', null, '', ''),
  ('00000000-0000-4000-b000-000000000004', pg_temp.fake_id(15), 'Track winner',      'Best Health', null,                                   'Sample Health Hack',    '2026-06-01', null, '', ''),
  ('00000000-0000-4000-b000-000000000005', pg_temp.fake_id(12), 'Honorable mention', '',            null,                                   'Notreal Code Jam',      '2024-11-01', null, '', '');

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
