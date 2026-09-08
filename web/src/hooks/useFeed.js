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
    const unsub = subscribeFeed(
      (cards) => { setItems(cards); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
    return unsub;
  }, []);

  return { items, loading, error };
}
