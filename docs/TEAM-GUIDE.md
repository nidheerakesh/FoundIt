# FoundIt — Team Build Guide

How four people build this without stepping on each other, and without vibe-coding the parts that matter.

Put this file in the repo as `docs/TEAM-GUIDE.md`. It's a reference, not a ritual — read it once, come back to the tables.

Team & lanes (from the SRS):

| Person | Lane | Owns |
|---|---|---|
| **Nidhi** | Backend lead + integration | Data model, `types.ts`, security rules, Cloud Functions, **smart matching**, merge discipline |
| **Shenza** | Frontend lead | Shared UI kit, navigation shell, responsive + animation, L&F and marketplace **screens**, search/filter UI |
| **Shanid** | Auth & Admin | Auth flows, RBAC (custom claims + rules), moderation, admin analytics dashboard |
| **Hadi** | Marketplace + Comms + DevOps | Listing logic, transaction handshake, chat, notifications, deploy, CI, tests, docs |

> **Two assumptions to confirm and edit:**
> 1. **Timeline** — phases are written as *relative weeks*. Anchor them to your real semester calendar (submission date, mid-sem reviews). Keep **Phase 0 to ~4 days**, not two weeks — you know the over-planning trap.
> 2. **Vibe-coding line** — see the boundary table below. It's the proposed default. Move things across the line if you disagree, but decide it *as a team* on day one.

## 1. The one idea that makes a 4-person split work: freeze the contract first

In a Firebase app there's often no REST API — the client talks straight to Firestore. So "the API contract" is really **four shared artifacts**. Freeze a v1 of these in Phase 0 and everyone can build in parallel against them, even before anyone's logic is finished:

1. **The data model** — collection paths + document shapes (below).
2. **`types.ts`** — one shared file of TypeScript interfaces, imported by *both* frontend and Cloud Functions. This is what lets Shenza build screens against real shapes while Nidhi's functions are still stubs.
3. **Security rules** — who can read/write what (the real access boundary, not the UI).
4. **Callable-function signatures** — name + input shape + output shape for each Cloud Function, stubbed to return mock data on day one.

Rule: **nobody edits `types.ts`, security rules, or the Tailwind config without announcing it in the group chat.** These three files are merge-conflict magnets and drift silently. `types.ts` changes route through Nidhi.

## 2. Data model (v1 — review and freeze in Phase 0)

Firestore collections. This is a starting point deliberately concrete enough to argue with; don't design it from scratch, edit *this*.

```
users/{uid}
  name, email, hostelOrDept, contactPreference, photoURL
  role: 'user' | 'moderator' | 'admin'      // guest = unauthenticated, not stored
  status: 'active' | 'suspended' | 'banned'
  verified: boolean                          // campus email confirmed
  ratingAvg: number, ratingCount: number
  resolvedCount: number, medianReplyMins: number, strikes: number
  trustScore: number                         // 0–100, computed server-side (see SCORING.md)
  trustTier: 'low' | 'neutral' | 'trusted' | 'reliable' | 'star'
  createdAt

users/{uid}/watchlist/{watchId}
  targetType: 'item' | 'listing', targetId, createdAt

lostFoundItems/{itemId}
  type: 'lost' | 'found'
  title, description, category, keywords: string[]
  zoneId, geo?: {lat,lng}, lastSeenDate?      // lastSeenDate only for 'lost'
  imageURLs: string[]
  status: 'open' | 'matched' | 'claimed' | 'resolved'
  postedBy: uid, matchedWith: string[]        // candidate itemIds, written by matching fn
  createdAt

lostFoundItems/{itemId}/claims/{claimId}
  claimantUid, message, status: 'pending' | 'approved' | 'rejected', createdAt

listings/{listingId}
  title, description, category, keywords: string[]
  condition, priceType: 'sale' | 'free' | 'rent', price?: number
  imageURLs: string[]
  status: 'active' | 'sold' | 'archived'
  sellerUid, createdAt

chats/{chatId}
  participants: [uid, uid], contextType: 'item' | 'listing', contextRef
  lastMessage, lastMessageAt, createdAt

chats/{chatId}/messages/{msgId}
  senderUid, text, sentAt

reviews/{reviewId}
  raterUid, rateeUid, rating: number, comment, contextRef, createdAt

notifications/{notifId}
  userId, type, message, read: boolean, contextRef, createdAt

flags/{flagId}
  reporterUid, targetType: 'item'|'listing'|'user'|'chat', targetId
  reason, status: 'open'|'resolved', resolvedBy?, createdAt

categories/{categoryId}    // admin-managed reference data
campusZones/{zoneId}       // admin-managed reference data
```

**Cloud Functions** (the server-side logic that must stay off the client):

| Function | Trigger | Owner |
|---|---|---|
| `suggestMatches` | on `lostFoundItems` write | **Nidhi** (core) |
| `onClaimResolved` | on claim status change | Nidhi |
| `confirmTransaction` | callable, both-party handshake | Hadi |
| `setUserRole` | callable, admin-only → sets Auth custom claim | Shanid |
| `recomputeTrustScore` | on review write / claim resolve / report upheld / nightly | Shanid |
| `fanOutNotification` | helper, called by the above | Hadi |

Scoring formulas (Trust Score + Match Score) live in [SCORING.md](SCORING.md) — full detail, anti-gaming rules, and recompute triggers.

## 3. Ownership matrix

Hybrid split: Nidhi and Shenza are **horizontal leads** (all data / all UI kit); Shanid and Hadi own **vertical slices**. To stop the frontend from becoming a bottleneck, **Shenza builds the shared UI kit in Phase 0**, then each person builds their own module's screens on top of it.

| Area | Primary | Pairs with |
|---|---|---|
| Data model + `types.ts` | Nidhi | all (review + freeze) |
| Security rules | Nidhi | Shanid |
| UI kit / design system / nav shell | Shenza | all (consumers) |
| Repo, CI, emulator, deploy | Hadi | Nidhi |
| Auth, profiles, RBAC, custom claims | Shanid | Nidhi (rules) |
| Lost & Found **data + matching** | Nidhi | — |
| Lost & Found **screens** | Shenza | Nidhi (data hooks) |
| Marketplace **logic + transaction** | Hadi | — |
| Marketplace **listing/search UI** | Shenza | Hadi |
| Chat + notifications (data + UI) | Hadi | — |
| Moderation + flagging + admin dashboard | Shanid | — |
| Integration + merge discipline | Nidhi | Hadi (devops) |

The clean seam that unblocks everyone: **L&F = Nidhi's data + Shenza's screens; Marketplace = Hadi's logic + Shenza's search/listing UI.** Each pair agrees the data hook shape up front, then works independently.

## 4. The vibe-coding boundary

The point isn't "no AI." It's: **AI writes the scaffold; you write or fully rewrite the core; nobody merges a line they can't explain in the viva.** It's graded and there may be individual questioning — that's the real reason for the line.

**Own by hand — design it, understand every line:**

- **Nidhi:** the matching score (category match + keyword/token overlap + zone proximity + recency + lost↔found complementarity); the data model; the security-rules logic; the claim → resolve state machine.
- **Shanid:** the RBAC model (custom claims ↔ rules); auth edge cases (verification, reset); the moderation state machine; the **trust-score formula** (SCORING.md §1) and what the analytics actually compute.
- **Hadi:** the transaction handshake (both-confirm → sold → unlock review); the chat data model + real-time listeners; the notification fan-out.
- **Shenza:** information architecture + navigation; the search/filter query logic; the responsive breakpoint strategy; accessibility.

**Scaffold freely (generate, then review — never merge unread):**

CRUD form components, list/grid rendering, Tailwind styling, boilerplate Firestore read/write hooks, toasts/modals/inputs, form-validation wiring, repetitive admin tables, test scaffolds.

## 5. Build order

Estimates are relative — map to your calendar.

**Phase 0 — Foundation (~4 days, together).** Repo + folder structure + Firebase project + **Firestore emulator with seed data** (Hadi); data model + `types.ts` + rules skeleton (Nidhi, all review); auth scaffolding + role model decided (Shanid); UI kit — Button/Card/Modal/Input + nav shell + Tailwind config (Shenza). **Gate:** everyone can run the app locally against the emulator with seed data, auth works, `types.ts` is frozen at v1.

**Phase 1 — Vertical slices in parallel (~2–3 weeks).** Each person builds their module against frozen types + emulator + **stubbed callable functions** (return mock shapes) so no one waits on anyone. Nidhi: L&F data + `suggestMatches`. Shenza: L&F + marketplace screens on the UI kit. Shanid: auth/profile/admin screens. Hadi: listing CRUD + chat + transaction stub. **Gate:** every module works in isolation against the emulator.

**Phase 2 — Cross-cutting + integration (~2 weeks).** Wire notifications into matches / claims / chat / sold events; matching live end-to-end; moderation + flagging across items and listings; admin dashboard reads real data; **swap all mocks for live Firestore and turn off permissive dev rules.** **Gate:** a full user journey works end-to-end with real rules enforced.

**Phase 3 — Polish, test, deploy, demo (~1–2 weeks).** Responsive + a11y pass + animations (Shenza); error/empty/loading states; realistic demo dataset; deploy to Firebase Hosting + test on mobile browsers (Hadi); README + demo script; rehearse so **each person can speak to their module.**

## 6. Git workflow

- `main` is protected — no direct pushes.
- Feature branches: `feat/lostfound-matching`, `feat/auth-rbac`, `feat/marketplace-search`...
- Small PRs, merged **often** — not one big merge at the end. Every PR reviewed by Nidhi (lead) or the module-adjacent person.
- **Announce before editing shared files** (`types.ts`, security rules, Tailwind config). `types.ts` changes go through Nidhi.
- **No secrets in git.** `.env` and Firebase config keys are git-ignored and shared out-of-band. (Add `.env` to `.gitignore` on commit #1, before there's ever a key to leak.)

**Weekly merge day:** everyone merges to `main`, run the app together, each demos their slice, fix what broke. This is what the SRS's "regular integration, not a single merge" line actually looks like in practice.

**Definition of done** (per feature): works against real Firestore + emulator · security rules allow only intended access · responsive on mobile · no console errors · **owner can explain the code** · merged to `main`.

---

*Win condition is a working, deployed demo where each of you can defend your own module — not a perfect plan. Keep Phase 0 short and start building.*
