import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { sendDirectMessage } from '@/lib/directMessages';

/**
 * POST /api/messages/send
 * Send a direct message and trigger push notification if recipient is offline
 * Body: { chatId, senderId, text }
 */
export async function POST(request) {
  try {
    const { chatId, senderId, text } = await request.json();

    if (!chatId || !senderId || !text) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: chatId, senderId, text' },
        { status: 400 }
      );
    }

    // Send the message
    const { success, error, messageId } = await sendDirectMessage(chatId, senderId, text);

    if (!success) {
      return NextResponse.json(
        { success: false, error: error || 'Failed to send message' },
        { status: 500 }
      );
    }

    // Get recipient ID
    const [uid1, uid2] = chatId.split('_');
    const recipientId = uid1 === senderId ? uid2 : uid1;

    // Check if recipient is online (you can enhance this with presence tracking)
    // For now, we'll always try to send push notification
    // In production, check user's online status from Realtime Database

    // Get recipient's FCM token
    const userRef = doc(firestore, 'users', recipientId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const fcmToken = userData.fcmToken;

      // Get sender's name for notification
      const senderRef = doc(firestore, 'users', senderId);
      const senderSnap = await getDoc(senderRef);
      const senderName = senderSnap.exists() 
        ? (senderSnap.data().name || senderSnap.data().email || 'Someone')
        : 'Someone';

      // Send push notification via FCM (requires Firebase Admin SDK on server)
      // For now, we'll return success and let the client handle foreground notifications
      // In production, use Firebase Admin SDK to send push notifications
      
      if (fcmToken) {
        // TODO: Implement server-side FCM push notification using Firebase Admin SDK
        // This requires setting up Firebase Admin SDK on the server
        console.log('FCM token found, push notification should be sent:', {
          token: fcmToken,
          title: 'New Message',
          body: `${senderName}: ${text.substring(0, 100)}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      messageId,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error in send message API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

