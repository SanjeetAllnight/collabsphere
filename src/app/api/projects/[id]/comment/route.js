import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '@/lib/activity';
import { addNotification } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { userId, text } = await request.json();

    if (!id || !userId || !text || !text.trim()) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const projectRef = doc(firestore, 'projects', id);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const commentsRef = collection(firestore, 'projects', id, 'comments');
    await addDoc(commentsRef, {
      userId,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });

    const projectData = projectSnap.data();
    const currentCount = projectData.commentsCount || 0;
    await updateDoc(projectRef, { commentsCount: currentCount + 1 });

    await logActivity(userId, 'commented', { projectId: id });

    try {
      if (projectData.ownerId && projectData.ownerId !== userId) {
        await addNotification(projectData.ownerId, {
          title: 'New Comment',
          description: 'Someone commented on your project',
          type: 'comment',
          link: `/project/${id}`,
        });
      }
    } catch {}

    return NextResponse.json({ success: true, message: 'Comment added' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
