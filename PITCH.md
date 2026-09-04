# GigNest — 3-minute stage pitch

Deck: `GigNest-pitch.pptx` (10 slides). The same notes are in PowerPoint's
speaker-notes pane, so you can read this from Presenter View.

**Pace:** ~430 words, ~145 words/minute. That is a *measured* pace, not a rushed one.
If you're running long, the two blocks you can cut are slide 6 (breadth) and slide 9
(roadmap) — everything else is load-bearing.

**If the judges only remember one line, make it this one:**
> Anyone can post. Only a verified IIT BHU student can claim — and that rule lives in
> the database, not in the interface.

---

## The script

### 1 · Title — *0:00*

> GigNest is live right now, at the URL on this slide. Open it on your phone while
> I talk; everything I'm about to describe is running.
>
> It's a marketplace where anyone can post paid work — and only a verified IIT BHU
> student can claim it.

*Say the URL out loud. Don't rush this slide — let them actually get their phones out.*

### 2 · Problem — *0:20*

> Two groups on this campus need each other and cannot connect.
>
> On one side, thousands of students with real skills and real hours between classes.
> Paid work reaches them through WhatsApp forwards, hostel notice boards, and luck.
>
> On the other side — two kilometres away — a café that needs a website. A parent who
> needs a physics tutor. A lab with twelve hundred handwritten forms to digitise.
>
> Both sides already exist. Neither has a front door.

### 3 · Solution — *0:45*

> GigNest is that door. Someone posts the work, sets a reward, drops a map pin —
> a one-time errand or a monthly commitment, both fit. Eighty-four skill tags make the
> board searchable.
>
> And then a student claims it. But only if their Google account ends in `itbhu.ac.in`.

### 4 · The moat — *1:05*  ← **the slide that wins the room**

> That last sentence is the whole company, so let me be precise about it.
>
> Most prototypes "restrict access" by hiding a button. Anyone with a browser console
> walks straight past that.
>
> Here the rule lives in three places. A Postgres trigger that refuses to save a student
> profile unless the Google-verified email matches. A row-level security policy that
> blocks the application at INSERT, inside the database. And a server guard that exists
> only to show a friendly error message.
>
> You cannot curl your way in. The interface I built is copyable in a weekend. The trust
> layer is not.

*Slow down here. This is the answer to "what's your moat", delivered before they ask it.*

### 5 · It's live — *1:35*

> This is not a mockup. Fourteen routes, deployed. Eighty-four skill tags. Five job
> formats, one-time through monthly. Built in one weekend.
>
> And it runs with no database attached — which means dead wifi cannot kill this demo.

### 6 · Breadth — *1:55*

> It also isn't a tutoring app. On the board right now: a sixty-second reel for a
> ghat-side homestay. A weekend tabla accompanist. LaTeX proofreading on a ninety-page
> thesis. German translation.

### 7 · Why one campus — *2:10*

> Why start with one campus? Because the institute email does our verification for free
> — no KYC needed on day one. Dense supply inside two square kilometres, demand within
> walking distance.
>
> And adding IIT Kanpur is one line of code. Every institute in India has the same domain
> structure, so the gate travels with us.

### 8 · Money — *2:30*

> Revenue: five to eight percent on completed gigs, featured placement during fest week
> and placement season, and a paid verification badge for hirers.
>
> Straight with you — there is no payment rail today. Money changes hands off-platform.
> Escrow is the next build, not a footnote.

*Volunteering this weakness buys you credibility for everything else you claimed.*

### 9 · Next 30 days — *2:45*

> Thirty days from now: Google sign-in switched on, first fifty students, twenty hirers,
> UPI escrow.

### 10 · The ask — *2:55*

> Open to post. Exclusive to claim.
>
> What I want from this room: the first fifty student sign-ups — and three people willing
> to post real work on Monday.

*Stop talking. Let the URL sit on screen.*

---

## Q&A prep

**"Why wouldn't they just use WhatsApp?"**
They already do, and it's why the market is invisible. A WhatsApp group has no search, no
skill matching, no ratings, and no way to verify the person replying is who they say. The
board makes the same demand *addressable*.

**"Can't Fiverr or Internshala do this tomorrow?"**
They can build the UI tomorrow. They can't build the trust — an `@itbhu.ac.in` gate only
means something to the people who value it, and a global platform can't be exclusive to
one campus without breaking its own model. Our constraint *is* the product.

**"How is the email gate actually secure?"**
It isn't a checkbox on a form. Google verifies mailbox ownership; the database then refuses
to write a student profile whose verified address doesn't match the domain. Even if you
bypassed the entire frontend and hit the API directly, Postgres rejects the row.

**"What if a hirer doesn't pay?"**
Today, nothing stops that — I'm not going to pretend otherwise. Two things fix it: escrow
(next build), and the ratings system, which is already in the schema and works both ways.
A hirer who doesn't pay stops getting applications.

**"How do you get the first fifty users?"**
The supply side is one hostel WhatsApp broadcast away, which is exactly why demand comes
first. Twenty real gigs posted before launch, and the students arrive on their own.

**"Safety — students meeting strangers?"**
Contact details are hidden until the hirer accepts an application, so nobody's phone number
is public on the board. The Aadhaar-backed hirer badge on the roadmap is the next step.

**"What have you actually built vs. planned?"**
Built and deployed: the board, search and tags, map view, applications, the student gate,
contact reveal, ratings, and a password-gated admin panel. Not built: payments, and Google
sign-in is written but not switched on. Anything on the roadmap slide is honestly a plan.

---

## Stage checklist

- [ ] Open `questboard-sooty.vercel.app` in a browser tab **before** you go up
      — yes, the *host* still says questboard. Only you can rename the Vercel
      project, and Vercel picks the new hostname itself, so I left the URL that
      actually works rather than guessing one. Rename it and the site is
      GigNest end to end; the URL on slide 1 comes from one constant.
- [ ] Phone hotspot ready as a backup — but say the demo-mode line if wifi dies anyway
- [ ] Presenter View on, so you get the notes without the audience seeing them
- [ ] Know slide 4 cold; it's the one they'll dig into
