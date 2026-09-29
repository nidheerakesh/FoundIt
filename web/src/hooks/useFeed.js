import { useEffect, useState } from 'react';
import { subscribeFeed } from '../lib/feed';

/**
 * Live campus feed from Firestore (lostFoundItems + listings merged).
 * @returns {{ items: any[], loading: boolean, error: Error|null }}
 */
export function useFeed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let resolved = false;
    const timer = setTimeout(() => {
      if (!resolved) {
        // eslint-disable-next-line no-console
        console.warn('[FoundIt] Feed snapshot timeout — falling back to mock data.');
        setError(new Error('Backend timeout'));
        setLoading(false);
      }
      // 2.5s was short enough that a cold backend or a slow network silently
      // swapped the live feed for mock data. The UI looks correct either way,
      // so the substitution is easy to miss — give the real backend room.
    }, 8000);

    const unsub = subscribeFeed(
      (cards) => {
        resolved = true;
        clearTimeout(timer);
        setItems(cards);
        // Clear a previous timeout: without this the mock-data fallback is
        // permanent for the session, because App keys off `error` and a late
        // snapshot would never win the feed back.
        setError(null);
        setLoading(false);
      },
      (err) => {
        resolved = true;
        clearTimeout(timer);
        setError(err);
        setLoading(false);
      }
    );
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  return { items, loading, error };
}
