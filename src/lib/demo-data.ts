import type {
  Application,
  ApplicationWithRelations,
  PlatformStats,
  PublicProfile,
  QuestWithRelations,
  Review,
  Skill,
} from './types'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Demo dataset — used only when Supabase env vars are absent.
 *
 *  Everything here is fictional. It exists so that `npm run dev` shows a
 *  populated, believable product immediately, and so a pitch survives losing
 *  wifi. `src/lib/queries.ts` swaps this in transparently.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// Same order as supabase/seed.sql, so ids line up conceptually with a real DB.
const SKILL_TUPLES: [slug: string, name: string, category: string][] = [
  ['web-development', 'Web Development', 'Tech & Code'],
  ['frontend', 'Frontend / React', 'Tech & Code'],
  ['backend', 'Backend / APIs', 'Tech & Code'],
  ['python', 'Python', 'Tech & Code'],
  ['java', 'Java', 'Tech & Code'],
  ['cpp', 'C / C++', 'Tech & Code'],
  ['app-development', 'App Development', 'Tech & Code'],
  ['flutter', 'Flutter / React Native', 'Tech & Code'],
  ['machine-learning', 'Machine Learning', 'Tech & Code'],
  ['data-science', 'Data Science', 'Tech & Code'],
  ['data-entry', 'Data Entry', 'Tech & Code'],
  ['excel', 'Excel / Google Sheets', 'Tech & Code'],
  ['sql', 'SQL / Databases', 'Tech & Code'],
  ['web-scraping', 'Web Scraping', 'Tech & Code'],
  ['devops', 'DevOps / Deployment', 'Tech & Code'],
  ['cybersecurity', 'Cybersecurity', 'Tech & Code'],
  ['embedded', 'Arduino / Embedded', 'Tech & Code'],
  ['matlab', 'MATLAB / Simulink', 'Tech & Code'],
  ['qa-testing', 'QA / App Testing', 'Tech & Code'],
  ['wordpress', 'WordPress / No-code', 'Tech & Code'],
  ['graphic-design', 'Graphic Design', 'Design & Media'],
  ['ui-ux', 'UI / UX Design', 'Design & Media'],
  ['figma', 'Figma', 'Design & Media'],
  ['logo-design', 'Logo & Branding', 'Design & Media'],
  ['poster-design', 'Poster Design', 'Design & Media'],
  ['photoshop', 'Photoshop', 'Design & Media'],
  ['video-editing', 'Video Editing', 'Design & Media'],
  ['photography', 'Photography', 'Design & Media'],
  ['videography', 'Videography', 'Design & Media'],
  ['animation', 'Animation / Motion', 'Design & Media'],
  ['3d-modelling', '3D Modelling / Blender', 'Design & Media'],
  ['cad', 'CAD / SolidWorks', 'Design & Media'],
  ['autocad', 'AutoCAD', 'Design & Media'],
  ['thumbnail-design', 'Thumbnail Design', 'Design & Media'],
  ['content-writing', 'Content Writing', 'Writing & Content'],
  ['copywriting', 'Copywriting', 'Writing & Content'],
  ['technical-writing', 'Technical Writing', 'Writing & Content'],
  ['proofreading', 'Editing & Proofreading', 'Writing & Content'],
  ['translation', 'Translation', 'Writing & Content'],
  ['resume-writing', 'Resume / LinkedIn', 'Writing & Content'],
  ['research', 'Research Assistance', 'Writing & Content'],
  ['transcription', 'Transcription', 'Writing & Content'],
  ['subtitling', 'Subtitling', 'Writing & Content'],
  ['latex', 'LaTeX / Typesetting', 'Writing & Content'],
  ['maths-tutoring', 'Maths Tutoring', 'Academics'],
  ['physics-tutoring', 'Physics Tutoring', 'Academics'],
  ['chemistry-tutoring', 'Chemistry Tutoring', 'Academics'],
  ['jee-coaching', 'JEE / NEET Coaching', 'Academics'],
  ['school-tutoring', 'School Tuition', 'Academics'],
  ['assignment-help', 'Assignment Help', 'Academics'],
  ['lab-reports', 'Lab Reports', 'Academics'],
  ['presentations', 'Presentation Making', 'Academics'],
  ['social-media', 'Social Media Management', 'Business & Ops'],
  ['digital-marketing', 'Digital Marketing', 'Business & Ops'],
  ['seo', 'SEO', 'Business & Ops'],
  ['sales-outreach', 'Sales & Outreach', 'Business & Ops'],
  ['telecalling', 'Telecalling', 'Business & Ops'],
  ['market-survey', 'Market Survey', 'Business & Ops'],
  ['event-management', 'Event Management', 'Business & Ops'],
  ['campus-ambassador', 'Campus Ambassador', 'Business & Ops'],
  ['accounting', 'Accounting / Tally', 'Business & Ops'],
  ['customer-support', 'Customer Support', 'Business & Ops'],
  ['delivery-pickup', 'Delivery & Pickup', 'On Ground'],
  ['errands', 'Errand Running', 'On Ground'],
  ['event-setup', 'Event Setup / Crew', 'On Ground'],
  ['moving-help', 'Shifting & Moving Help', 'On Ground'],
  ['printing-runs', 'Printing & Xerox Runs', 'On Ground'],
  ['pet-sitting', 'Pet Sitting', 'On Ground'],
  ['cycle-repair', 'Bike / Cycle Repair', 'On Ground'],
  ['driving', 'Driving', 'On Ground'],
  ['music', 'Music / Instrument', 'Performance'],
  ['singing', 'Singing', 'Performance'],
  ['anchoring', 'Anchoring / Hosting', 'Performance'],
  ['dance', 'Dance', 'Performance'],
  ['theatre', 'Theatre / Acting', 'Performance'],
  ['dj', 'DJ / Sound', 'Performance'],
  ['english', 'English', 'Languages'],
  ['hindi', 'Hindi', 'Languages'],
  ['bhojpuri', 'Bhojpuri', 'Languages'],
  ['sanskrit', 'Sanskrit', 'Languages'],
  ['german', 'German', 'Languages'],
  ['french', 'French', 'Languages'],
  ['japanese', 'Japanese', 'Languages'],
  ['spanish', 'Spanish', 'Languages'],
]

export const DEMO_SKILLS: Skill[] = SKILL_TUPLES.map(([slug, name, category], i) => ({
  id: i + 1,
  slug,
  name,
  category,
}))

const BY_SLUG = new Map(DEMO_SKILLS.map((s) => [s.slug, s]))

function tags(...slugs: string[]): Skill[] {
  return slugs.map((s) => BY_SLUG.get(s)).filter((s): s is Skill => Boolean(s))
}

// ── Time helpers so relative labels stay sensible whenever this is run ───────
const NOW = Date.now()
const days = (n: number) => new Date(NOW + n * 86_400_000).toISOString()
const hoursAgo = (n: number) => new Date(NOW - n * 3_600_000).toISOString()

// ── Hirers and students ─────────────────────────────────────────────────────
function person(
  id: string,
  full_name: string,
  role: PublicProfile['role'],
  rating: number,
  rating_count: number,
  department: string | null = null,
  year: number | null = null,
): PublicProfile {
  return { id, full_name, avatar_url: null, role, rating, rating_count, department, year }
}

export const DEMO_PROFILES: PublicProfile[] = [
  person('d0000000-0000-4000-8000-000000000001', 'Anand Café, Limbdi Corner', 'hirer', 4.8, 14),
  person('d0000000-0000-4000-8000-000000000002', 'Kashi Ghat Homestay', 'hirer', 4.6, 9),
  person('d0000000-0000-4000-8000-000000000003', 'Dr. Meera Nair', 'hirer', 5.0, 6),
  person('d0000000-0000-4000-8000-000000000004', 'Sunrise Coaching Centre', 'hirer', 4.2, 21),
  person('d0000000-0000-4000-8000-000000000005', 'Banarasi Threads', 'hirer', 4.4, 5),
  person('d0000000-0000-4000-8000-000000000006', 'AgriSense Labs', 'hirer', 4.9, 11),
  // A student who posts work — students can hire too.
  person('d0000000-0000-4000-8000-000000000007', 'Technex Organising Team', 'student', 4.7, 18, 'Mechanical Engineering', 3),
  person('d0000000-0000-4000-8000-000000000008', 'Prof. R. Shukla', 'hirer', 4.9, 7),
  person('d0000000-0000-4000-8000-000000000009', 'Sarnath Tours & Travels', 'hirer', 4.1, 12),
  person('d0000000-0000-4000-8000-00000000000a', 'Ravindrapuri Residents Assn.', 'hirer', 4.5, 4),
  // Students, for the profile page
  person('d0000000-0000-4000-8000-0000000000b1', 'Aditi Raghavan', 'student', 4.9, 8, 'Computer Science & Engineering', 3),
  person('d0000000-0000-4000-8000-0000000000b2', 'Karthik Menon', 'student', 4.7, 5, 'Electronics Engineering', 2),
]

const P = new Map(DEMO_PROFILES.map((p) => [p.id.slice(-2), p]))

// ── Quests ──────────────────────────────────────────────────────────────────
interface QuestSeed {
  id: string
  hirer: string
  title: string
  description: string
  quest_type: QuestWithRelations['quest_type']
  status?: QuestWithRelations['status']
  reward: number
  hours?: number
  deadlineDays?: number
  remote?: boolean
  place?: [label: string, lat: number, lng: number]
  skills: string[]
  postedHoursAgo: number
  views: number
  applications: number
}

const SEEDS: QuestSeed[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    hirer: '01',
    title: "Rebuild our café website before the Diwali rush",
    description:
      "We are a 30-seat café just outside the campus gate. Our current site is a single JPEG of the menu from 2019. We want a proper responsive page: menu with prices, photo gallery, a map, opening hours and a WhatsApp order button.\n\nThe design is already done in Figma — we just need someone to build it well and deploy it. No backend needed. You will get the Figma file, all photos and copy on day one.",
    quest_type: 'one_time',
    reward: 6500,
    hours: 14,
    deadlineDays: 12,
    place: ['Limbdi Corner, IIT BHU', 25.262, 82.988],
    skills: ['web-development', 'frontend', 'ui-ux'],
    postedHoursAgo: 3,
    views: 128,
    applications: 6,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    hirer: '02',
    title: 'Shoot and edit a 60-second reel for our ghat-side homestay',
    description:
      "Small 6-room homestay two lanes behind Assi Ghat. We want one vertical reel that makes someone scrolling at 1am book a room: sunrise on the ghat, the rooftop breakfast, the rooms, a bit of aarti at dusk.\n\nBring your own camera or a decent phone with a gimbal. We will handle permissions with the ghat committee. Two half-days of shooting, then edit with licensed music.",
    quest_type: 'one_time',
    reward: 4000,
    hours: 16,
    deadlineDays: 9,
    place: ['Assi Ghat, Varanasi', 25.2877, 83.006],
    skills: ['videography', 'video-editing', 'photography'],
    postedHoursAgo: 8,
    views: 96,
    applications: 4,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    hirer: '03',
    title: 'Teach Class 11 physics to my daughter, 3 evenings a week',
    description:
      "She is preparing for JEE and is strong at maths but losing confidence in mechanics and rotational motion. Looking for someone patient who can start from concepts rather than formula drilling.\n\n6:30–8:00pm, Monday / Wednesday / Friday, at our home in Ravindrapuri. Paid monthly. If it goes well this continues through Class 12.",
    quest_type: 'weekly',
    reward: 8000,
    hours: 18,
    deadlineDays: 6,
    place: ['Ravindrapuri, Varanasi', 25.295, 83.005],
    skills: ['physics-tutoring', 'jee-coaching', 'maths-tutoring'],
    postedHoursAgo: 20,
    views: 210,
    applications: 11,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    hirer: '0a',
    title: 'Digitise 1,200 handwritten society survey forms',
    description:
      "We ran a residents' survey on paper and now need it in a spreadsheet. 1,200 forms, 14 fields each, mostly tick-boxes plus a few short text answers in Hindi or English.\n\nScans will be shared as a Drive folder. Accuracy matters more than speed — we will spot-check 50 random rows and ask for corrections. Fully remote, work whenever you like.",
    quest_type: 'one_time',
    reward: 3500,
    hours: 20,
    deadlineDays: 15,
    remote: true,
    skills: ['data-entry', 'excel', 'hindi'],
    postedHoursAgo: 30,
    views: 174,
    applications: 9,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000005',
    hirer: '05',
    title: 'Run Instagram for a new Banarasi saree label',
    description:
      "We weave and sell Banarasi silk and have just started selling online. We need someone to run the Instagram account properly for a month: 3 posts and 5 stories a week, basic reels from footage we provide, replying to DMs.\n\nYou do not need to be a photographer — we shoot the products. We need someone with taste and consistency. If the month works, we continue.",
    quest_type: 'monthly',
    reward: 7000,
    hours: 25,
    deadlineDays: 5,
    place: ['Godowlia, Varanasi', 25.31, 83.01],
    skills: ['social-media', 'copywriting', 'thumbnail-design', 'digital-marketing'],
    postedHoursAgo: 44,
    views: 302,
    applications: 14,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000006',
    hirer: '04',
    title: 'Build an attendance + fee-reminder app for our coaching centre',
    description:
      "We run 9 batches and track everything on paper. We want a simple app: teacher marks attendance on a phone, parents get an SMS if a student is absent, and the office sees who owes fees.\n\nAndroid only for now. We are flexible on stack — Flutter or React Native both fine. Part-time over 6 weeks, paid monthly. There is scope to keep maintaining it after launch.",
    quest_type: 'part_time',
    reward: 18000,
    hours: 60,
    deadlineDays: 20,
    place: ['Sigra, Varanasi', 25.32, 82.995],
    skills: ['app-development', 'flutter', 'backend', 'sql'],
    postedHoursAgo: 52,
    views: 265,
    applications: 8,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000007',
    hirer: '08',
    title: 'Proofread and fix the LaTeX on a 90-page MTech thesis',
    description:
      "Thesis is written and submitted for internal review. I need a careful pass for grammar, consistent notation, figure and table numbering, and a bibliography that actually compiles cleanly.\n\nYou must be comfortable in LaTeX — about 15 of the fixes are formatting, not language. Overleaf access will be shared. Tight deadline, hence the premium.",
    quest_type: 'one_time',
    reward: 2500,
    hours: 8,
    deadlineDays: 2,
    remote: true,
    skills: ['proofreading', 'latex', 'technical-writing'],
    postedHoursAgo: 5,
    views: 61,
    applications: 3,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000008',
    hirer: '07',
    title: 'Registration desk crew for Technex — 2 days',
    description:
      "We need 8 people on the registration desks across the two main days of the fest. Checking IDs, handing out badges and kits, pointing people to the right hall, keeping the queue moving.\n\n9am–6pm both days with rotating breaks. Lunch and a fest tee included. Good first quest if you have not done one before — no experience needed, just show up on time.",
    quest_type: 'one_time',
    reward: 1200,
    hours: 18,
    deadlineDays: 4,
    place: ['IIT BHU Main Campus', 25.2677, 82.9913],
    skills: ['event-setup', 'event-management', 'english'],
    postedHoursAgo: 11,
    views: 415,
    applications: 27,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000009',
    hirer: '06',
    title: 'ML intern for a crop-yield prediction pilot',
    description:
      "We are a 5-person agri-analytics team piloting yield prediction for wheat plots across eastern UP. You would work on the modelling side: cleaning satellite and weather features, trying gradient boosting and a small CNN baseline, and reporting honest error bars.\n\n3 months, roughly 20 hours a week, remote with two on-site visits. Stipend is monthly. Strong Python and a real project you can walk us through matter more than coursework.",
    quest_type: 'internship',
    reward: 25000,
    hours: 240,
    deadlineDays: 18,
    remote: true,
    skills: ['machine-learning', 'python', 'data-science'],
    postedHoursAgo: 26,
    views: 588,
    applications: 31,
  },
  {
    id: 'a1000000-0000-4000-8000-00000000000a',
    hirer: '07',
    title: 'Design 8 posters for our sponsorship deck',
    description:
      "Sponsorship season. We need 8 clean poster-style slides — one per event — that we can drop into a pitch deck and also post on Instagram. Brand colours and last year's deck will be shared as reference.\n\nFigma preferred so we can tweak text ourselves later. Two rounds of revisions included.",
    quest_type: 'one_time',
    reward: 3000,
    hours: 12,
    deadlineDays: 7,
    remote: true,
    skills: ['poster-design', 'graphic-design', 'figma'],
    postedHoursAgo: 15,
    views: 142,
    applications: 7,
  },
  {
    id: 'a1000000-0000-4000-8000-00000000000b',
    hirer: '01',
    title: 'Daily 6pm printout pickup and delivery run',
    description:
      "Every weekday at 6pm, collect our printed menus and bill books from the shop near the main gate and drop them at the café. Ten minutes of work, five days a week, paid monthly.\n\nIdeal if you already pass that way. A cycle is enough.",
    quest_type: 'weekly',
    reward: 2000,
    hours: 5,
    deadlineDays: 10,
    place: ['IIT BHU Main Gate', 25.2677, 82.9913],
    skills: ['delivery-pickup', 'errands', 'printing-runs'],
    postedHoursAgo: 40,
    views: 88,
    applications: 5,
  },
  {
    id: 'a1000000-0000-4000-8000-00000000000c',
    hirer: '09',
    title: 'Translate our tour brochure into German',
    description:
      "12-page brochure covering Sarnath, the ghats and a day trip to Chunar. Currently in English. We get a steady stream of German visitors and machine translation has embarrassed us twice.\n\nWe need someone genuinely comfortable in German, not just passable. Proper nouns and ritual terms should stay in transliteration with a short gloss.",
    quest_type: 'one_time',
    reward: 5500,
    hours: 15,
    deadlineDays: 14,
    remote: true,
    skills: ['german', 'translation', 'proofreading'],
    postedHoursAgo: 62,
    views: 71,
    applications: 2,
  },
  {
    id: 'a1000000-0000-4000-8000-00000000000d',
    hirer: '0a',
    title: 'Anchor our annual alumni dinner',
    description:
      "Roughly 180 guests, mixed ages, mostly alumni and their families. We need a confident bilingual anchor for about three hours: welcome, introducing four short speeches, running a quiz segment and keeping the evening moving.\n\nScript will be ready two days before. One rehearsal call. Dinner included, obviously.",
    quest_type: 'one_time',
    reward: 4500,
    hours: 5,
    deadlineDays: 11,
    place: ['Nagwa, Lanka, Varanasi', 25.285, 83.003],
    skills: ['anchoring', 'english', 'hindi'],
    postedHoursAgo: 34,
    views: 156,
    applications: 8,
  },
  {
    id: 'a1000000-0000-4000-8000-00000000000e',
    hirer: '0a',
    title: 'AutoCAD drawings for a two-floor house extension',
    description:
      "We have a hand-drawn plan from the mason and need proper drawings to submit for approval: floor plans for both levels, two elevations and one section, with dimensions and a title block.\n\nMeasurements are already taken and will be shared as photos of the sketch plus a measurement sheet. One site visit possible if you want to check anything.",
    quest_type: 'one_time',
    reward: 9000,
    hours: 22,
    deadlineDays: 16,
    place: ['Sunderpur, Varanasi', 25.27, 82.98],
    skills: ['autocad', 'cad'],
    postedHoursAgo: 70,
    views: 103,
    applications: 4,
  },
  {
    id: 'a1000000-0000-4000-8000-00000000000f',
    hirer: '02',
    title: 'Weekend tabla accompanist for our rooftop classical evenings',
    description:
      "Every Saturday we host a small classical music evening for guests on the rooftop — usually a sitar or vocal performer who needs accompaniment. Audience of 20 to 30, informal.\n\nTeen taal and jhaptaal comfortably, ability to follow an unfamiliar performer. Paid per evening, ongoing. Instrument available on site if you prefer not to carry yours.",
    quest_type: 'weekly',
    status: 'assigned',
    reward: 3000,
    hours: 4,
    deadlineDays: 3,
    place: ['Assi Ghat rooftop, Varanasi', 25.2877, 83.006],
    skills: ['music'],
    postedHoursAgo: 96,
    views: 134,
    applications: 6,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000010',
    hirer: '04',
    title: 'Record 40 short chemistry explainer videos',
    description:
      "Class 12 organic chemistry, one concept per video, 4 to 6 minutes each. You explain on a tablet or whiteboard; we handle the editing and thumbnails.\n\nScript outline provided. Recorded in our Sigra studio, flexible slots. Paid on delivery in batches of ten.",
    quest_type: 'part_time',
    status: 'completed',
    reward: 12000,
    hours: 45,
    deadlineDays: -6,
    place: ['Sigra, Varanasi', 25.32, 82.995],
    skills: ['chemistry-tutoring', 'video-editing'],
    postedHoursAgo: 400,
    views: 289,
    applications: 12,
  },
]

export const DEMO_QUESTS: QuestWithRelations[] = SEEDS.map((s) => {
  const hirer = P.get(s.hirer) ?? DEMO_PROFILES[0]
  return {
    id: s.id,
    hirer_id: hirer.id,
    title: s.title,
    description: s.description,
    quest_type: s.quest_type,
    status: s.status ?? 'open',
    reward_amount: s.reward,
    estimated_hours: s.hours ?? null,
    deadline: s.deadlineDays !== undefined ? days(s.deadlineDays) : null,
    is_remote: s.remote ?? false,
    location_label: s.place?.[0] ?? null,
    lat: s.place?.[1] ?? null,
    lng: s.place?.[2] ?? null,
    assigned_to: s.status === 'assigned' || s.status === 'completed' ? DEMO_PROFILES[10].id : null,
    views: s.views,
    is_flagged: false,
    created_at: hoursAgo(s.postedHoursAgo),
    updated_at: hoursAgo(s.postedHoursAgo),
    hirer,
    skills: tags(...s.skills),
    application_count: s.applications,
  }
})

export const DEMO_REVIEWS: Review[] = [
  {
    id: 'r1000000-0000-4000-8000-000000000001',
    quest_id: 'a1000000-0000-4000-8000-000000000010',
    reviewer_id: DEMO_PROFILES[3].id,
    reviewee_id: DEMO_PROFILES[10].id,
    rating: 5,
    comment:
      'Delivered all 40 videos two days early and re-recorded three of them without being asked when the audio was off. Would hire again immediately.',
    created_at: hoursAgo(120),
    reviewer: DEMO_PROFILES[3],
  },
  {
    id: 'r1000000-0000-4000-8000-000000000002',
    quest_id: 'a1000000-0000-4000-8000-00000000000f',
    reviewer_id: DEMO_PROFILES[1].id,
    reviewee_id: DEMO_PROFILES[11].id,
    rating: 5,
    comment: 'Read the room perfectly and covered for a performer who arrived late. Guests loved it.',
    created_at: hoursAgo(200),
    reviewer: DEMO_PROFILES[1],
  },
  {
    id: 'r1000000-0000-4000-8000-000000000003',
    quest_id: 'a1000000-0000-4000-8000-000000000001',
    reviewer_id: DEMO_PROFILES[0].id,
    reviewee_id: DEMO_PROFILES[10].id,
    rating: 4,
    comment: 'Good work and clean code. Took a day longer than planned but kept us updated throughout.',
    created_at: hoursAgo(340),
    reviewer: DEMO_PROFILES[0],
  },
]

export const DEMO_STATS: PlatformStats = {
  open_quests: DEMO_QUESTS.filter((q) => q.status === 'open').length,
  total_quests: DEMO_QUESTS.length,
  students: 312,
  hirers: 87,
  reward_pool: DEMO_QUESTS.filter((q) => q.status === 'open').reduce(
    (sum, q) => sum + q.reward_amount,
    0,
  ),
  completed: 64,
}

export function demoQuestById(id: string): QuestWithRelations | null {
  return DEMO_QUESTS.find((q) => q.id === id) ?? null
}

export function demoProfileById(id: string): PublicProfile | null {
  return DEMO_PROFILES.find((p) => p.id === id) ?? null
}

// ── The demo persona ────────────────────────────────────────────────────────
/*
 * Auth-gated pages (/dashboard, /profile/edit) would otherwise bounce to /login
 * in demo mode, which is the one mode guaranteed to work with no setup. So demo
 * mode gets a signed-in student: Aditi Raghavan, who the seed data already
 * assigns work to. `getSession()` still returns null — only the pages that
 * explicitly ask for `demoSession()` see her, and every write still refuses.
 */

/** Aditi Raghavan — CSE, year 3. Already the assignee on the seeded quests. */
export const DEMO_ME: PublicProfile = DEMO_PROFILES[10]

export const DEMO_ME_EMAIL = 'aditi.raghavan@itbhu.ac.in'

export function demoQuestsPostedBy(userId: string): QuestWithRelations[] {
  return DEMO_QUESTS.filter((q) => q.hirer_id === userId)
}

export function demoQuestsAssignedTo(userId: string): QuestWithRelations[] {
  return DEMO_QUESTS.filter((q) => q.assigned_to === userId)
}

/** A believable spread of outcomes: two waiting, one won, one turned down. */
const APPLICATION_SEEDS: [questIndex: number, status: Application['status'], hoursAgo: number, note: string][] =
  [
    [
      0,
      'pending',
      6,
      'I rebuilt the Technex registration site last year — same stack, and I handled the deploy myself. I can show you a staging link before you commit to anything.',
    ],
    [
      2,
      'pending',
      20,
      'I shoot on a Fuji X-T30 and edit in Lightroom. Happy to do a short unpaid test shoot of two dishes so you can judge the look first.',
    ],
    [
      4,
      'accepted',
      54,
      'I have done three of these before and I am comfortable working to a fixed brief. Available from Thursday onwards.',
    ],
    [
      6,
      'rejected',
      96,
      'Interested, though I should say up front that my Tuesdays are blocked until 4pm this term.',
    ],
  ]

export function demoApplicationsFor(userId: string): ApplicationWithRelations[] {
  return APPLICATION_SEEDS.map(([index, status, ago, note], i) => {
    const quest = DEMO_QUESTS[index] ?? DEMO_QUESTS[0]
    return {
      id: `c1000000-0000-4000-8000-00000000000${i + 1}`,
      quest_id: quest.id,
      student_id: userId,
      cover_note: note,
      status,
      created_at: hoursAgo(ago),
      student: DEMO_ME,
      phone: null,
      quest,
    }
  })
}
