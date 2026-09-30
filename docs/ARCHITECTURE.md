# FoundIt — Software Architecture Document

> **Course**: Software Architecture (SEM4)
> **Team**: Nidhi Rakesh (Lead), Shenza K., Shanid P., Hadi M.
> **Institution**: IIIT Kottayam
> **Date**: September 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Feature Inventory](#2-feature-inventory)
3. [Technology Stack](#3-technology-stack)
4. [Architectural Style & Patterns](#4-architectural-style--patterns)
5. [System Architecture](#5-system-architecture)
6. [Data Architecture](#6-data-architecture)
7. [AI/ML Architecture](#7-aiml-architecture)
8. [Security Architecture](#8-security-architecture)
9. [API & Integration Design](#9-api--integration-design)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Design Decisions & Trade-offs](#11-design-decisions--trade-offs)
12. [Quality Attributes](#12-quality-attributes)
13. [Possible Viva Questions & Answers](#13-possible-viva-questions--answers)

---

## 1. Project Overview

**FoundIt** is a campus-scoped Lost & Found + Student Marketplace web application designed for verified university communities. It combines real-time item reporting, AI-powered matching, a Bayesian trust scoring system, and a two-party transaction handshake to create a safe, credible platform for recovering lost items and trading second-hand goods.

### Problem Statement

University campuses lack a unified, trustworthy platform for lost item recovery and peer-to-peer trading. Existing solutions (WhatsApp groups, notice boards) are unstructured, unverified, and prone to fraud.

### Solution

A web application with:
- **Verified-only access** (campus email gate)
- **AI-powered item matching** (lost ↔ found pairing)
- **Trust scoring** (Bayesian reputation system)
- **Moderation** (community flagging + auto-hide)
- **Real-time notifications** (server-pushed via Firestore)

---

## 2. Feature Inventory

### Core Features (Functional Requirements)

| # | Feature | Description | Architecture Pattern |
|---|---------|-------------|---------------------|
| F1 | Campus email auth | Email/password sign-up with domain restriction + email verification | Gateway pattern |
| F2 | Lost/Found reporting | Create, browse, filter reports with image upload | Repository + Observer |
| F3 | Student marketplace | Buy/sell/giveaway listings with price, condition, image | Repository + Observer |
| F4 | Smart matching | AI pairs lost items with found reports (5-factor scoring) | Strategy pattern |
| F5 | Trust scoring | Bayesian trust score (0-100) computed server-side | CQRS |
| F6 | Claim workflow | Submit claims → owner approves/rejects → item resolved | State machine |
| F7 | Two-party handshake | Both buyer+seller confirm before marking sold | Saga pattern |
| F8 | Review system | Ratings unlock only after completed transaction | Guard clause |
| F9 | Real-time notifications | Server-pushed alerts for matches, claims, deals, flags | Pub/Sub (Fan-out) |
| F10 | Community moderation | Flag content → auto-hide at threshold → moderator resolve | Chain of responsibility |
| F11 | Dark/light theme | Persistent theme toggle via localStorage + OS detection | Observer |
| F12 | Role-based access | Admin/moderator/student roles via Firebase custom claims | RBAC |

### AI/LLM Features (10 AI Functions)

| # | Feature | API/Model | Fallback Strategy |
|---|---------|-----------|-------------------|
| AI1 | Post auto-fill & polish | Gemini 1.5 Flash | Keyword-based category inference |
| AI2 | Natural language campus search | Gemini 1.5 Flash | Token overlap matching |
| AI3 | Ownership verification questions | Gemini 1.5 Flash | Category-based templates |
| AI4 | Image recognition (Vision) | Gemini 1.5 Flash (multimodal) | Generic placeholder |
| AI5 | Fraud/scam detection | Gemini 1.5 Flash | Rule-based risk scoring |
| AI6 | Similar item recommendations | Local Jaccard similarity | — (always local) |
| AI7 | Review sentiment analysis | Gemini 1.5 Flash | Regex-based sentiment |
| AI8 | Weather-aware lost item alerts | OpenMeteo API (free) | Static advice |
| AI9 | Description enhancer (SEO) | Gemini 1.5 Flash | — (returns null) |
| AI10 | Match explanation | Gemini 1.5 Flash | Template-based explanation |

### External API Integrations

| API | Purpose | Auth | Cost |
|-----|---------|------|------|
| Google Gemini 1.5 Flash | LLM text + vision | API key | Free tier |
| OpenMeteo | Weather context | None | Free |
| Firebase Auth | Email auth + verification | Firebase SDK | Free tier |
| Cloud Firestore | Real-time NoSQL database | Firebase SDK | Free tier |
| Firebase Cloud Storage | Image uploads | Firebase SDK | Free tier |
| Firebase Cloud Functions | Serverless backend | Firebase SDK | Free tier |

---

## 3. Technology Stack

### Frontend

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| UI Framework | React | 19.2 | Component model, hooks, concurrent features |
| Build Tool | Vite | 7.x | Fast HMR, ES module native, minimal config |
| Icons | Lucide React | 0.544 | Tree-shakeable SVG icons |
| Styling | CSS Custom Properties | — | Zero-dependency theming, dark mode via `body.dark` class |
| Fonts | Nunito + Baloo 2 | Google Fonts | Rounded/friendly for campus audience |

### Backend

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Database | Cloud Firestore | — | Real-time listeners, offline-first, auto-scaling |
| Auth | Firebase Authentication | — | Email/password, email verification, custom claims |
| Storage | Firebase Cloud Storage | — | Image upload with security rules |
| Functions | Cloud Functions v2 | Node 22 | Event-driven triggers, onCall RPCs |
| Hosting | Vercel | — | Git-push deploy, global CDN, preview URLs |

### Development

| Tool | Purpose |
|------|---------|
| Firebase Emulator Suite | Local dev (auth, firestore, functions, storage) |
| Node.js test runner | Unit tests for scoring logic |
| Git + GitHub | Version control, PRs, branch protection |

---

## 4. Architectural Style & Patterns

### 4.1 Overall: Event-Driven Architecture (EDA)

The system is fundamentally event-driven. User actions write documents to Firestore; Cloud Functions react to document lifecycle events (create, update, delete) and propagate side effects.

```
User Action → Firestore Write → Cloud Function Trigger → Side Effects (trust, notifications, status)
```

This decouples the client from business logic: the client writes data, the server reacts.

### 4.2 CQRS (Command Query Responsibility Segregation)

- **Command path**: Client writes to Firestore collections (items, listings, reviews, flags, claims).
- **Query path**: Client reads denormalized feed documents with `onSnapshot` real-time listeners.
- **Separation**: Trust scores, match scores, and item statuses are computed server-side (Cloud Functions) and written back to documents. The client never writes these fields — Firestore Security Rules enforce this with `keeps()` guards.

### 4.3 Repository Pattern

The `web/src/lib/` directory contains data-access modules that encapsulate Firestore operations:

| Module | Collection(s) | Responsibility |
|--------|--------------|----------------|
| `feed.js` | lostFoundItems, listings | Subscribe, create, image upload |
| `claims.js` | claims (subcollection) | Submit, subscribe, resolve |
| `deals.js` | deals, reviews | Offer, confirm (callable), review |
| `notifications.js` | notifications | Subscribe, mark read |
| `flags.js` | flags | Create flag |
| `chat.js` | chats, messages | Real-time messaging |

### 4.4 Observer Pattern

Firestore `onSnapshot` listeners implement the Observer pattern:
- Feed items update in real-time across all connected clients.
- Notifications appear instantly when Cloud Functions write them.
- AuthContext observes `onAuthStateChanged` + user profile doc.

### 4.5 Strategy Pattern

The AI module (`ai.js`) uses the Strategy pattern for every AI function:
1. **Primary strategy**: Call Google Gemini API.
2. **Fallback strategy**: Deterministic local computation.
3. Selection is automatic based on API key availability.

```javascript
async function aiFunction(input) {
  if (geminiKeyAvailable) {
    const result = await callGemini(prompt);
    if (result) return parseJSON(result);
  }
  return deterministicFallback(input);  // Always works
}
```

### 4.6 State Machine Pattern

Items and claims follow state machines:

**Lost/Found Item States:**
```
open → matched → claimed → resolved
                         → rejected (back to open)
         → hidden (flagged)
```

**Listing States:**
```
active → deal_proposed → both_confirmed → sold → review_unlocked
       → hidden (flagged)
```

**Claim States:**
```
pending → approved → (triggers item resolution)
        → rejected
```

### 4.7 Saga Pattern (Two-Party Handshake)

The `confirmTransaction` Cloud Function implements a saga for marketplace deals:
1. Buyer calls `confirmTransaction` → records `buyerConfirmed: true`
2. Seller calls `confirmTransaction` → records `sellerConfirmed: true`
3. When both confirmed → atomically: set `status: 'sold'`, unlock reviews, notify both, recompute trust.

This prevents unilateral state changes and ensures both parties agree.

### 4.8 Pub/Sub (Fan-Out Notifications)

The `notify()` helper in Cloud Functions writes to the `notifications` collection. Each trigger fans out notifications to relevant users:

| Event | Notifies |
|-------|----------|
| New match found | Both item posters (the trigger fires for one side, `mirrorMatches` fans out to the other) |
| Claim submitted | Item owner |
| Claim resolved | Claimant |
| Deal confirmed | Buyer + seller |
| Flag threshold hit | All moderators |
| Review received | Ratee |

### 4.9 Middleware/Gateway Pattern

Firebase Security Rules act as a gateway/middleware layer:
- Every read/write passes through rules before reaching Firestore.
- Rules enforce authentication, email verification, ownership, and field-level guards.
- Server-side writes (Admin SDK) bypass rules — this is intentional for trust/status fields.

### 4.10 Facade Pattern

The `AuthContext` provides a facade over Firebase Auth + Firestore user profile:
```javascript
const { user, profile, isAuthed, isVerified, poster, refreshUser } = useAuth();
```
Components don't interact with Firebase directly — they consume a clean, merged identity.

---

## 5. System Architecture

### 5.1 Layer Diagram

```
┌────────────────────────────────────────────────┐
│                  CLIENT (React)                 │
├────────────────────────────────────────────────┤
│  Components    Auth Context    Hooks            │
│  (UI Layer)    (Identity)      (useFeed, etc.)  │
├────────────────────────────────────────────────┤
│         Data Access Layer (lib/*.js)            │
│  feed.js │ claims.js │ deals.js │ ai.js        │
│  notifications.js │ chat.js │ flags.js         │
├────────────────────────────────────────────────┤
│         Firebase SDK (firestore, auth, storage) │
└──────────────────┬─────────────────────────────┘
                   │ HTTPS / WebSocket
┌──────────────────▼─────────────────────────────┐
│              FIREBASE PLATFORM                  │
├────────────────────────────────────────────────┤
│  Auth          │ Firestore       │ Storage      │
│  (email/pass)  │ (real-time DB)  │ (images)     │
├────────────────────────────────────────────────┤
│           Cloud Functions v2 (Node 22)          │
│  suggestMatches │ onClaimCreated               │
│  onClaimResolved │ onReviewCreated             │
│  onFlagCreated │ resolveFlag                   │
│  confirmTransaction │ recomputeTrustScore      │
│  setUserRole                                   │
├────────────────────────────────────────────────┤
│           Security Rules (Gateway)              │
│  firestore.rules │ storage.rules                │
└────────────────────────────────────────────────┘
                   │
┌──────────────────▼─────────────────────────────┐
│           EXTERNAL APIs                         │
│  Google Gemini (LLM) │ OpenMeteo (Weather)      │
└────────────────────────────────────────────────┘
```

### 5.2 Component Diagram

```
App.jsx
├── Navbar (tabs, search, AI button, post button)
│   └── AccountMenu
│       └── NotificationBell (live Firestore subscription)
├── VerifyBanner (email verification prompt)
├── HeroFilters (location, category, weather)
│   └── WeatherBanner (OpenMeteo API)
├── ItemCard[] (feed grid)
│   └── TrustBadge
├── PostModal (create item + AI auto-fill + image upload)
├── AuthModal (login/register)
├── ProfileModal (view/edit profile + trust stats)
├── ClaimModal (submit/resolve claims)
├── ChatModal (real-time messaging)
├── DealModal (marketplace handshake + fraud detection)
├── FlagModal (community reporting)
├── SmartMatchModal (AI match + explanation + verification)
├── AIAssistantModal (natural language search)
├── HowItWorks (feature overview)
├── Toast (notifications)
└── DarkMode toggle (persistent)
```

---

## 6. Data Architecture

### 6.1 Firestore Collections

| Collection | Document Shape | Access Pattern |
|------------|---------------|----------------|
| `users/{uid}` | name, email, hostelOrDept, trustScore, trustTier, role, ratingAvg, ratingCount, resolvedCount, strikes, verified, photoURL | Read: public. Write: own profile fields only (rules guard trust/role) |
| `lostFoundItems/{id}` | type, title, description, category, keywords, location, imageURLs, status, postedBy, matchedWith, matchScore, trustScore | Read: public. Create: verified owner. Status/match: function-only |
| `lostFoundItems/{id}/claims/{cid}` | claimantUid, message, status, proofURLs | Create: verified. Approve/reject: item owner or mod |
| `listings/{id}` | title, description, price, priceType, condition, category, sellerUid, status, imageURLs, trustScore | Read: public. Create: verified. Status: function-only |
| `reviews/{id}` | raterUid, rateeUid, rating, comment, contextRef | Create: only after resolved exchange (guard via rules) |
| `notifications/{id}` | userId, type, message, contextRef, read, createdAt | Read: own. Write: functions only (client denied) |
| `flags/{id}` | targetRef, reporterUid, reason, status | Create: verified. Read: mods only |

### 6.2 Denormalization Strategy

Feed documents carry denormalized poster display fields (`reporterName`, `dept`, `trustScore`, `verified`) to avoid per-item user joins — standard Firestore fan-out pattern. The authoritative trust value lives on the `users` doc and is recomputed server-side.

### 6.3 Indexing

Firestore auto-indexes single-field queries. Composite indexes defined in `firestore.indexes.json` for:
- `notifications` → `userId` + `createdAt` (desc)
- `reviews` → `rateeUid` + `createdAt`

---

## 7. AI/ML Architecture

### 7.1 Design Principle: Graceful Degradation

Every AI feature follows a two-tier architecture:

```
          ┌─────────────┐
          │  API Key?    │
          └──────┬───────┘
         yes     │     no
    ┌────────────▼───┐  ┌──────────────────┐
    │ Gemini API     │  │ Local Fallback   │
    │ (LLM/Vision)   │  │ (Deterministic)  │
    └────────────────┘  └──────────────────┘
```

This ensures the app works without any API key (demo/dev mode) and upgrades to LLM when configured.

### 7.2 Scoring Algorithms

**Match Score (0-100)** — `functions/src/scoring.js`
```
matchScore = category(30%) + keywords(30%) + zone(20%) + recency(10%) + complementarity(10%)
```
- Category: exact match = 1.0
- Keywords: Jaccard coefficient over tokenized title+description
- Zone: adjacency matrix lookup
- Recency: exponential decay over 7 days
- Complementarity: lost↔found type check

**Trust Score (0-100)** — Bayesian-damped
```
trustScore = 50 (baseline)
  + ratingPoints (±40, Bayesian: (avgRating - 3) * (count / (count + 5)) * 40)
  + activityPoints (+25, log2(resolved + 1) * 5, capped)
  + verificationPoints (+10)
  + responsivenessPoints (+10, from response rate)
  + tenurePoints (+5, log of days since join)
  - penaltyPoints (strikes * 15)
```

### 7.3 Vision Pipeline

```
Image File → FileReader (base64) → Gemini 1.5 Flash Vision
    → JSON { title, category, description, color, brand, condition, tags }
    → Auto-fill PostModal form fields
```

---

## 8. Security Architecture

### 8.1 Authentication Flow

```
1. User registers with campus email (domain-gated)
2. Firebase sends verification email
3. User verifies → emailVerified = true
4. Auth context creates/updates users/{uid} profile doc
5. All create operations require isVerified()
```

### 8.2 Authorization Model (RBAC)

| Role | Capabilities |
|------|-------------|
| Student (default) | CRUD own items, submit claims/reviews, flag content |
| Moderator | Resolve flags, apply strikes, view all flags |
| Admin | Set user roles, all moderator powers |

Roles are stored as Firebase custom claims (`auth.token.role`) set via the `setUserRole` Cloud Function (admin-only callable).

### 8.3 Firestore Security Rules — Defense in Depth

```
Layer 1: signedIn() — must be authenticated
Layer 2: isVerified() — email must be verified
Layer 3: Ownership — uid matches document owner
Layer 4: keeps(field) — server-only fields cannot be changed by clients
Layer 5: Business rules — reviews only after resolved exchange
```

The `keeps(field)` helper ensures fields like `trustScore`, `matchScore`, `status`, `role`, `strikes` are immutable from the client. Only Cloud Functions (using Admin SDK, which bypasses rules) can modify them.

### 8.3.1 Document splitting — where field-level privacy comes from

Firestore rules authorise **whole documents**. There is no way to grant a read of
`title` while denying `description` on the same document: if a client may read the
document, it reads every field, including over the REST API.

Two things needed to be hidden from exactly the people who can see the card:

| Secret | Lives in | Readable by |
|---|---|---|
| A claimant's proof of ownership | `lostFoundItems/{id}/claims/{uid}` | poster, that claimant, moderators |
| The poster's own item description | `lostFoundItems/{id}/private/detail` | poster, moderators |

Both are solved the same way — move the field into its own document and write a
rule for that document. The item description matters because a claim is judged on
marks only the true owner should know. Public on the card, *"MEERA scratched on the
back"* is not evidence; it is a script a fraudster can read and recite.

**The cost, stated honestly.** `keywords` used to be derived from the description,
so leaving it public would have leaked the same words as a list. It is now built
from the title plus a closed vocabulary of generic terms — colour, material, kind
(`derivePublicTags`, `web/src/lib/feed.js`). Matching therefore compares coarse
attributes, not distinguishing detail. Measured against the seeded pairs this still
scores 74–87%, comfortably over the threshold of 50, while an unrelated control
scores 20%.

This is a genuine trade-off, not a free win: **hiding text and scoring on it cannot
both happen in the client**, because anything the matcher compares is readable by
whoever runs the matcher. Full-strength matching over private text needs trusted
compute — which is precisely what `suggestMatches` does with the Admin SDK, and the
reason it is a Cloud Function rather than client code.

### 8.3.2 Corroborated claims

A claim may cite the claimant's own report of the opposite type (`viaItemId`) —
"this found calculator is the one I reported lost" — and the finder sees its match
score beside the proof. The rule `get()`s the cited report and requires that it
belongs to the claimant and is of the opposite type, so the citation cannot be
forged by pointing at a stranger's matching post. The link is optional: somebody
who lost something but never posted it is still able to claim on proof alone.

### 8.4 Input Validation

- Campus email domain gate (configurable via `VITE_CAMPUS_DOMAIN`)
- Review rating constrained to 1-5 (rules)
- Rater cannot rate themselves (rules)
- Flag cannot target own content
- Price validated as non-negative number

---

## 9. API & Integration Design

### 9.1 Cloud Functions API Surface

| Function | Trigger Type | Input | Output |
|----------|-------------|-------|--------|
| `suggestMatches` | onDocumentWritten (lostFoundItems) | Document change | Writes matchedWith, matchScore and notifications onto **both** sides of the pair |
| `onClaimCreated` | onDocumentCreated (claims) | New claim doc | Notifies the item's poster that a claim is waiting |
| `onClaimResolved` | onDocumentWritten (claims) | Claim status change | Updates item status, user stats, trust, notifications |
| `onReviewCreated` | onDocumentCreated (reviews) | New review doc | Aggregates ratings, recomputes trust |
| `confirmTransaction` | onCall (HTTPS) | { listingId } | Two-party handshake, status update |
| `onFlagCreated` | onDocumentCreated (flags) | New flag doc | Increments flagCount, auto-hide at threshold |
| `resolveFlag` | onCall (HTTPS) | { flagId, action } | Resolve flag, optional strike |
| `recomputeTrustScore` | onCall (HTTPS) | { uid } | Recalculates trust from all signals |
| `setUserRole` | onCall (HTTPS) | { uid, role } | Sets custom claim + user doc |

### 9.2 External API Integration

**Gemini API** (REST)
```
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent
Headers: Content-Type: application/json
Body: { contents: [{ parts: [{ text }, { inlineData? }] }], systemInstruction? }
Response: candidates[0].content.parts[0].text → JSON.parse
```

**OpenMeteo API** (REST, no auth)
```
GET https://api.open-meteo.com/v1/forecast
  ?latitude=9.95&longitude=76.25
  &current=temperature_2m,rain,weathercode
  &timezone=Asia/Kolkata
Response: { current: { temperature_2m, rain, weathercode } }
```

---

## 10. Deployment Architecture

### 10.1 Environments

| Environment | Purpose | Backend |
|-------------|---------|---------|
| Local Dev | Development + testing | Firebase Emulator Suite (ports 5001, 8080, 9099, 9199) |
| Preview | PR previews | Vercel preview URL + Firebase staging |
| Production | Live campus use | Vercel (frontend) + Firebase (backend) |

### 10.2 CI/CD Pipeline

```
git push → Vercel auto-deploy
         → Build: cd web && npm install && npm run build
         → Output: web/dist (SPA with rewrites)
         → Preview URL on PR, production on main merge
```

Firebase backend deployed separately:
```
firebase deploy --only firestore:rules,functions,storage
```

### 10.3 Infrastructure

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Vercel    │────▶│  Firebase Auth   │     │  Gemini API │
│  (CDN/SSR)  │     │  Cloud Firestore │     │  (LLM)      │
│  web/dist   │────▶│  Cloud Storage   │     └─────────────┘
└─────────────┘     │  Cloud Functions │     ┌─────────────┐
                    └──────────────────┘     │ OpenMeteo   │
                                             │ (Weather)   │
                                             └─────────────┘
```

---

## 11. Design Decisions & Trade-offs

### D1: Firestore over PostgreSQL

**Decision**: NoSQL document database (Firestore) instead of relational database.

**Rationale**:
- Real-time listeners (`onSnapshot`) enable live feeds without polling or WebSockets.
- Offline-first capability (local cache persists during network loss).
- Schemaless documents fit the varying shapes of items, listings, and reviews.
- Free tier supports development and small-scale campus deployment.

**Trade-off**: No joins, no transactions across collections (mitigated by denormalization and Cloud Functions).

### D2: Server-Side Trust (CQRS) over Client-Side Computation

**Decision**: Trust scores computed exclusively by Cloud Functions, never by clients.

**Rationale**:
- Clients can be manipulated (browser DevTools).
- Trust is a security-critical value — a malicious client could set `trustScore: 100`.
- Firestore rules enforce `keeps('trustScore')` — any client write that changes it is rejected.

**Trade-off**: Trust updates are eventually consistent (trigger latency ~1-2s).

### D3: Strategy Pattern for AI with Fallbacks

**Decision**: Every AI feature has a deterministic fallback path.

**Rationale**:
- Gemini API key may not be configured (dev mode, demo, cost).
- API may be rate-limited or unavailable.
- Demo must work without any external dependencies.

**Trade-off**: Fallbacks are less accurate than LLM responses.

### D4: Denormalized Feed over Joins

**Decision**: Poster info (name, trust, verified) is copied onto each item document.

**Rationale**:
- Firestore has no native joins.
- A feed of 50 items would require 50 additional user-doc reads without denormalization.
- Real-time listeners on denormalized docs give instant rendering.

**Trade-off**: Poster info can become stale (mitigated by trust recompute triggers that update items).

### D5: Two-Party Handshake over Unilateral Completion

**Decision**: Both buyer and seller must confirm a transaction before it's marked `sold`.

**Rationale**:
- Prevents one party from falsely claiming a deal is complete.
- Reviews unlock only after both confirm — prevents review bombing.
- Implements the Saga pattern for distributed agreement.

**Trade-off**: Adds friction to the transaction flow.

### D6: Vercel over Firebase Hosting

**Decision**: Frontend deployed on Vercel instead of Firebase Hosting.

**Rationale**:
- Automatic preview deployments per PR.
- Superior build caching and global CDN.
- Native Vite/React support.
- Backend (functions, rules, storage) remains on Firebase.

**Trade-off**: Two deployment targets instead of one.

---

## 12. Quality Attributes

### 12.1 Performance

- **First paint**: < 1.5s (Vite tree-shaking, code-split by route)
- **Feed updates**: Real-time via Firestore WebSocket (no polling)
- **Image loading**: Lazy load + object-fit cover
- **Animation**: CSS-only with `prefers-reduced-motion` respect

### 12.2 Reliability

- **Offline-first**: Firestore SDK caches data locally
- **AI fallbacks**: Every LLM call has a deterministic fallback
- **Feed fallback**: Mock data renders if emulator/backend unreachable
- **Emulator guard**: Production build never connects to emulators

### 12.3 Security

- Campus email domain gate
- Email verification required for all write operations
- Server-only fields (trust, status, matches) guarded by `keeps()` rules
- Fraud detection on marketplace listings
- Flag-based community moderation with auto-hide

### 12.4 Maintainability

- Modular data layer (`lib/*.js` — one module per collection)
- Pure scoring functions (no Firebase deps — unit-testable)
- CSS custom properties design system (theme changes in one place)
- JSDoc typedefs in `types.js`

### 12.5 Scalability

- Firestore auto-scales reads/writes
- Cloud Functions scale to zero (no idle cost)
- Stateless frontend (CDN-served)
- Denormalized feed avoids N+1 query problem

---

## 13. Possible Viva Questions & Answers

### Architecture & Design Patterns

**Q1: What architectural style does FoundIt use?**
A: Event-Driven Architecture (EDA). User actions write to Firestore; Cloud Functions triggers react to document lifecycle events and propagate side effects (trust recomputation, notifications, status changes). This decouples the client from business logic.

**Q2: Explain the CQRS pattern in your application.**
A: Command path: clients write items, claims, reviews to Firestore. Query path: clients read denormalized feed docs via real-time listeners. The separation is enforced by Firestore rules — clients can write data fields but cannot write computed fields (trustScore, matchScore, status). Only Cloud Functions (server-side) write those fields.

**Q3: How does the Strategy pattern appear in your AI module?**
A: Each of the 10 AI functions has two strategies: (1) call Google Gemini API for high-quality results, (2) fall back to a deterministic local algorithm if the API key is unavailable or the call fails. The strategy is selected at runtime based on key availability, making the app work with or without external AI.

**Q4: What is the Saga pattern and where do you use it?**
A: The Saga pattern coordinates a multi-step distributed transaction. In our `confirmTransaction` Cloud Function, both buyer and seller must independently confirm a deal. The function records each confirmation and, only when both are true, atomically marks the listing as sold, unlocks reviews, and notifies both parties. If only one confirms, the transaction stays pending.

**Q5: Explain the Observer pattern in your app.**
A: Firestore `onSnapshot` implements the Observer pattern. When any client writes a new item, all connected clients observing the feed collection are automatically notified with the updated data. Similarly, `onAuthStateChanged` observes authentication state changes.

**Q6: How do you implement the Repository pattern?**
A: The `web/src/lib/` directory contains repository modules (feed.js, claims.js, deals.js, etc.) that encapsulate all Firestore operations. Components never call Firestore directly — they call repository functions like `addLostFound()`, `submitClaim()`, `subscribeFeed()`. This centralizes data access and makes it testable.

### Security

**Q7: How do you prevent a client from modifying their own trust score?**
A: Three layers of defense: (1) Firestore Security Rules use a `keeps(field)` helper that rejects any write where `trustScore` differs from the current value. (2) The client-side code never attempts to write trust fields. (3) Only Cloud Functions using the Admin SDK (which bypasses rules) can modify trust. This is the CQRS pattern — writes and computed state flow through different channels.

**Q8: What is the `keeps()` helper in your security rules?**
A: `keeps(field)` is a rule helper that returns `true` only if `request.resource.data[field] == resource.data[field]` — meaning the field's value didn't change. We apply it to server-only fields like trustScore, role, status, matchScore. Any client write that attempts to change these fields is rejected with PERMISSION_DENIED.

**Q9: How do you restrict access to campus-only users?**
A: Two levels: (1) Client-side: the `register()` function checks the email domain against `VITE_CAMPUS_DOMAIN` and throws before calling Firebase Auth. (2) Server-side: Firestore rules require `isVerified()` (email verification) for all create operations. Even if someone bypasses the client check, they can't write data without a verified campus email.

**Q10: How does your moderation system work?**
A: Chain of responsibility: (1) Any verified user can flag content with a reason. (2) The `onFlagCreated` trigger increments `flagCount` on the target. (3) At threshold (3 flags), the item is auto-hidden (`status: 'hidden'`). (4) Moderators are notified and can resolve flags, optionally applying strikes to the offender. (5) Strikes reduce trust score (15 points each) via `recomputeTrust`.

### Database & Data

**Q11: Why Firestore over a relational database?**
A: Three reasons: (1) Real-time listeners — `onSnapshot` pushes changes to all clients instantly without polling or WebSocket management. (2) Offline-first — the SDK caches data locally and syncs when reconnected. (3) Serverless scaling — no database server to provision. Trade-off: no joins, which we solve with denormalization.

**Q12: Explain your denormalization strategy.**
A: Feed documents carry poster display fields (name, dept, trustScore, verified) copied from the user doc. This avoids N+1 reads (50 items would otherwise need 50 user-doc reads). The authoritative trust value lives on the `users` doc. When trust changes, Cloud Functions can update the denormalized copies.

**Q13: How do you handle data consistency with denormalization?**
A: Eventually consistent. When a trust score changes (via Cloud Functions trigger), the denormalized values on items may briefly be stale. For our use case (campus app, not financial), this 1-2 second lag is acceptable. Critical operations (like claim resolution) use Firestore transactions for atomicity.

### AI/ML

**Q14: How does your smart matching algorithm work?**
A: Five-factor weighted scoring: Category match (30%), Keyword overlap via Jaccard coefficient (30%), Zone proximity using an adjacency matrix (20%), Temporal recency with exponential decay (10%), and Complementarity — lost must match with found (10%). Score is 0-100; items above threshold get matched.

**Q15: What is the Jaccard coefficient and where do you use it?**
A: Jaccard(A,B) = |A ∩ B| / |A ∪ B|. It measures set overlap between 0 and 1. We tokenize item titles and descriptions, remove stopwords, and compute Jaccard over the token sets. A score of 0.7 means 70% of tokens are shared — strong evidence the items are related.

**Q16: How does Gemini Vision work in your image upload?**
A: When a user uploads an image, we convert it to base64 using FileReader, send it to Gemini 1.5 Flash's multimodal endpoint with a prompt asking for title, category, description, color, brand, and condition. The response is parsed as JSON and auto-fills the form. If the API call fails, a generic placeholder is returned.

**Q17: How does your fraud detection work?**
A: Both rule-based and LLM-based. Rule-based: checks for unusually low prices in electronics, very short descriptions, pressure language ("urgent", "today only"), and low seller trust. LLM-based: sends the listing to Gemini for comprehensive analysis. Returns a risk level (low/medium/high), specific flags, and buyer recommendations.

**Q18: What is the Bayesian damping in your trust score?**
A: Raw average ratings are unreliable with few reviews (one 5-star review = 100% positive). Bayesian damping uses the formula: `(avgRating - 3) * (count / (count + k)) * weight` where k=5 is the prior strength. With 1 review, the rating influence is dampened to 1/6 of full weight. With 20 reviews, it's 20/25 = 80%. This prevents new users from having extreme trust scores.

### Deployment & DevOps

**Q19: Explain your local development setup.**
A: Firebase Emulator Suite runs locally (Auth port 9099, Firestore 8080, Functions 5001, Storage 9199). The app auto-connects to emulators in dev mode (`import.meta.env.DEV`). A seed script using Admin SDK populates demo data. This means developers never need Firebase credentials or internet access for development.

**Q20: How does your deployment pipeline work?**
A: Frontend: Git push to main triggers Vercel auto-deploy. Vercel runs `cd web && npm install && npm run build`, serves `web/dist` as a static SPA with catch-all rewrites. Backend: `firebase deploy --only firestore:rules,functions` deploys security rules and Cloud Functions separately.

### Testing

**Q21: How do you test the scoring algorithms?**
A: Pure function extraction. `functions/src/scoring.js` exports `jaccard()`, `matchScore()`, `trustScore()`, and `tierFor()` with zero Firebase dependencies. Six unit tests cover: Jaccard overlap, high-score matching pair, same-type rejection, new user trust baseline, strike impact, and score bounding (0-100). Tests run via Node.js built-in test runner.

**Q22: Why are scoring functions separated from Cloud Functions?**
A: Testability. Cloud Functions depend on Firebase Admin SDK and emulator environment, making them slow and complex to test. By extracting pure scoring logic into a separate module, we can test the math independently with fast, deterministic unit tests. The Cloud Functions import and call these pure functions.

### React & Frontend

**Q23: How does your dark mode implementation work?**
A: CSS custom properties define all colors in `:root`. The `body.dark` selector overrides all variables with dark values. A React state (`darkMode`) toggles the class. Persistence: `localStorage.getItem('foundit-theme')` on mount, `localStorage.setItem()` on change. Default: `window.matchMedia('(prefers-color-scheme: dark)')` for OS preference.

**Q24: Why React Context for auth instead of a state management library?**
A: Auth state is global but simple (user, profile, loading). React Context + `useAuth()` hook is sufficient. A library like Redux/Zustand would add complexity without benefit. The Context wraps `onAuthStateChanged` (Firebase) + `onSnapshot` (user profile doc) into a single reactive state.

**Q25: How do you handle real-time data updates?**
A: The `useFeed()` hook wraps `subscribeFeed()`, which creates two Firestore `onSnapshot` listeners (one for lostFoundItems, one for listings). Each listener fires on any collection change. The results are merged, sorted by timestamp, and emitted via callback. The hook manages loading/error states and a 2.5s timeout fallback to mock data.

---

## Appendix A: File Structure

```
FoundIt/
├── docs/
│   ├── ARCHITECTURE.md     (this file)
│   ├── SCORING.md          (trust + match formulas)
│   ├── TEAM-GUIDE.md       (team roles, data model, build phases)
│   └── GIT-GUIDE.md        (git workflow for beginners)
├── functions/
│   ├── index.js            (8 Cloud Functions)
│   └── src/
│       ├── scoring.js      (pure scoring algorithms)
│       └── scoring.test.js (6 unit tests)
├── web/
│   ├── index.html          (SPA entry + meta + fonts)
│   ├── src/
│   │   ├── App.jsx         (root component, all modal state)
│   │   ├── main.jsx        (React root + AuthProvider)
│   │   ├── index.css       (design system + dark mode + responsive)
│   │   ├── types.js        (JSDoc typedefs + collection constants)
│   │   ├── auth/
│   │   │   ├── AuthContext.jsx  (identity facade)
│   │   │   ├── AuthModal.jsx    (login/register form)
│   │   │   ├── AccountMenu.jsx  (navbar account dropdown)
│   │   │   ├── VerifyBanner.jsx (email verification prompt)
│   │   │   └── authApi.js       (Firebase Auth operations)
│   │   ├── components/
│   │   │   ├── Navbar.jsx           (navigation + search)
│   │   │   ├── HeroFilters.jsx      (hero + filters + weather)
│   │   │   ├── ItemCard.jsx         (feed card + image)
│   │   │   ├── PostModal.jsx        (create + AI auto-fill + image)
│   │   │   ├── ClaimModal.jsx       (claim workflow)
│   │   │   ├── ChatModal.jsx        (messaging)
│   │   │   ├── DealModal.jsx        (handshake + fraud detection)
│   │   │   ├── FlagModal.jsx        (community reporting)
│   │   │   ├── SmartMatchModal.jsx  (AI match + explanation)
│   │   │   ├── AIAssistantModal.jsx (NL campus search)
│   │   │   ├── ProfileModal.jsx     (user profile + trust stats)
│   │   │   ├── NotificationBell.jsx (live notification dropdown)
│   │   │   ├── WeatherBanner.jsx    (OpenMeteo weather)
│   │   │   ├── HowItWorks.jsx       (feature overview)
│   │   │   ├── TrustBadge.jsx       (trust display)
│   │   │   └── Toast.jsx            (toast notifications)
│   │   ├── lib/
│   │   │   ├── ai.js           (10 AI functions + Gemini client)
│   │   │   ├── feed.js         (feed CRUD + image upload)
│   │   │   ├── claims.js       (claim operations)
│   │   │   ├── deals.js        (deal + review operations)
│   │   │   ├── notifications.js (notification subscription)
│   │   │   ├── flags.js        (flag creation)
│   │   │   ├── chat.js         (real-time messaging)
│   │   │   ├── matching.js     (client-side match algorithm)
│   │   │   ├── trust.js        (trust tier display helpers)
│   │   │   └── firebase.js     (SDK init + emulator connect)
│   │   ├── hooks/
│   │   │   └── useFeed.js      (feed subscription hook)
│   │   └── data/
│   │       └── mockData.js     (fallback demo data)
│   └── scripts/
│       └── seed.mjs        (Admin SDK demo data seeder)
├── firestore.rules         (security rules)
├── storage.rules           (storage security rules)
├── firebase.json           (Firebase config + emulators + hosting)
├── vercel.json             (Vercel deployment config)
└── .firebaserc             (project ID: foundit-fcfcc)
```

---

## Appendix B: Design Pattern Summary

| Pattern | Where Used | Benefit |
|---------|-----------|---------|
| Event-Driven Architecture | Cloud Functions triggers | Decoupled business logic |
| CQRS | Client reads vs. server writes | Security + consistency |
| Repository | lib/*.js data modules | Encapsulated data access |
| Observer | Firestore onSnapshot | Real-time updates |
| Strategy | AI module (Gemini + fallback) | Graceful degradation |
| State Machine | Item/claim status flows | Predictable transitions |
| Saga | Two-party transaction handshake | Distributed agreement |
| Pub/Sub | Notification fan-out | Decoupled notifications |
| Gateway/Middleware | Firestore Security Rules | Defense in depth |
| Facade | AuthContext | Simplified identity API |
| RBAC | Custom claims + rules | Role-based access |
| Chain of Responsibility | Moderation pipeline | Escalating enforcement |
