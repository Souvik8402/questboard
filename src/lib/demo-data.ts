import type {
  Application,
  ApplicationWithRelations,
  Dispute,
  FeeWaiverStatus,
  MessageWithSender,
  PlatformStats,
  PublicProfile,
  GigWithRelations,
  Review,
  Skill,
  Thread,
  Verification,
} from './types'
import type { ApplierStats } from './badges'

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
const minsAgo = (n: number) => new Date(NOW - n * 60_000).toISOString()

// ── Hirers and appliers ─────────────────────────────────────────────────────
/*
 * "Applier" is the public word for whoever takes the work. Internally the role is
 * still `student | hirer | admin`, but since anyone may apply, a `hirer` row here
 * can perfectly well be an applier too — Rohit Verma below is exactly that, and
 * he is in the dataset on purpose so every screen has to cope with him.
 */
function person(
  id: string,
  full_name: string,
  role: PublicProfile['role'],
  rating: number,
  rating_count: number,
  department: string | null = null,
  year: number | null = null,
  verifiedHoursAgo: number | null = null,
): PublicProfile {
  return {
    id,
    full_name,
    avatar_url: null,
    role,
    rating,
    rating_count,
    department,
    year,
    id_verified_at: verifiedHoursAgo === null ? null : hoursAgo(verifiedHoursAgo),
    // Every demo profile has a shareable code, so the referral card is testable
    // on any of them once you're signed in as that person.
    referral_code: demoReferralCode(id),
  }
}

export const DEMO_PROFILES: PublicProfile[] = [
  person('d0000000-0000-4000-8000-000000000001', 'Anand Café, Limbdi Corner', 'hirer', 4.8, 14, null, null, 400),
  person('d0000000-0000-4000-8000-000000000002', 'Kashi Ghat Homestay', 'hirer', 4.6, 9, null, null, 620),
  person('d0000000-0000-4000-8000-000000000003', 'Dr. Meera Nair', 'hirer', 5.0, 6),
  person('d0000000-0000-4000-8000-000000000004', 'Sunrise Coaching Centre', 'hirer', 4.2, 21, null, null, 900),
  person('d0000000-0000-4000-8000-000000000005', 'Banarasi Threads', 'hirer', 4.4, 5),
  person('d0000000-0000-4000-8000-000000000006', 'AgriSense Labs', 'hirer', 4.9, 11, null, null, 300),
  // A student who posts work — students can hire too.
  person('d0000000-0000-4000-8000-000000000007', 'Technex Organising Team', 'student', 4.7, 18, 'Mechanical Engineering', 3, 210),
  person('d0000000-0000-4000-8000-000000000008', 'Prof. R. Shukla', 'hirer', 4.9, 7, null, null, 150),
  person('d0000000-0000-4000-8000-000000000009', 'Sarnath Tours & Travels', 'hirer', 4.1, 12),
  person('d0000000-0000-4000-8000-00000000000a', 'Ravindrapuri Residents Assn.', 'hirer', 4.5, 4),
  // Appliers. b1 is the demo persona; b4 is deliberately NOT a student, to prove
  // the marketplace is open to anyone.
  person('d0000000-0000-4000-8000-0000000000b1', 'Aditi Raghavan', 'student', 4.9, 8, 'Computer Science & Engineering', 3, 96),
  person('d0000000-0000-4000-8000-0000000000b2', 'Karthik Menon', 'student', 4.7, 5, 'Electronics Engineering', 2),
  person('d0000000-0000-4000-8000-0000000000b3', 'Sneha Pillai', 'student', 4.8, 22, 'Architecture', 4, 480),
  person('d0000000-0000-4000-8000-0000000000b4', 'Rohit Verma', 'hirer', 4.6, 9),
  person('d0000000-0000-4000-8000-0000000000b5', 'Farhan Qureshi', 'student', 4.5, 3, 'Civil Engineering', 2),
  person('d0000000-0000-4000-8000-0000000000b6', 'Ishita Bose', 'student', 5.0, 4, 'Chemical Engineering', 3, 60),
]

const P = new Map(DEMO_PROFILES.map((p) => [p.id.slice(-2), p]))

/** Look an applier up by the last two characters of their demo id. */
function who(key: string): PublicProfile {
  return P.get(key) ?? DEMO_PROFILES[0]
}

// ── Badge counts (item 6) ───────────────────────────────────────────────────
/*
 * With a real database these come from `count(gigs where assigned_to = id and
 * status = 'completed')` and `profiles.mentorships`. Hard-coded here so the
 * ladder is actually visible: one of each tier, plus Ishita who reached gold via
 * two paid mentorships rather than 30 gigs.
 */
export const DEMO_APPLIER_STATS: Record<string, ApplierStats> = {
  'd0000000-0000-4000-8000-0000000000b1': { completed: 12, mentorships: 0, referrals: 3 },
  'd0000000-0000-4000-8000-0000000000b2': { completed: 5, mentorships: 0, referrals: 0 },
  'd0000000-0000-4000-8000-0000000000b3': { completed: 31, mentorships: 1, referrals: 2 },
  'd0000000-0000-4000-8000-0000000000b4': { completed: 7, mentorships: 0, referrals: 1 },
  'd0000000-0000-4000-8000-0000000000b5': { completed: 4, mentorships: 0, referrals: 0 },
  'd0000000-0000-4000-8000-0000000000b6': { completed: 3, mentorships: 2, referrals: 0 },
  'd0000000-0000-4000-8000-000000000007': { completed: 9, mentorships: 0, referrals: 5 },
}

/** Skill tags per profile, so the "suggested appliers" match has something real
 *  to work with (item 7) and profile pages differ from one another. */
const PROFILE_SKILL_SLUGS: Record<string, string[]> = {
  'd0000000-0000-4000-8000-0000000000b1': ['web-development', 'frontend', 'ui-ux', 'figma', 'photography'],
  'd0000000-0000-4000-8000-0000000000b2': ['embedded', 'python', 'matlab', 'data-entry'],
  'd0000000-0000-4000-8000-0000000000b3': ['graphic-design', 'poster-design', 'figma', 'autocad', 'cad'],
  'd0000000-0000-4000-8000-0000000000b4': ['videography', 'video-editing', 'photography', 'delivery-pickup'],
  'd0000000-0000-4000-8000-0000000000b5': ['data-entry', 'excel', 'hindi', 'errands', 'event-setup'],
  'd0000000-0000-4000-8000-0000000000b6': ['chemistry-tutoring', 'jee-coaching', 'content-writing'],
  'd0000000-0000-4000-8000-000000000007': ['event-management', 'event-setup', 'social-media', 'anchoring'],
}

export function demoProfileSkills(profileId: string): Skill[] {
  const slugs = PROFILE_SKILL_SLUGS[profileId] ?? ['web-development', 'frontend', 'photography', 'figma']
  return tags(...slugs)
}

// ── Gigs ──────────────────────────────────────────────────────────────────
interface GigSeed {
  id: string
  hirer: string
  title: string
  description: string
  gig_type: GigWithRelations['gig_type']
  status?: GigWithRelations['status']
  reward: number
  hours?: number
  deadlineDays?: number
  remote?: boolean
  place?: [label: string, lat: number, lng: number]
  skills: string[]
  postedHoursAgo: number
  views: number
  applications: number
  /** First-come-first-served review queue (item 11). */
  urgent?: boolean
  /** Two-character key into DEMO_PROFILES for an assigned/completed gig. */
  assignee?: string
}

const SEEDS: GigSeed[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    hirer: '01',
    title: "Rebuild our café website before the Diwali rush",
    description:
      "We are a 30-seat café just outside the campus gate. Our current site is a single JPEG of the menu from 2019. We want a proper responsive page: menu with prices, photo gallery, a map, opening hours and a WhatsApp order button.\n\nThe design is already done in Figma — we just need someone to build it well and deploy it. No backend needed. You will get the Figma file, all photos and copy on day one.",
    gig_type: 'one_time',
    reward: 200,
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
    gig_type: 'one_time',
    reward: 300,
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
    gig_type: 'weekly',
    reward: 1500,
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
    gig_type: 'one_time',
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
    gig_type: 'monthly',
    reward: 2500,
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
    gig_type: 'part_time',
    reward: 750,
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
    gig_type: 'one_time',
    reward: 2500,
    hours: 8,
    deadlineDays: 2,
    remote: true,
    urgent: true,
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
      "We need 8 people on the registration desks across the two main days of the fest. Checking IDs, handing out badges and kits, pointing people to the right hall, keeping the queue moving.\n\n9am–6pm both days with rotating breaks. Lunch and a fest tee included. Good first gig if you have not done one before — no experience needed, just show up on time.",
    gig_type: 'one_time',
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
    gig_type: 'internship',
    reward: 15000,
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
    gig_type: 'one_time',
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
    gig_type: 'weekly',
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
    gig_type: 'one_time',
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
    gig_type: 'one_time',
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
    gig_type: 'one_time',
    status: 'in_progress',
    assignee: 'b1',
    reward: 7000,
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
    gig_type: 'weekly',
    status: 'assigned',
    assignee: 'b2',
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
    gig_type: 'part_time',
    status: 'completed',
    assignee: 'b1',
    reward: 12000,
    hours: 45,
    deadlineDays: -6,
    place: ['Sigra, Varanasi', 25.32, 82.995],
    skills: ['chemistry-tutoring', 'video-editing'],
    postedHoursAgo: 400,
    views: 289,
    applications: 12,
  },
  // ── Posted by the demo persona, so /dashboard has a hirer side too ─────────
  {
    id: 'a1000000-0000-4000-8000-000000000011',
    hirer: 'b1',
    title: 'Fix a broken deploy on my portfolio site — needed today',
    description:
      "My portfolio has been returning a 500 on the live URL since I merged a branch this morning, and I have an interview tomorrow where they will click it. Next.js on Vercel, the build passes locally.\n\nI will share the repo and the Vercel logs. If you can find it in an hour, great — if it turns out to be bigger than that, tell me and we will talk. Marked urgent, so the first person who applies gets reviewed first.",
    gig_type: 'one_time',
    reward: 1500,
    hours: 3,
    deadlineDays: 1,
    remote: true,
    urgent: true,
    skills: ['web-development', 'devops', 'frontend'],
    postedHoursAgo: 2,
    views: 47,
    applications: 4,
  },
  {
    id: 'a1000000-0000-4000-8000-000000000012',
    hirer: 'b1',
    title: 'Shoot a two-minute walkthrough video of my final-year project',
    description:
      "I have built a working prototype and need a clean two-minute video for my project submission and my portfolio: a few angles of the hardware, screen recordings cut in, and my voiceover on top.\n\nI will write and record the script. I need someone who can shoot it properly and edit it so it does not look like a phone video. Half a day in the department lab.",
    gig_type: 'one_time',
    status: 'assigned',
    assignee: 'b4',
    reward: 2200,
    hours: 6,
    deadlineDays: 5,
    place: ['IIT BHU Dept. of CSE', 25.2669, 82.9906],
    skills: ['videography', 'video-editing'],
    postedHoursAgo: 58,
    views: 39,
    applications: 5,
  },
]

export const DEMO_GIGS: GigWithRelations[] = SEEDS.map((s) => {
  const hirer = P.get(s.hirer) ?? DEMO_PROFILES[0]
  const isTaken = s.status === 'assigned' || s.status === 'in_progress' || s.status === 'completed'
  return {
    id: s.id,
    hirer_id: hirer.id,
    title: s.title,
    description: s.description,
    gig_type: s.gig_type,
    status: s.status ?? 'open',
    reward_amount: s.reward,
    estimated_hours: s.hours ?? null,
    deadline: s.deadlineDays !== undefined ? days(s.deadlineDays) : null,
    is_remote: s.remote ?? false,
    location_label: s.place?.[0] ?? null,
    lat: s.place?.[1] ?? null,
    lng: s.place?.[2] ?? null,
    assigned_to: isTaken ? who(s.assignee ?? 'b1').id : null,
    views: s.views,
    is_flagged: false,
    is_urgent: s.urgent ?? false,
    created_at: hoursAgo(s.postedHoursAgo),
    // An assigned or completed gig moved recently; an open one has not moved
    // since it was posted. The dispute window reads this, so it matters.
    updated_at: isTaken ? hoursAgo(Math.min(s.postedHoursAgo, 14)) : hoursAgo(s.postedHoursAgo),
    hirer,
    skills: tags(...s.skills),
    application_count: s.applications,
  }
})

export const DEMO_REVIEWS: Review[] = [
  {
    id: 'r1000000-0000-4000-8000-000000000001',
    gig_id: 'a1000000-0000-4000-8000-000000000010',
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
    gig_id: 'a1000000-0000-4000-8000-00000000000f',
    reviewer_id: DEMO_PROFILES[1].id,
    reviewee_id: DEMO_PROFILES[11].id,
    rating: 5,
    comment: 'Read the room perfectly and covered for a performer who arrived late. Guests loved it.',
    created_at: hoursAgo(200),
    reviewer: DEMO_PROFILES[1],
  },
  {
    id: 'r1000000-0000-4000-8000-000000000003',
    gig_id: 'a1000000-0000-4000-8000-000000000001',
    reviewer_id: DEMO_PROFILES[0].id,
    reviewee_id: DEMO_PROFILES[10].id,
    rating: 4,
    comment: 'Good work and clean code. Took a day longer than planned but kept us updated throughout.',
    created_at: hoursAgo(340),
    reviewer: DEMO_PROFILES[0],
  },
]

export const DEMO_STATS: PlatformStats = {
  open_gigs: DEMO_GIGS.filter((q) => q.status === 'open').length,
  total_gigs: DEMO_GIGS.length,
  students: 312,
  hirers: 87,
  reward_pool: DEMO_GIGS.filter((q) => q.status === 'open').reduce(
    (sum, q) => sum + q.reward_amount,
    0,
  ),
  completed: 64,
}

export function demoGigById(id: string): GigWithRelations | null {
  return DEMO_GIGS.find((q) => q.id === id) ?? null
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

/** Aditi Raghavan — CSE, year 3. Already the assignee on the seeded gigs. */
export const DEMO_ME: PublicProfile = DEMO_PROFILES[10]

export const DEMO_ME_EMAIL = 'aditi.raghavan@itbhu.ac.in'

export function demoGigsPostedBy(userId: string): GigWithRelations[] {
  return DEMO_GIGS.filter((q) => q.hirer_id === userId)
}

export function demoGigsAssignedTo(userId: string): GigWithRelations[] {
  return DEMO_GIGS.filter((q) => q.assigned_to === userId)
}

/** A believable spread of outcomes: two waiting, one won, one turned down. */
const APPLICATION_SEEDS: [gigIndex: number, status: Application['status'], hoursAgo: number, note: string][] =
  [
    [
      0,
      'pending',
      6,
      'I rebuilt the Technex registration site last year — same stack, and I handled the deploy myself. I can show you a staging link before you commit to anything.',
    ],
    [
      9,
      'pending',
      20,
      'I work in Figma and can keep the eight slides on one grid so they read as a set. Happy to do the first one and let you judge before I carry on with the rest.',
    ],
    [
      13,
      'accepted',
      54,
      'I have drawn two extensions like this for approval submissions and know what the office asks for. Available from Thursday onwards.',
    ],
    [
      5,
      'rejected',
      96,
      'Interested, though I should say up front that my Tuesdays are blocked until 4pm this term.',
    ],
  ]

export function demoApplicationsFor(userId: string): ApplicationWithRelations[] {
  return APPLICATION_SEEDS.map(([index, status, ago, note], i) => {
    const gig = DEMO_GIGS[index] ?? DEMO_GIGS[0]
    return {
      id: `c1000000-0000-4000-8000-00000000000${i + 1}`,
      gig_id: gig.id,
      student_id: userId,
      cover_note: note,
      status,
      created_at: hoursAgo(ago),
      student: DEMO_ME,
      gig,
    }
  })
}

// ── Applicants on the hirer's side ──────────────────────────────────────────
/*
 * `getGigApplications` used to return [] in demo mode, which left the hirer view
 * empty — and item 11's first-come-first-served queue is entirely a hirer view.
 * These are the people waiting, oldest first, which is the order the queue
 * depends on.
 */
const INBOUND: Record<string, [applier: string, hoursAgo: number, note: string][]> = {
  // The urgent one. Four people waiting; the hirer sees only Sneha until she is
  // approved or passed over.
  'a1000000-0000-4000-8000-000000000011': [
    [
      'b3',
      1.6,
      'I have hit this exact 500 before — it is almost always an env var that exists locally but was never added in Vercel, or a route that reads something at build time. Send me the build log and I will tell you which within ten minutes.',
    ],
    [
      'b5',
      1.2,
      'Free right now and can start immediately. I am better at the deployment side than the React side, so if it is a config problem I am your person.',
    ],
    [
      'b2',
      0.7,
      'Happy to take a look. I would want to reproduce the failing build first rather than guess, so give me half an hour before I commit to a fix.',
    ],
    [
      'b4',
      0.3,
      'I do this for two small businesses here. Not a student, but I have shipped plenty of Next apps — I can screen-share while I work if you want to watch.',
    ],
  ],
  // A normal, non-urgent gig: all three are shown side by side and the hirer
  // picks whoever they like.
  'a1000000-0000-4000-8000-000000000007': [
    [
      'b6',
      4,
      'I typeset my own department report in LaTeX and fixed a bibliography that had 60 broken keys. I will send you a compiled PDF of the first ten pages before you pay anything.',
    ],
    [
      'b3',
      2.5,
      'Comfortable in LaTeX and fast at this. One caveat: I can start only after 8pm tonight, which still leaves a full day before your deadline.',
    ],
    [
      'b1',
      1.1,
      'I have proofread two theses in this department and know the formatting the office insists on. Overleaf is fine for me.',
    ],
  ],
}

export function demoApplicantsFor(gigId: string): ApplicationWithRelations[] {
  const rows = INBOUND[gigId] ?? []
  return rows.map(([key, ago, note], i) => {
    const applier = who(key)
    return {
      id: `c2000000-0000-4000-8000-${gigId.slice(-4)}${String(i + 1).padStart(2, '0')}`,
      gig_id: gigId,
      student_id: applier.id,
      cover_note: note,
      status: 'pending' as Application['status'],
      created_at: hoursAgo(ago),
      student: applier,
      student_skills: demoProfileSkills(applier.id),
    }
  })
}

// ── Threads (item 5) ────────────────────────────────────────────────────────
/*
 * A thread exists per gig and only once someone is hired, which is exactly what
 * the RLS policy on `messages` enforces. All three below involve the demo
 * persona: one where she is the hirer, two where she was hired.
 */
const THREAD_SEEDS: [gigId: string, lines: [sender: string, minsAgo: number, body: string][]][] = [
  [
    // Aditi is the hirer here, Rohit Verma the person she hired.
    'a1000000-0000-4000-8000-000000000012',
    [
      ['b1', 2760, 'Hi Rohit — thanks for taking this on. Are you free Thursday afternoon? The lab is quiet after 3.'],
      ['b4', 2700, 'Thursday after 3 works. Is there a window in the room, or will I need to bring a light?'],
      ['b1', 2660, 'Two windows but they face north, so it is dim by 5. Bring the light to be safe.'],
      ['b4', 1500, 'Noted. I will bring one panel and a reflector. Send me the script whenever it is ready so I can plan the cuts.'],
      ['b1', 1440, 'Script is written, I will record the voiceover tonight and share both.'],
      ['b4', 95, 'Got the script — it is clear. One thought: the bit about the sensor would land better as a close-up than a wide shot. Shall I plan for that?'],
    ],
  ],
  [
    // Aditi was hired. In progress, so the dispute disclosure shows here too.
    'a1000000-0000-4000-8000-00000000000e',
    [
      ['0a', 3400, 'Sending the measurement sheet photos now. Let us know if any dimension is unreadable.'],
      ['b1', 3300, 'Received. Two of them are cut off at the edge — the bedroom width on sheet 2 and the staircase rise. Could you re-shoot those?'],
      ['0a', 3200, 'Re-shot and uploaded. Sorry about that.'],
      ['b1', 900, 'Both floor plans are done. Starting the elevations tomorrow — I should have everything with you two days before your deadline.'],
      ['0a', 700, 'Perfect, no rush. The approval office is closed till Monday anyway.'],
    ],
  ],
  [
    // Completed, kept as the record of a finished job.
    'a1000000-0000-4000-8000-000000000010',
    [
      ['04', 20000, 'Studio is free every weekday 4–7pm. Batch of ten first, then we pay and you carry on.'],
      ['b1', 19800, 'Works for me. I will do the first ten this week — aldehydes and ketones, in the order on your outline.'],
      ['04', 9000, 'First ten watched and approved. Payment sent. The audio on video 7 clips slightly at the start.'],
      ['b1', 8900, 'Re-recorded 7 and uploaded it. Nothing else should have that problem — I moved the mic.'],
      ['04', 400, 'All 40 in. Thank you, genuinely — the students are already using them. Leaving you a review now.'],
    ],
  ],
]

function threadMessages(gigId: string): MessageWithSender[] {
  const seed = THREAD_SEEDS.find(([id]) => id === gigId)
  if (!seed) return []
  return seed[1].map(([key, ago, body], i) => {
    const sender = who(key)
    return {
      id: `e1000000-0000-4000-8000-${gigId.slice(-4)}${String(i + 1).padStart(2, '0')}`,
      gig_id: gigId,
      sender_id: sender.id,
      body,
      created_at: minsAgo(ago),
      // Only the newest message from the other side is left unread, so the inbox
      // has exactly one dot rather than a wall of them.
      read_at: null,
      sender,
    }
  })
}

/** Every message in a gig's thread, oldest first. */
export function demoThreadMessages(gigId: string, viewerId: string): MessageWithSender[] {
  const all = threadMessages(gigId)
  return all.map((m, i) => ({
    ...m,
    read_at:
      m.sender_id === viewerId || i < all.length - 1 ? minsAgo(5) : null,
  }))
}

/** The inbox list: one row per gig the viewer is party to, newest activity first. */
export function demoThreads(viewerId: string): Thread[] {
  const rows: Thread[] = []
  for (const [gigId] of THREAD_SEEDS) {
    const gig = demoGigById(gigId)
    if (!gig) continue
    if (gig.hirer_id !== viewerId && gig.assigned_to !== viewerId) continue

    const messages = demoThreadMessages(gigId, viewerId)
    const other = gig.hirer_id === viewerId ? gig.assigned_to : gig.hirer_id
    rows.push({
      gig,
      counterparty: DEMO_PROFILES.find((p) => p.id === other) ?? null,
      last_message: messages[messages.length - 1] ?? null,
      unread: messages.filter((m) => m.sender_id !== viewerId && !m.read_at).length,
    })
  }
  return rows.sort((a, b) =>
    (b.last_message?.created_at ?? '').localeCompare(a.last_message?.created_at ?? ''),
  )
}

// ── Admin queues (items 2, 4, 8) ────────────────────────────────────────────

export interface DemoWaiver {
  profile: PublicProfile
  email: string
  status: FeeWaiverStatus
  requested_at: string
  note: string | null
}

/** The fee-waiver queue. Only an institute mailbox can reach 'pending' at all —
 *  the trigger in schema.sql refuses role='student' otherwise. */
export const DEMO_WAIVERS: DemoWaiver[] = [
  {
    profile: who('b5'),
    email: 'farhan.qureshi.civ23@itbhu.ac.in',
    status: 'pending',
    requested_at: hoursAgo(5),
    note: null,
  },
  {
    profile: who('b6'),
    email: 'ishita.bose.che22@itbhu.ac.in',
    status: 'pending',
    requested_at: hoursAgo(19),
    note: null,
  },
  {
    profile: who('b2'),
    email: 'karthik.menon.ece24@itbhu.ac.in',
    status: 'pending',
    requested_at: hoursAgo(44),
    note: null,
  },
  {
    profile: who('b1'),
    email: DEMO_ME_EMAIL,
    status: 'approved',
    requested_at: hoursAgo(110),
    note: 'ID card photo matched the name on the account. Waiver applied.',
  },
  {
    profile: who('b3'),
    email: 'sneha.pillai.arc21@itbhu.ac.in',
    status: 'approved',
    requested_at: hoursAgo(300),
    note: 'Verified in person at the desk.',
  },
]

export interface DemoVerification extends Verification {
  profile: PublicProfile
}

/*
 * The ID review queue. `last4` is all that is stored of the number — see
 * src/lib/kyc.ts. The four-digit tails below are made up; no real PAN or Aadhaar
 * appears anywhere in this repository.
 */
export const DEMO_VERIFICATIONS: DemoVerification[] = [
  {
    id: 'f1000000-0000-4000-8000-000000000001',
    profile_id: who('03').id,
    profile: who('03'),
    kind: 'pan',
    name_on_id: 'MEERA NAIR',
    last4: '7412',
    status: 'pending',
    note: null,
    created_at: hoursAgo(3),
    decided_at: null,
  },
  {
    id: 'f1000000-0000-4000-8000-000000000002',
    profile_id: who('05').id,
    profile: who('05'),
    kind: 'aadhaar',
    name_on_id: 'Sushila Devi Weaves (proprietor: Sushila Devi)',
    last4: '2038',
    status: 'pending',
    note: null,
    created_at: hoursAgo(26),
    decided_at: null,
  },
  {
    id: 'f1000000-0000-4000-8000-000000000003',
    profile_id: who('09').id,
    profile: who('09'),
    kind: 'pan',
    name_on_id: 'SARNATH TOURS AND TRAVELS',
    last4: '5591',
    status: 'rejected',
    note: 'Name on the PAN is a firm, but the account was opened as an individual. Re-submit as the firm or send the proprietor’s own PAN.',
    created_at: hoursAgo(70),
    decided_at: hoursAgo(66),
  },
  {
    id: 'f1000000-0000-4000-8000-000000000004',
    profile_id: who('01').id,
    profile: who('01'),
    kind: 'pan',
    name_on_id: 'ANAND KUMAR SETH',
    last4: '9046',
    status: 'approved',
    note: null,
    created_at: hoursAgo(410),
    decided_at: hoursAgo(400),
  },
]

export interface DemoDispute extends Dispute {
  gig: GigWithRelations | null
  raiser: PublicProfile | null
}

export const DEMO_DISPUTES: DemoDispute[] = [
  {
    id: '01000000-0000-4000-8000-000000000001',
    gig_id: 'a1000000-0000-4000-8000-00000000000f',
    gig: demoGigById('a1000000-0000-4000-8000-00000000000f'),
    raised_by: who('b2').id,
    raiser: who('b2'),
    reason: 'not_paid',
    detail:
      'I played the last two Saturdays as agreed and have not been paid for either. The host says the payment was sent but I have nothing in my account, and I would rather not keep turning up without sorting this out.',
    status: 'open',
    resolution: null,
    created_at: minsAgo(38),
    resolved_at: null,
  },
  {
    id: '01000000-0000-4000-8000-000000000002',
    gig_id: 'a1000000-0000-4000-8000-000000000010',
    gig: demoGigById('a1000000-0000-4000-8000-000000000010'),
    raised_by: who('04').id,
    raiser: who('04'),
    reason: 'scope_changed',
    detail:
      'We agreed 40 videos of 4 to 6 minutes. Eleven of them came in under three minutes and skip the worked example, which is the part our students actually need.',
    status: 'resolved',
    resolution:
      'Both sides agreed on 11 re-records at no extra cost, with the deadline pushed by a week. Payment for the delivered batches released.',
    created_at: hoursAgo(300),
    resolved_at: hoursAgo(298),
  },
]

export function demoDisputesFor(gigId: string): Dispute[] {
  return DEMO_DISPUTES.filter((d) => d.gig_id === gigId)
}

/** The signed-in persona's own ID submissions, for /verify. */
export function demoVerificationsFor(userId: string): Verification[] {
  const mine = DEMO_VERIFICATIONS.filter((v) => v.profile_id === userId).map(
    ({ profile: _profile, ...v }) => v,
  )
  if (mine.length > 0) return mine

  // Aditi has one approved PAN on file, so /verify shows the settled state.
  return [
    {
      id: 'f1000000-0000-4000-8000-0000000000ff',
      profile_id: userId,
      kind: 'pan',
      name_on_id: 'ADITI RAGHAVAN',
      last4: '4471',
      status: 'approved',
      note: null,
      created_at: hoursAgo(200),
      decided_at: hoursAgo(196),
    },
  ]
}

// ── Badges (item 6) ─────────────────────────────────────────────────────────

/** Falls back to a modest record so every profile page has something to show. */
export function demoApplierStats(userId: string): ApplierStats {
  return DEMO_APPLIER_STATS[userId] ?? { completed: 2, mentorships: 0, referrals: 0 }
}

// ── Suggested appliers (item 7) ─────────────────────────────────────────────

/**
 * Same match as the live query: collect the tags this hirer keeps posting about,
 * then rank everyone who shares them by overlap and rating.
 */
export function demoSuggestedAppliers(
  hirerId: string,
  limit = 4,
): { profile: PublicProfile; shared: Skill[] }[] {
  const wanted = new Set(
    DEMO_GIGS.filter((g) => g.hirer_id === hirerId).flatMap((g) => g.skills.map((s) => s.id)),
  )
  if (wanted.size === 0) return []

  return Object.keys(PROFILE_SKILL_SLUGS)
    .filter((id) => id !== hirerId)
    .map((id) => ({
      profile: demoProfileById(id) ?? who(id.slice(-2)),
      shared: demoProfileSkills(id).filter((s) => wanted.has(s.id)),
    }))
    .filter((row) => row.shared.length > 0)
    .sort((a, b) => b.shared.length - a.shared.length || b.profile.rating - a.profile.rating)
    .slice(0, limit)
}

// ── Referrals (item 9) ──────────────────────────────────────────────────────

/** How many people signed up on this account's referral link. */
export function demoReferralCount(userId: string): number {
  return DEMO_APPLIER_STATS[userId]?.referrals ?? 0
}

/** Short, readable, and derived from the id the same way handle_new_user() does. */
export function demoReferralCode(userId: string): string {
  return userId.replace(/-/g, '').slice(0, 8).toUpperCase()
}

/** The token behind /verify/<token>. Fixed in demo mode so the link is testable. */
export const DEMO_VERIFY_TOKEN = '7f3c1d90-2b64-4a15-9e88-5c0a1b2d3e4f'
