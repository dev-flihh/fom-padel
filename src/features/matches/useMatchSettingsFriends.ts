import { useEffect, useState } from 'react';
import { type Friend } from '../../types';
import { fetchUserFriends } from '../../services/friendsRepository';

export const useMatchSettingsFriends = (uid?: string | null) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);

  useEffect(() => {
    setFriends([]);
    setLoadingFriends(true);

    if (!uid) {
      setLoadingFriends(false);
      return;
    }

    let isCancelled = false;
    const loadFriendsForSettings = async () => {
      try {
        const fetched = await fetchUserFriends(uid);
        if (isCancelled) return;
        setFriends(fetched);
      } catch (err) {
        console.error('Error fetching friends for settings:', err);
        if (!isCancelled) setFriends([]);
      } finally {
        if (!isCancelled) setLoadingFriends(false);
      }
    };

    void loadFriendsForSettings();
    return () => {
      isCancelled = true;
    };
  }, [uid]);

  return { friends, loadingFriends };
};
