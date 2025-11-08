'use client';

import { useState, useEffect } from 'react';
import { database } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

export interface UserStatus {
  state: 'online' | 'offline';
  lastSeen: number | { seconds: number } | null;
}

export function useUserStatus(userId: string | null) {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const statusRef = ref(database, `usersStatus/${userId}`);

    const unsubscribe = onValue(
      statusRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setStatus({
            state: data.state || 'offline',
            lastSeen: data.lastSeen || null,
          });
        } else {
          setStatus({ state: 'offline', lastSeen: null });
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error reading user status:', error);
        setStatus({ state: 'offline', lastSeen: null });
        setLoading(false);
      }
    );

    return () => {
      off(statusRef);
    };
  }, [userId]);

  return { status, loading };
}

