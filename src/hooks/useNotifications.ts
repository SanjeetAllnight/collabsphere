'use client';

import { useState, useEffect } from 'react';
import { listenToNotifications, markNotificationAsRead } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'request' | 'like';
  title: string;
  description: string;
  isRead: boolean;
  createdAt: any; // Firestore Timestamp or Date
  link?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenToNotifications(user.uid, ({ success, notifications: fetchedNotifications, error: err }) => {
      if (success) {
        setNotifications(fetchedNotifications);
        setError(null);
      } else {
        setError(err || 'Failed to fetch notifications');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (notificationId: string) => {
    const { success, error: err } = await markNotificationAsRead(notificationId);
    if (!success) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
  };
}

