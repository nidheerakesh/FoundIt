// Feed data layer — reads/writes lostFoundItems + listings, maps them to the
// card shape the UI already renders. OWNER: Nidhi (data) + Shenza (card shape).
//
// Note: poster display fields (reporterName, dept, location, verified, trustScore)
// are denormalized onto each doc so the feed renders without per-item user joins —
// standard Firestore feed pattern. The authoritative trust value still lives on the
// user doc and is recomputed server-side (docs/SCORING.md).
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { COL } from '../types';

// An image is a nice-to-have; the report is the point. When Storage is not
// enabled or is unreachable the SDK retries instead of failing fast, which left
// the post modal hanging with no feedback and the report never written. Time-box
// the upload and post without the photo rather than losing the whole report.
const IMAGE_UPLOAD_TIMEOUT_MS = 12000;

async function uploadImage(file, folder) {
  if (!file) return [];
  const path = `${folder}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);

  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('image upload timed out')), IMAGE_UPLOAD_TIMEOUT_MS);
  });

  try {
    await Promise.race([uploadBytes(storageRef, file), timeout]);
    return [await getDownloadURL(storageRef)];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[FoundIt] Image upload failed, posting without it:', err.message);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

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
function lostFoundToCard(id, d) {
  return {
    id,
    type: d.type, // 'lost' | 'found'
    title: d.title,
    category: d.category,
    location: d.location || d.zoneId || 'Campus',
    date: timeAgo(createdMs(d)),
    description: d.description,
    reporter: d.reporterName || 'Student',
    dept: d.dept || '',
    verified: !!d.verified,
    trustScore: d.trustScore ?? 50,
    matchScore: d.matchScore ?? null,
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
    (snap) => { lf = snap.docs.map((doc) => lostFoundToCard(doc.id, doc.data())); emit(); },
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

/** Write a lost/found report. `poster` carries the denormalized display fields. */
export async function addLostFound(form, poster) {
  const imageURLs = await uploadImage(form.imageFile, 'items');
  return addDoc(collection(db, COL.lostFoundItems), {
    type: form.type, // 'lost' | 'found'
    title: form.title,
    description: form.description,
    category: form.category,
    keywords: deriveKeywords(form.title, form.description),
    zoneId: form.location,
    location: form.location,
    imageURLs,
    status: 'open',
    postedBy: poster.uid,
    reporterName: poster.name,
    dept: poster.dept,
    verified: poster.verified,
    trustScore: poster.trustScore,
    matchedWith: [],
    matchScore: null,
    createdAt: serverTimestamp(),
  });
}

/** Write a marketplace listing. */
export async function addListing(form, poster) {
  const imageURLs = await uploadImage(form.imageFile, 'listings');
  return addDoc(collection(db, COL.listings), {
    title: form.title,
    description: form.description,
    category: form.category,
    keywords: deriveKeywords(form.title, form.description),
    condition: form.condition || 'Good Condition',
    priceType: LISTING_TO_PRICE[form.listingType] || 'sale',
    price: form.listingType === 'Giveaway' ? 0 : Number(form.price) || 0,
    location: form.location,
    imageURLs,
    status: 'active',
    sellerUid: poster.uid,
    sellerName: poster.name,
    dept: poster.dept,
    verified: poster.verified,
    trustScore: poster.trustScore,
    createdAt: serverTimestamp(),
  });
}
