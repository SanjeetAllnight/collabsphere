'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentUser } from '@/lib/auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { markNotificationAsRead } from '@/lib/db';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const [prevUnreadCount, setPrevUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const user = getCurrentUser();

  // Real-time notifications listener using Firestore onSnapshot
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

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

        // Calculate unread count (support both 'read' and 'isRead' fields)
        const unread = cleanedNotifications.filter(n => {
          return n.read === false || n.isRead === false;
        }).length;
        setUnreadCount(unread);

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

  // Track previous unread count to detect new notifications
  useEffect(() => {
    if (unreadCount > prevUnreadCount && !isOpen) {
      setHasNewNotification(true);
      // Reset after animation
      setTimeout(() => setHasNewNotification(false), 600);
    }
    setPrevUnreadCount(unreadCount);
  }, [unreadCount, isOpen, prevUnreadCount]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!user) return null;

  const handleNotificationClick = async (notification: any) => {
    const isUnread = notification.read === false || notification.isRead === false;
    if (isUnread) {
      await markNotificationAsRead(notification.id);
    }

    setIsOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'request':
        return '🤝';
      case 'like':
        return '❤️';
      default:
        return '🔔';
    }
  };

  // Get last 5 notifications
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        aria-label="Notifications"
        animate={hasNewNotification ? {
          scale: [1, 1.2, 1],
          rotate: [0, -10, 10, -10, 0],
        } : {}}
        transition={{ duration: 0.5 }}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.span
            className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 mt-2 w-80 rounded-xl border border-gray-200/50 backdrop-blur-lg bg-white/90 shadow-xl z-50 max-h-96 overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200/50 flex justify-between items-center bg-white/50">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-xs text-gray-500">{unreadCount} unread</span>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-80">
              {loading ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  Loading notifications...
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-gray-100/50">
                  {recentNotifications.map((notification) => (
                    <motion.button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50/50 transition ${
                        !notification.isRead ? 'bg-indigo-50/50' : ''
                      }`}
                      whileHover={{ backgroundColor: 'rgba(249, 250, 251, 0.8)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1 text-lg">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className={`text-sm flex-1 ${(notification.read === false || notification.isRead === false) ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notification.message || notification.description}
                            </p>
                            {(notification.read === false || notification.isRead === false) && (
                              <motion.div
                                className="w-2 h-2 bg-indigo-600 rounded-full flex-shrink-0 mt-1"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500 }}
                              />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer - View All Link */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200/50 bg-white/50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    router.push('/notifications');
                  }}
                  className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

