# FoundIt — Scoring Systems

Two independent scores drive the platform. Keep them separate — different owners, different jobs.

| Score | Job | Attached to | Owner |
|---|---|---|---|
| **Trust Score** | Credibility of a *person* — should I deal with them? | `users/{uid}` | Shanid (auth/trust) + Nidhi (rules) |
| **Match Score** | Likelihood two *items* are the same lost↔found pair | `lostFoundItems/{itemId}` | Nidhi (matching fn) |

---

## 1. Trust Score (credibility)

A single **0–100** number that answers "can I trust this student?" Shown as a number + tier badge on profiles, item cards, and chat headers.

### 1.1 Principle

- **Everyone starts neutral, not at zero.** A new verified student begins at **50**. You earn up above it and lose below it.
- **Only real, completed interactions move it.** No self-rating, no rating without a confirmed exchange. This is what stops gaming.
- **Recomputed server-side**, never trusted from the client. Stored on the user doc so reads are cheap.

### 1.2 Formula

```
trustScore = clamp(0, 100,
    50                       // neutral baseline
  + ratingPoints            // up to +40
  + activityPoints          // up to +25
  + verificationPoints      // up to +10
  + responsivenessPoints    // up to +10
  + tenurePoints            // up to +5
  - penaltyPoints           // strikes / upheld reports
)
```

**A. Rating points (−40 … +40)** — from ratings left after confirmed exchanges.

Use a **Bayesian (damped) average** so a user with 1 five-star rating isn't ranked above a user with 50 near-perfect ones:

```
adjustedAvg = (C * m + sumOfRatings) / (C + ratingCount)
   where m = 3.5 (prior mean),  C = 5 (prior weight)

ratingPoints = (adjustedAvg - 3.0) / 2.0 * 40     // maps 3.0→0, 5.0→+40, 1.0→−40
```

New users sit near the prior until they accumulate real ratings — no wild swings from one review.

**B. Activity points (0 … +25)** — completed, resolved actions (items returned + listings sold + valid found-item logs). Log-scaled so the first few count most and it can't be farmed to infinity:

```
activityPoints = min(25, round(12 * log10(1 + resolvedCount)))
// 1→3.6, 9→11.5, 99→24, capped 25
```

**C. Verification points (0 or +10)** — campus email verified. Binary. This is the entry gate to the trusted community.

**D. Responsiveness points (0 … +10)** — median chat first-reply time, bucketed:

```
< 1h  → +10 ,  < 6h → +7 ,  < 24h → +4 ,  < 72h → +1 ,  else 0
```

**E. Tenure points (0 … +5)** — account age, encourages sticking around:

```
tenurePoints = min(5, floor(accountAgeDays / 30))   // +1 per month, cap 5
```

**F. Penalty points (subtracted)** — accountability:

```
each upheld report / strike  → −15
active suspension            → −40 (and score frozen while suspended)
```

### 1.3 Tiers (badge shown next to the number)

| Score | Tier | Badge colour |
|---|---|---|
| 0–39 | ⚠️ Low Trust | rose |
| 40–59 | New / Neutral | slate |
| 60–74 | Trusted | cyan |
| 75–89 | Reliable | emerald |
| 90–100 | ⭐ Campus Star | amber |

A separate **Verified** tick (campus email) is always shown independently of tier — verification is a fact, trust is earned.

### 1.4 Anti-gaming rules (enforce in security rules + functions)

- **Rating requires a confirmed handshake.** `reviews` can only be written for a `contextRef` whose transaction/claim is `resolved`, and only by the counterparty. Enforced in rules.
- **One rating per exchange.** A second write to the same `(raterUid, contextRef)` is rejected.
- **Bayesian prior** damps low-sample scores (above).
- **New accounts can't rate for the first 24h** (verification + `tenurePoints` gate) to blunt sockpuppets.
- **Reciprocal-rating detection** (stretch): weight down rating rings where two accounts only ever rate each other.

### 1.5 Where it lives / when it recomputes

Recompute the score in a Cloud Function whenever an input changes, then write the number + breakdown back to the user doc:

| Trigger | Function |
|---|---|
| new review written | `recomputeTrustScore(rateeUid)` |
| claim/transaction resolved | `recomputeTrustScore(bothUids)` |
| report upheld / strike added | `recomputeTrustScore(targetUid)` |
| nightly (tenure/responsiveness drift) | scheduled `recomputeTrustScore` sweep |

---

## 2. Match Score (smart matching)

The **0–100** confidence that a `lost` item and a `found` item are the same object. Written by `suggestMatches` onto `matchedWith` candidates, surfaced in the Smart Match modal.

### 2.1 Formula

```
matchScore = round(100 * (
    0.30 * categoryMatch          // 1 if same category, else 0
  + 0.30 * keywordOverlap         // Jaccard overlap of keyword sets
  + 0.20 * zoneProximity          // same zone 1.0, adjacent 0.5, else 0
  + 0.10 * recency                // closer post dates score higher
  + 0.10 * complementarity        // one 'lost' + one 'found' = 1, else 0
))
```

- **keywordOverlap** = `|A ∩ B| / |A ∪ B|` over the two `keywords` arrays (Jaccard). Cheap, explainable, no ML needed for v1.
- **zoneProximity** uses an admin-defined adjacency map of `campusZones` (library ~ study block).
- **recency** = `1 - min(1, daysApart / 14)` — matches within 2 weeks weighted.
- Only surface candidates with `matchScore ≥ 60`; sort descending.

### 2.2 Owner-by-hand note

Per TEAM-GUIDE §4, Nidhi designs and can explain this formula in the viva — it is **not** vibe-coded. The weights above are a starting point; tune them against the seed data.

### 2.3 Stretch: image similarity

Add a `+ 0.15 * imageSimilarity` term later using an embedding compare (Firebase ML Kit / CLIP) on the item photos, re-normalising the weights. Out of scope for v1.

---

## 3. Data model additions

Add to the `users/{uid}` shape (extends TEAM-GUIDE §2):

```
users/{uid}
  ...existing (name, email, role, status)...
  verified: boolean               // campus email confirmed
  trustScore: number              // 0–100, computed server-side
  trustTier: 'low' | 'neutral' | 'trusted' | 'reliable' | 'star'
  trustBreakdown: {               // for transparency + debugging
    rating, activity, verification, responsiveness, tenure, penalty
  }
  ratingAvg: number, ratingCount: number
  resolvedCount: number           // returns + sales, drives activity points
  medianReplyMins: number
  strikes: number
  createdAt
```

New reference for reviewers: **`reviews` can only be created for a resolved `contextRef` by the counterparty** (rules gate — see §1.4).

New Cloud Function:

| Function | Trigger | Owner |
|---|---|---|
| `recomputeTrustScore` | on review write / claim resolve / report upheld / nightly | Shanid |

`suggestMatches` (already in TEAM-GUIDE) writes `matchScore` onto candidates.

---

## 4. Display summary

- **Item card** — poster's tier badge + Verified tick next to the name.
- **Profile** — big trust number, tier, and the breakdown bar (rating/activity/etc.).
- **Chat header** — counterparty tier + Verified tick, so you see who you're talking to.
- **Smart Match modal** — each candidate shows its `matchScore` as a % with a coloured ring.
