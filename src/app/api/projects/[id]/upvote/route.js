import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';
import { logActivity } from '@/lib/activity';
import { addNotification } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id || !userId) return NextResponse.json({ success: false, error: 'Missing project id or user id' }, { status: 400 });

    const projectRef = doc(firestore, 'projects', id);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    const project = projectSnap.data();
    const upvoters = project.upvoters || [];
    if (upvoters.includes(userId)) return NextResponse.json({ success: false, error: 'Already upvoted' }, { status: 400 });

    await updateDoc(projectRef, { upvoters: arrayUnion(userId), upvotes: increment(1) });
    await logActivity(userId, 'upvoted', { projectId: id });

    try {
      if (project.ownerId && project.ownerId !== userId) {
        await addNotification(project.ownerId, {
          title: 'Project Upvoted',
          description: 'Someone upvoted your project',
          type: 'upvote',
          link: `/project/${id}`,
        });
      }
    } catch {}

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { userId } = await request.json();
    if (!id || !userId) return NextResponse.json({ success: false, error: 'Missing project id or user id' }, { status: 400 });

    const projectRef = doc(firestore, 'projects', id);
    const projectSnap = await getDoc(projectRef);
    if (!projectSnap.exists()) return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });

    const project = projectSnap.data();
    const upvoters = project.upvoters || [];
    if (!upvoters.includes(userId)) return NextResponse.json({ success: false, error: 'Not upvoted yet' }, { status: 400 });

    const newUpvotes = Math.max(0, (project.upvotes || 0) - 1);
    await updateDoc(projectRef, { upvoters: arrayRemove(userId), upvotes: newUpvotes });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
