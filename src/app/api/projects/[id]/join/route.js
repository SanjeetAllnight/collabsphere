import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { logActivity } from '@/lib/activity';
import { addNotification } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { userId } = await request.json();

    if (!id || !userId) return NextResponse.json({ success: false, error: 'Missing data' }, { status: 400 });

    const projectRef = doc(firestore, 'projects', id);
    const snap = await getDoc(projectRef);
    if (!snap.exists()) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    const project = snap.data();
    await updateDoc(projectRef, { contributors: arrayUnion(userId) });

    await logActivity(userId, 'joined_project', { projectId: id });

    try {
      if (project.ownerId && project.ownerId !== userId) {
        await addNotification(project.ownerId, {
          title: 'New Contributor',
          description: 'Someone joined your project',
          type: 'request',
          link: `/project/${id}`,
        });
      }
    } catch {}

    return NextResponse.json({ success: true, message: 'Joined project' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
