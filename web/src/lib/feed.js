// Feed data layer — reads/writes lostFoundItems + listings, maps them to the
// card shape the UI already renders. OWNER: Nidhi (data) + Shenza (card shape).
//
// Note: poster display fields (reporterName, dept, location, verified, trustScore)
// are denormalized onto each doc so the feed renders without per-item user joins —
// standard Firestore feed pattern. The authoritative trust value still lives on the
// user doc and is recomputed server-side (docs/SCORING.md).
import {
  collection, doc, addDoc, setDoc, getDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COL } from '../types';

const PRICE_TO_LISTING = { sale: 'Sell', free: 'Giveaway', rent: 'Rent' };
const LISTING_TO_PRICE = { Sell: 'sale', Giveaway: 'free', Rent: 'rent' };

function timeAgo(ms) {
  if (!ms) return 'Just now';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

const createdMs = (d) => (d?.createdAt?.toMillis ? d.createdAt.toMillis() : d?.createdAt || 0);

/** lostFoundItems doc → UI card */
function lostFoundToCard(id, d, meta) {
  return {
    id,
    // True while this is still a local write the server has not acknowledged.
    // Anything that queries under the item (its claims) must wait for false:
    // the claims rule reads the item on the server, and a listen rejected
    // mid-setup trips an internal assertion in the Firestore SDK that leaves
    // the client wedged until reload.
    pending: !!meta?.hasPendingWrites,
    type: d.type, // 'lost' | 'found'
    title: d.title,
    category: d.category,
    location: d.location || d.zoneId || 'Campus',
    date: timeAgo(createdMs(d)),
    // Not on the card: the description lives in a private subdocument so a
    // claimant cannot read the owner's identifying details and repeat them
    // back as proof. `hasDetail` says one exists without revealing it; the
    // poster loads their own with getItemDetail(). Older posts written before
    // the split still carry it inline, so fall back for those.
    description: d.description || '',
    hasDetail: d.hasDetail ?? !!d.description,
    reporter: d.reporterName || 'Student',
    dept: d.dept || '',
    verified: !!d.verified,
    trustScore: d.trustScore ?? 50,
    matchScore: d.matchScore ?? null,
    matchedWith: d.matchedWith || [],
    // Needed so the UI can tell the poster apart from everyone else: the poster
    // reviews claims (FR-10), everyone else submits them.
    postedBy: d.postedBy || null,
    status: d.status || 'open',
    tags: d.keywords || [],
    imageURL: d.imageURLs?.[0] || null,
    _sort: createdMs(d),
  };
}

/** listings doc → UI card */
function listingToCard(id, d) {
  return {
    id,
    type: 'marketplace',
    title: d.title,
    category: d.category,
    location: d.location || 'Campus',
    date: timeAgo(createdMs(d)),
    description: d.description,
    reporter: d.sellerName || 'Student',
    dept: d.dept || '',
    verified: !!d.verified,
    trustScore: d.trustScore ?? 50,
    price: d.price ?? 0,
    listingType: PRICE_TO_LISTING[d.priceType] || 'Sell',
    condition: d.condition || '',
    // The handshake needs these: who sells, who offered, who has confirmed.
    // Without sellerUid the review had no real person to rate.
    sellerUid: d.sellerUid || null,
    status: d.status || 'active',
    lastOffer: d.lastOffer || null,
    confirmations: d.confirmations || {},
    tags: d.keywords || [],
    imageURL: d.imageURLs?.[0] || null,
    _sort: createdMs(d),
  };
}

/**
 * Live-subscribe to the merged feed. Calls cb(cards[]) on every change.
 * Returns an unsubscribe function.
 */
export function subscribeFeed(cb, onError = () => {}) {
  let lf = [];
  let ls = [];
  const emit = () => cb([...lf, ...ls].sort((a, b) => b._sort - a._sort));

  const unsubLf = onSnapshot(
    query(collection(db, COL.lostFoundItems), orderBy('createdAt', 'desc')),
    // Metadata changes too, so a card learns when its write has been acked.
    { includeMetadataChanges: true },
    (snap) => { lf = snap.docs.map((doc) => lostFoundToCard(doc.id, doc.data(), doc.metadata)); emit(); },
    onError
  );
  const unsubLs = onSnapshot(
    query(collection(db, COL.listings), orderBy('createdAt', 'desc')),
    (snap) => { ls = snap.docs.map((doc) => listingToCard(doc.id, doc.data())); emit(); },
    onError
  );
  return () => { unsubLf(); unsubLs(); };
}

/** Split keywords from a title/description for the matching function to use. */
function deriveKeywords(...parts) {
  return [...new Set(parts.join(' ').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 12);
}

// Generic attributes only. A lost/found description names the marks that prove
// ownership ("MEERA scratched on the back"), so it must not reach the public
// document — and neither may keywords derived from it, which would leak the
// same words as a list. Matching therefore runs on the title plus these coarse
// terms: copying "blue" and "notebook" tells a fraudster nothing that passes a
// proof check.
const COARSE_VOCAB = [
  // colour
  'black', 'blue', 'red', 'green', 'white', 'grey', 'gray', 'brown', 'yellow',
  'orange', 'purple', 'pink', 'silver', 'golden', 'transparent',
  // material
  'metal', 'steel', 'plastic', 'leather', 'cloth', 'fabric', 'wooden', 'glass',
  'rubber', 'paper', 'canvas',
  // kind
  'bottle', 'flask', 'calculator', 'notebook', 'book', 'notes', 'register',
  'charger', 'cable', 'adapter', 'card', 'wallet', 'purse', 'bag', 'backpack',
  'umbrella', 'glasses', 'spectacles', 'watch', 'phone', 'laptop', 'tablet',
  'headphones', 'earphones', 'earbuds', 'keys', 'keychain', 'hoodie', 'jacket',
  'shirt', 'shoes', 'sandals', 'cycle', 'bicycle', 'helmet', 'lamp', 'fridge',
  'racket', 'coat', 'labcoat', 'pen', 'file', 'folder', 'lunchbox', 'tiffin',
  'mouse', 'keyboard', 'ring', 'chain', 'bracelet', 'scarf', 'cap',
];

/**
 * Public, non-identifying tags for matching: every word of the title (already
 * visible on the card) plus any coarse vocabulary term the description
 * mentions. Nothing specific enough to serve as proof ever leaves the private
 * subdocument.
 */
function derivePublicTags(title = '', description = '') {
  const fromTitle = title.toLowerCase().match(/[a-z0-9]{3,}/g) || [];
  const hay = ` ${description.toLowerCase()} `;
  const fromDescription = COARSE_VOCAB.filter((w) => new RegExp(`\\b${w}\\b`).test(hay));
  return [...new Set([...fromTitle, ...fromDescription])].slice(0, 12);
}

/**
 * The poster's own description of a lost/found report. Lives in a subdocument
 * because Firestore rules are document-level: there is no way to allow reading
 * a document's title while denying its description. Returns '' when the caller
 * is not allowed to read it.
 */
export async function getItemDetail(itemId) {
  if (!itemId) return '';
  try {
    const snap = await getDoc(doc(db, COL.lostFoundItems, itemId, 'private', 'detail'));
    return snap.exists() ? snap.data().description || '' : '';
  } catch {
    return ''; // permission-denied for anyone but the poster and moderators
  }
}

/**
 * The denormalised poster fields every feed write carries. Firestore rejects a
 * whole document with `invalid-argument` if any field is `undefined`, so one
 * missing optional display field (a profile without a department, say) would
 * otherwise block the post entirely with an unhelpful error. Defaults here keep
 * the write valid; `uid` is the only field that must be real.
 */
function posterFields(poster) {
  if (!poster?.uid) throw new Error('Sign in to post.');
  return {
    uid: poster.uid,
    name: poster.name || 'Student',
    dept: poster.dept || '',
    verified: !!poster.verified,
    trustScore: poster.trustScore ?? 50,
  };
}

/**
 * Write a lost/found report. `poster` carries the denormalized display fields.
 *
 * The description is written to a private subdocument, not the card. It names
 * the marks that prove ownership, and a claim is judged on exactly those marks
 * — public, it hands a fraudster their answer. Rules are document-level, so
 * the only way to hide one field is to put it in its own document.
 */
export async function addLostFound(form, poster) {
  const who = posterFields(poster);
  const ref = await addDoc(collection(db, COL.lostFoundItems), {
    type: form.type, // 'lost' | 'found'
    title: form.title,
    category: form.category,
    // Coarse terms only — see derivePublicTags.
    keywords: derivePublicTags(form.title, form.description),
    hasDetail: !!form.description?.trim(),
    zoneId: form.location,
    location: form.location,
    imageURLs: [],
    status: 'open',
    postedBy: who.uid,
    reporterName: who.name,
    dept: who.dept,
    verified: who.verified,
    trustScore: who.trustScore,
    matchedWith: [],
    matchScore: null,
    createdAt: serverTimestamp(),
  });

  if (form.description?.trim()) {
    // Separate write: the card is already live, and a failure here must not
    // lose the report. The poster can still be reached through chat.
    await setDoc(doc(db, COL.lostFoundItems, ref.id, 'private', 'detail'), {
      description: form.description.trim(),
      createdAt: serverTimestamp(),
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[FoundIt] Could not save private detail:', err.code || err.message);
    });
  }

  return ref;
}

/** Write a marketplace listing. */
export async function addListing(form, poster) {
  const who = posterFields(poster);
  return addDoc(collection(db, COL.listings), {
    title: form.title,
    description: form.description,
    category: form.category,
    keywords: deriveKeywords(form.title, form.description),
    condition: form.condition || 'Good Condition',
    priceType: LISTING_TO_PRICE[form.listingType] || 'sale',
    price: form.listingType === 'Giveaway' ? 0 : Number(form.price) || 0,
    location: form.location,
    imageURLs: [],
    status: 'active',
    sellerUid: who.uid,
    sellerName: who.name,
    dept: who.dept,
    verified: who.verified,
    trustScore: who.trustScore,
    createdAt: serverTimestamp(),
  });
}
