// Shared data shapes — the frozen contract (docs/TEAM-GUIDE.md §2).
// OWNER: Nidhi. Announce before editing; both frontend and functions import these.
// JSDoc typedefs (the codebase is JS) — gives editor autocomplete without a TS build.

/**
 * @typedef {'user'|'moderator'|'admin'} Role
 * @typedef {'active'|'suspended'|'banned'} AccountStatus
 * @typedef {'low'|'neutral'|'trusted'|'reliable'|'star'} TrustTier
 */

/**
 * @typedef {Object} User
 * @property {string} uid
 * @property {string} name
 * @property {string} email
 * @property {string} [hostelOrDept]
 * @property {string} [photoURL]
 * @property {Role} role
 * @property {AccountStatus} status
 * @property {boolean} verified
 * @property {number} ratingAvg
 * @property {number} ratingCount
 * @property {number} resolvedCount
 * @property {number} trustScore   // 0–100, computed server-side (docs/SCORING.md)
 * @property {TrustTier} trustTier
 * @property {number} createdAt     // epoch ms
 */

/**
 * @typedef {'lost'|'found'} LostFoundType
 * @typedef {'open'|'matched'|'claimed'|'resolved'} LostFoundStatus
 *
 * @typedef {Object} LostFoundItem
 * @property {string} id
 * @property {LostFoundType} type
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string[]} keywords
 * @property {string} zoneId
 * @property {string} [lastSeenDate]      // only for 'lost'
 * @property {string[]} imageURLs
 * @property {LostFoundStatus} status
 * @property {string} postedBy            // uid
 * @property {string[]} matchedWith       // candidate itemIds (written by matching fn)
 * @property {number} [matchScore]        // 0–100 best-candidate confidence
 * @property {number} createdAt
 */

/**
 * @typedef {'sale'|'free'|'rent'} PriceType
 * @typedef {'active'|'sold'|'archived'} ListingStatus
 *
 * @typedef {Object} Listing
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string[]} keywords
 * @property {string} condition
 * @property {PriceType} priceType
 * @property {number} [price]
 * @property {string[]} imageURLs
 * @property {ListingStatus} status
 * @property {string} sellerUid
 * @property {number} createdAt
 */

/** Firestore collection paths — never hard-code these strings elsewhere. */
export const COL = {
  users: 'users',
  lostFoundItems: 'lostFoundItems',
  listings: 'listings',
  chats: 'chats',
  reviews: 'reviews',
  notifications: 'notifications',
  flags: 'flags',
  categories: 'categories',
  campusZones: 'campusZones',
};

export {};
