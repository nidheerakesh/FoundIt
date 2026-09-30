import { useEffect, useState } from 'react';
import { subscribeFeed } from '../lib/feed';
import { INITIAL_ITEMS } from '../data/mockData';

/**
 * Live campus feed from Firestore (lostFoundItems + listings merged).
 * Falls back to INITIAL_ITEMS when Firebase is unreachable, so the page
 * is never blank during development or before the seed has run.
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
        setItems(INITIAL_ITEMS);
        setError(new Error('Backend timeout'));
        setLoading(false);
      }
    }, 8000);

    const unsub = subscribeFeed(
      (cards) => {
        resolved = true;
        clearTimeout(timer);
        setItems(cards);
        setError(null);
        setLoading(false);
      },
      (err) => {
        resolved = true;
        clearTimeout(timer);
        setItems(INITIAL_ITEMS);
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
