import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, writeBatch, doc } from 'firebase/firestore';

/**
 * GET /api/notifications?userId=<id>
 * Get all notifications for a user, ordered by createdAt desc (newest first)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query parameter is required' },
        { status: 400 }
      );
    }

    // Query notifications for the specific user (fetch without orderBy to avoid composite index)
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);

    const notifications = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || new Date());
      notifications.push({
        id: doc.id,
        ...data,
        createdAt: createdAt.toISOString(),
        _createdAtTimestamp: createdAt.getTime(), // For sorting
      });
    });

    // Sort by createdAt descending (newest first) - client-side
    notifications.sort((a, b) => (b._createdAtTimestamp || 0) - (a._createdAtTimestamp || 0));

    // Remove temporary sorting field
    const cleanedNotifications = notifications.map(({ _createdAtTimestamp, ...notification }) => notification);

    return NextResponse.json({
      success: true,
      notifications: cleanedNotifications,
      count: cleanedNotifications.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Mark all notifications as read for a given userId
 * Body: { userId }
 */
export async function PATCH(request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required in request body' },
        { status: 400 }
      );
    }

    // Query all unread notifications for the user
    // Check for both 'read' and 'isRead' fields for compatibility
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No unread notifications to mark as read',
        updatedCount: 0,
      });
    }

    // Use batch write to update all notifications at once
    const batch = writeBatch(firestore);
    let updateCount = 0;

    querySnapshot.forEach((docSnapshot) => {
      const notificationData = docSnapshot.data();
      // Check if notification is unread (support both 'read' and 'isRead' fields)
      const isUnread = notificationData.read === false || notificationData.isRead === false;
      
      if (isUnread) {
        const notificationRef = doc(firestore, 'notifications', docSnapshot.id);
        // Update both fields for compatibility
        const updateData = {};
        if ('read' in notificationData) {
          updateData.read = true;
        }
        if ('isRead' in notificationData) {
          updateData.isRead = true;
        }
        // If neither field exists, default to isRead
        if (Object.keys(updateData).length === 0) {
          updateData.isRead = true;
        }
        batch.update(notificationRef, updateData);
        updateCount++;
      }
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Marked ${updateCount} notification(s) as read`,
      updatedCount,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

