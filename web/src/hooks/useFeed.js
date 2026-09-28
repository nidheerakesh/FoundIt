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
    }, 2500);

    const unsub = subscribeFeed(
      (cards) => {
        resolved = true;
        clearTimeout(timer);
        setItems(cards);
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
