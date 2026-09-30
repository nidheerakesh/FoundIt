# FoundIt — How the system is tested

Five suites. Three run without any cloud project; two drive a real browser.
Nothing here talks to the live Firebase project.

| Suite | Tests | What it proves | Needs |
|---|---|---|---|
| Unit — pure logic | 13 | Match and trust formulas, match fan-out decisions | nothing |
| Integration — Cloud Functions | 28 | Every trigger and callable, against real Firestore | Firestore emulator |
| Security rules | 44 | Every collection, from the client's side | Firestore emulator |
| Frontend smoke | 16 | The signed-out app in a real browser on live data | emulator + dev server |
| User journeys | ~30 checks | Three signed-in demo users driving every flow | Firestore + Auth emulators |

## 1. Unit tests — no emulator

```bash
cd functions && npm install && npm test
```

`src/scoring.js` (match score, trust score) and `src/fanout.js` (which
counterparts a new match is mirrored onto, and who gets told) are pure
functions with no Firebase dependency, so they are tested directly. This is
where the formulas in `SCORING.md` are pinned down — including that an adjacent
campus zone is worth exactly half an exact zone match.

## 2. Cloud Function integration tests

Start the Firestore emulator on its own. The full `firebase emulators:start`
also works when the machine can reach `firebase-public.firebaseio.com`; running
the jar directly avoids that dependency.

```bash
java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-*.jar \
  --host=127.0.0.1 --port=8080 &
cd functions && npm run test:triggers
```

The Functions emulator is not used. Each handler is invoked through its `.run()`
entry point with the event shape Firebase would deliver, so the trigger bodies
execute against real Firestore reads and writes:

- `onDocumentWritten` → `event.data = { before, after }`
- `onDocumentCreated` → `event.data = snapshot`
- `onCall` → `request = { data, auth }`

Covered: smart matching and its fan-out to **both** posters (FR-9, FR-20),
the claim workflow end to end (FR-10, FR-11), review aggregation (FR-18), the
two-party handshake including every rejection path (FR-15), flagging and
auto-hide at threshold (FR-19, FR-21), strikes, role guards (FR-22) and trust
recomputation.

## 3. Security rules tests

```bash
# same emulator as above
cd functions && npm run test:rules
```

Rules are an architectural layer here (ARCHITECTURE.md §8.3), so they are
tested from where an attacker sits: a client SDK with a forged identity. Every
server-owned field is probed — trust, role, strikes, item status, match score,
listing status — plus claim resolution, review gating, the flag queue,
notifications and chat.

Two things worth knowing if a test surprises you:

- `keeps(field)` compares **values**, so writing a field's existing value back
  is a legitimate no-op and is allowed. Only a real change is rejected.
- Subcollection rules do **not** inherit the parent document's gate. The
  participant check is repeated inside `chats/{id}/messages` for that reason.

## 4. Frontend smoke tests

```bash
java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-*.jar \
  --host=127.0.0.1 --port=8080 &
node scripts/seed-emulator.mjs     # the deterministic feed the assertions expect
npm --prefix web run dev &
npm --prefix web install && npm --prefix web run test:ui
```

`vite dev` points the client at the emulator, so this is the real app reading
real Firestore — not the mock fallback. It checks that the live feed renders
with denormalised poster data, that the tab/search/category/zone filters narrow
it, that a match badge appears on a paired report, that the Smart Match modal
opens, that every signed-out action prompts sign-in, and that the run produces
no uncaught page errors.

Set `CHROMIUM_PATH` if Playwright should use a system browser instead of its
own download.

## 5. Signed-in user journeys — demo accounts

Sign-in is Google-only in production, which a test cannot drive. Demo accounts
fill that gap: real Firebase email/password users created with
`emailVerified: true`, so **every security rule applies to them exactly as to a
student** — nothing about auth is bypassed.

```bash
# Firestore from the jar (the CLI's rules hot-reload makes a network call that
# fails offline and takes the emulator down with it), Auth from the CLI.
java -jar ~/.cache/firebase/emulators/cloud-firestore-emulator-*.jar \
  --host=127.0.0.1 --port=8080 &
firebase emulators:start --only auth --project foundit-demo &

# Load the real rules into the jar-run emulator
curl -X PUT "http://127.0.0.1:8080/emulator/v1/projects/foundit-demo:securityRules" \
  -H 'Content-Type: application/json' \
  --data "$(jq -n --rawfile r firestore.rules '{rules:{files:[{name:"firestore.rules",content:$r}]}}')"

export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
node scripts/seed-demo-users.mjs     # Riya, Arjun (students), Meera (moderator)
node scripts/seed-emulator.mjs       # feed owned by those accounts

echo 'VITE_DEMO_AUTH=true' > web/.env.local
npm --prefix web run dev
```

The sign-in modal then lists the three accounts. The project id must be
`foundit-demo` everywhere — it is what `web/src/lib/firebase.js` defaults to, and
accounts created under any other id are invisible to the app.

Journeys exercised: posting a report; claiming it, chatting, and the owner
reading the proof and approving; the full marketplace handshake (offer → buyer
confirms → seller confirms → sold); flagging and the moderator queue.

**Never set `VITE_DEMO_AUTH=true` on a real deployment.** The accounts' password
is in the source.

## Not covered

- **`setUserRole`'s happy path.** Its guards are tested, but the success path
  calls `getAuth().setCustomUserClaims`, which needs the Auth emulator.
- **Storage rules.** No image upload path is currently wired to the UI.
- **The AI module.** `web/src/lib/ai.js` degrades to deterministic fallbacks
  without an API key; those fallbacks are not yet under test.
