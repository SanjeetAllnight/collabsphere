'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { getCurrentUser, onAuthChange } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [markingAsRead, setMarkingAsRead] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    setUser(currentUser);

    const unsubscribe = onAuthChange((currentUser) => {
      if (!currentUser) {
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Mark all notifications as read when page loads
  useEffect(() => {
    const markAllAsReadOnLoad = async () => {
      if (!user) return;

      setMarkingAsRead(true);
      try {
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: user.uid }),
        });

        const data = await response.json();
        if (!data.success) {
          console.error('Failed to mark notifications as read:', data.error);
        }
      } catch (error) {
        console.error('Error marking notifications as read:', error);
      } finally {
        setMarkingAsRead(false);
      }
    };

    if (user) {
      markAllAsReadOnLoad();
    }
  }, [user]);

  // Real-time notifications listener using Firestore onSnapshot
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Query notifications for the logged-in user (fetch without orderBy to avoid composite index)
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const notificationsList: any[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || new Date());
          notificationsList.push({
            id: doc.id,
            ...data,
            createdAt: createdAt.toISOString(),
            _createdAtTimestamp: createdAt.getTime(), // For sorting
          });
        });

        // Sort by createdAt descending (newest first) - client-side
        notificationsList.sort((a, b) => (b._createdAtTimestamp || 0) - (a._createdAtTimestamp || 0));

        // Remove temporary sorting field
        const cleanedNotifications = notificationsList.map(({ _createdAtTimestamp, ...notification }) => notification);

        setNotifications(cleanedNotifications);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to notifications:', error);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [user]);

  const handleNotificationClick = (notification: any) => {
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => {
    // Support both 'read' and 'isRead' fields
    return n.read === false || n.isRead === false;
  }).length;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Notifications</h1>
              <p className="text-gray-600">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔔</div>
              <p className="text-gray-600 text-lg">No notifications yet</p>
              <p className="text-gray-500 text-sm mt-2">You'll see notifications here when you receive them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => {
                const isUnread = notification.read === false || notification.isRead === false;
                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-all ${
                      isUnread ? 'bg-indigo-50 border-indigo-200' : 'bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                          {notification.title}
                        </h3>
                        <p className="text-sm text-gray-700 mb-2">
                          {notification.message || notification.description}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

