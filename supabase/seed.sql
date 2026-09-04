-- ============================================================================
--  GigNest — seed data
--
--  Run AFTER schema.sql:  Supabase → SQL Editor → paste → Run.
--  Safe to re-run; existing tags are left alone.
--
--  This seeds the skill-tag vocabulary only. Quests and profiles come from
--  real signups, because both are foreign-keyed to auth.users and cannot be
--  faked from SQL. For an offline demo, run the app with no .env.local and it
--  serves a built-in sample dataset instead.
-- ============================================================================

insert into public.skills (slug, name, category) values
  -- ── Tech & Code ──────────────────────────────────────────────────────────
  ('web-development',     'Web Development',        'Tech & Code'),
  ('frontend',            'Frontend / React',       'Tech & Code'),
  ('backend',             'Backend / APIs',         'Tech & Code'),
  ('python',              'Python',                 'Tech & Code'),
  ('java',                'Java',                   'Tech & Code'),
  ('cpp',                 'C / C++',                'Tech & Code'),
  ('app-development',     'App Development',        'Tech & Code'),
  ('flutter',             'Flutter / React Native', 'Tech & Code'),
  ('machine-learning',    'Machine Learning',       'Tech & Code'),
  ('data-science',        'Data Science',           'Tech & Code'),
  ('data-entry',          'Data Entry',             'Tech & Code'),
  ('excel',               'Excel / Google Sheets',  'Tech & Code'),
  ('sql',                 'SQL / Databases',        'Tech & Code'),
  ('web-scraping',        'Web Scraping',           'Tech & Code'),
  ('devops',              'DevOps / Deployment',    'Tech & Code'),
  ('cybersecurity',       'Cybersecurity',          'Tech & Code'),
  ('embedded',            'Arduino / Embedded',     'Tech & Code'),
  ('matlab',              'MATLAB / Simulink',      'Tech & Code'),
  ('qa-testing',          'QA / App Testing',       'Tech & Code'),
  ('wordpress',           'WordPress / No-code',    'Tech & Code'),

  -- ── Design & Media ───────────────────────────────────────────────────────
  ('graphic-design',      'Graphic Design',         'Design & Media'),
  ('ui-ux',               'UI / UX Design',         'Design & Media'),
  ('figma',               'Figma',                  'Design & Media'),
  ('logo-design',         'Logo & Branding',        'Design & Media'),
  ('poster-design',       'Poster Design',          'Design & Media'),
  ('photoshop',           'Photoshop',              'Design & Media'),
  ('video-editing',       'Video Editing',          'Design & Media'),
  ('photography',         'Photography',            'Design & Media'),
  ('videography',         'Videography',            'Design & Media'),
  ('animation',           'Animation / Motion',     'Design & Media'),
  ('3d-modelling',        '3D Modelling / Blender', 'Design & Media'),
  ('cad',                 'CAD / SolidWorks',       'Design & Media'),
  ('autocad',             'AutoCAD',                'Design & Media'),
  ('thumbnail-design',    'Thumbnail Design',       'Design & Media'),

  -- ── Writing & Content ────────────────────────────────────────────────────
  ('content-writing',     'Content Writing',        'Writing & Content'),
  ('copywriting',         'Copywriting',            'Writing & Content'),
  ('technical-writing',   'Technical Writing',      'Writing & Content'),
  ('proofreading',        'Editing & Proofreading', 'Writing & Content'),
  ('translation',         'Translation',            'Writing & Content'),
  ('resume-writing',      'Resume / LinkedIn',      'Writing & Content'),
  ('research',            'Research Assistance',    'Writing & Content'),
  ('transcription',       'Transcription',          'Writing & Content'),
  ('subtitling',          'Subtitling',             'Writing & Content'),
  ('latex',               'LaTeX / Typesetting',    'Writing & Content'),

  -- ── Academics & Tutoring ─────────────────────────────────────────────────
  ('maths-tutoring',      'Maths Tutoring',         'Academics'),
  ('physics-tutoring',    'Physics Tutoring',       'Academics'),
  ('chemistry-tutoring',  'Chemistry Tutoring',     'Academics'),
  ('jee-coaching',        'JEE / NEET Coaching',    'Academics'),
  ('school-tutoring',     'School Tuition',         'Academics'),
  ('assignment-help',     'Assignment Help',        'Academics'),
  ('lab-reports',         'Lab Reports',            'Academics'),
  ('presentations',       'Presentation Making',    'Academics'),

  -- ── Business & Ops ───────────────────────────────────────────────────────
  ('social-media',        'Social Media Management','Business & Ops'),
  ('digital-marketing',   'Digital Marketing',      'Business & Ops'),
  ('seo',                 'SEO',                    'Business & Ops'),
  ('sales-outreach',      'Sales & Outreach',       'Business & Ops'),
  ('telecalling',         'Telecalling',            'Business & Ops'),
  ('market-survey',       'Market Survey',          'Business & Ops'),
  ('event-management',    'Event Management',       'Business & Ops'),
  ('campus-ambassador',   'Campus Ambassador',      'Business & Ops'),
  ('accounting',          'Accounting / Tally',     'Business & Ops'),
  ('customer-support',    'Customer Support',       'Business & Ops'),

  -- ── On the ground (Varanasi / campus) ────────────────────────────────────
  ('delivery-pickup',     'Delivery & Pickup',      'On Ground'),
  ('errands',             'Errand Running',         'On Ground'),
  ('event-setup',         'Event Setup / Crew',     'On Ground'),
  ('moving-help',         'Shifting & Moving Help', 'On Ground'),
  ('printing-runs',       'Printing & Xerox Runs',  'On Ground'),
  ('pet-sitting',         'Pet Sitting',            'On Ground'),
  ('cycle-repair',        'Bike / Cycle Repair',    'On Ground'),
  ('driving',             'Driving',                'On Ground'),

  -- ── Performance ──────────────────────────────────────────────────────────
  ('music',               'Music / Instrument',     'Performance'),
  ('singing',             'Singing',                'Performance'),
  ('anchoring',           'Anchoring / Hosting',    'Performance'),
  ('dance',               'Dance',                  'Performance'),
  ('theatre',             'Theatre / Acting',       'Performance'),
  ('dj',                  'DJ / Sound',             'Performance'),

  -- ── Languages ────────────────────────────────────────────────────────────
  ('english',             'English',                'Languages'),
  ('hindi',               'Hindi',                  'Languages'),
  ('bhojpuri',            'Bhojpuri',               'Languages'),
  ('sanskrit',            'Sanskrit',               'Languages'),
  ('german',              'German',                 'Languages'),
  ('french',              'French',                 'Languages'),
  ('japanese',            'Japanese',               'Languages'),
  ('spanish',             'Spanish',                'Languages')
on conflict (slug) do nothing;


-- ============================================================================
--  Optional: promote yourself to the `admin` role.
--
--  The /admin panel is gated by ADMIN_PASSWORD and does not need this — the
--  role exists for future in-app moderation. Sign in once, then uncomment and
--  run this from the SQL editor (the editor runs as service_role, which is the
--  only thing allowed to grant admin):
--
--    update public.profiles set role = 'admin'
--     where id = (select id from auth.users where email = 'you@example.com');
-- ============================================================================


-- ============================================================================
--  Optional: give your live project a few quests to look at.
--
--  Sign in through the app first so you have a profile, then replace the email
--  below with yours and run this block.
--
--    do $$
--    declare v_me uuid; v_quest uuid;
--    begin
--      select id into v_me from auth.users where email = 'you@example.com';
--      if v_me is null then raise exception 'No such user — sign in first'; end if;
--
--      insert into public.quests
--        (hirer_id, title, description, quest_type, reward_amount,
--         estimated_hours, deadline, is_remote, location_label, lat, lng)
--      values
--        (v_me,
--         'Build a landing page for a campus cafe',
--         'Single-page site with menu, photos and a contact form. Design is done '
--         'in Figma, you just need to build it responsively and deploy it.',
--         'one_time', 4000, 12, now() + interval '10 days',
--         false, 'Limbdi Corner, IIT BHU', 25.2677, 82.9913)
--      returning id into v_quest;
--
--      insert into public.quest_contacts (quest_id, phone)
--      values (v_quest, '+91 98765 43210');
--
--      insert into public.quest_skills (quest_id, skill_id)
--      select v_quest, id from public.skills
--       where slug in ('web-development', 'frontend', 'ui-ux');
--    end $$;
-- ============================================================================
