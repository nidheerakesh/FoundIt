# Setting up the live demo

One-time setup that puts the three demo accounts and a populated campus on the
live project (`foundit-fcfcc`). It takes about ten minutes. Everything here
works on the free Spark plan.

## 1. Deploy the security rules and indexes

```bash
firebase deploy --only firestore:rules,firestore:indexes --project foundit-fcfcc
```

Without this, chat, claims and the marketplace fail with *Missing or
insufficient permissions*.

## 2. Turn on email/password sign-in

Firebase console → **Authentication** → **Sign-in method** → **Email/Password**
→ Enable.

## 3. Get a service account key

Firebase console → **Project settings** → **Service accounts** → **Generate new
private key**. Save it outside the repo, e.g. `~/foundit-key.json`. Never
commit it.

## 4. Create the accounts and seed the data

```bash
npm --prefix web install          # the seed scripts use web/'s firebase-admin
export GOOGLE_APPLICATION_CREDENTIALS=~/foundit-key.json
export DEMO_PASSWORD='pick-a-throwaway-password'

node scripts/seed-demo-users.mjs --project foundit-fcfcc
node scripts/seed-demo-data.mjs  --project foundit-fcfcc
```

Run `seed-demo-data.mjs` again at any time to put the demo back to its
starting state, for example between rehearsals. It only touches documents whose
id starts with `demo-`, so posts made by real users are left alone.
`--reset` removes the demo documents without re-seeding.

## 5. Show the demo sign-in buttons on Vercel

Vercel → project → **Settings** → **Environment Variables**:

| Name | Value |
|---|---|
| `VITE_DEMO_AUTH` | `true` |
| `VITE_DEMO_PASSWORD` | the same password as `DEMO_PASSWORD` |

Then redeploy (Deployments → ⋯ → Redeploy). The sign-in dialog now lists Riya,
Arjun and Meera.

Any `VITE_` variable ends up in the JavaScript the browser downloads, so anyone
can read this password. Use a throwaway one, and after the demo delete both
variables and redeploy.

## What the seed sets up

| Account | Ready to demo |
|---|---|
| **Riya Singh** (student) | Her lost water bottle shows **Review claims (1)**: Arjun found it. Read his proof, chat with him (a thread is already there), **Approve & mark returned**. She has an offer out on Arjun's cycle, so she can **Confirm deal**. She bought Meera's Arduino kit, so she can **Rate seller**. Unread notifications in her bell. |
| **Arjun Nair** (student) | His lost Dell charger matches Meera's found one (adjacent zones). After Riya confirms, he can **Confirm sale** on his cycle. |
| **Meera Das** (moderator) | Her lost calculator matches Riya's found one: **Claim this**, then Riya reviews it. Account menu → **Moderation queue** has a flagged scam listing. |

Also in the feed:
- 13 lost and found reports: 3 matching pairs and 2 already **Returned**.
- 10 marketplace listings, one of each kind: sale, free, rent, sold, flagged.
- Posts from three background students who have no login.

`node web/test/demo-data.mjs` plays each of these stories against the emulator
(see TESTING.md §6).
