'use client';

import { useUserStatus } from '@/hooks/useUserStatus';

interface UserStatusProps {
  userId: string | null;
  className?: string;
}

export default function UserStatus({ userId, className = '' }: UserStatusProps) {
  const { status, loading } = useUserStatus(userId);

  if (loading || !status) {
    return null;
  }

  const formatLastSeen = (timestamp: number | { seconds: number } | null) => {
    if (!timestamp) return 'Unknown';
    // Handle Firebase server timestamp (can be an object with seconds property)
    let timestampValue: number;
    if (typeof timestamp === 'object' && 'seconds' in timestamp) {
      timestampValue = timestamp.seconds * 1000;
    } else if (typeof timestamp === 'number') {
      // If timestamp is in seconds, convert to milliseconds
      timestampValue = timestamp < 1000000000000 ? timestamp * 1000 : timestamp;
    } else {
      return 'Unknown';
    }
    const date = new Date(timestampValue);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {status.state === 'online' ? (
        <>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-gray-600">Online</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-sm text-gray-600">
            Last seen: {formatLastSeen(status.lastSeen)}
          </span>
        </>
      )}
    </div>
  );
}

