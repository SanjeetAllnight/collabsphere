import { NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, startAfter, serverTimestamp } from 'firebase/firestore';
import { logActivity } from '@/lib/activity';

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request) {
  try {
    const { ownerId, ownerEmail, title, description, category, tags, requiredSkills } = await request.json();

    if (!ownerId || !title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ownerId, title, description, category' },
        { status: 400 }
      );
    }

    const projectsRef = collection(firestore, 'projects');
    const projectData = {
      ownerId,
      ownerEmail: ownerEmail || '',
      title: title.trim(),
      description: description.trim(),
      category,
      tags: Array.isArray(tags) ? tags : [],
      requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
      upvotes: 0,
      upvoters: [],
      commentsCount: 0,
      createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(projectsRef, projectData);

    // Log activity
    await logActivity(ownerId, 'created_project', { projectId: docRef.id });

    return NextResponse.json({
      success: true,
      projectId: docRef.id,
      message: 'Project created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects
 * List projects with optional filters
 * Query params: category, tags, q, ownerId, limit, cursor
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const tagsParam = searchParams.get('tags');
    const qParam = searchParams.get('q');
    const ownerIdParam = searchParams.get('ownerId');
    const limitParam = parseInt(searchParams.get('limit') || '50');
    const cursorParam = searchParams.get('cursor');

    const projectsRef = collection(firestore, 'projects');
    let q;
    let needsClientSideSort = false;

    // Build query - avoid composite index by doing client-side sort when filtering
    if (categoryParam && ownerIdParam) {
      // Both filters - use category filter, then filter ownerId client-side
      q = query(projectsRef, where('category', '==', categoryParam));
      needsClientSideSort = true;
    } else if (categoryParam) {
      // Only category filter - fetch without orderBy to avoid composite index
      q = query(projectsRef, where('category', '==', categoryParam));
      needsClientSideSort = true;
    } else if (ownerIdParam) {
      // Only ownerId filter - can use orderBy (single field index exists by default)
      q = query(projectsRef, where('ownerId', '==', ownerIdParam), orderBy('createdAt', 'desc'));
    } else {
      // No filters - can use orderBy
      q = query(projectsRef, orderBy('createdAt', 'desc'));
    }

    // Apply limit (before client-side operations)
    if (limitParam > 0 && !needsClientSideSort) {
      q = query(q, limit(limitParam));
    }

    const querySnapshot = await getDocs(q);
    let projects = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let include = true;

      // Filter by tags (if provided)
      if (tagsParam) {
        const filterTags = tagsParam.split(',').map(t => t.trim().toLowerCase());
        const projectTags = (data.tags || []).map(t => t.toLowerCase());
        include = filterTags.some(tag => projectTags.includes(tag));
      }

      // Filter by search query (if provided)
      if (qParam && include) {
        const searchLower = qParam.toLowerCase();
        include = (
          data.title?.toLowerCase().includes(searchLower) ||
          data.description?.toLowerCase().includes(searchLower) ||
          (data.tags || []).some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      if (include) {
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || new Date());
        projects.push({
          id: doc.id,
          ...data,
          category: data.category || 'Others', // Ensure category always exists
          createdAt: createdAt.toISOString(),
          _createdAtTimestamp: createdAt.getTime(), // For client-side sorting
        });
      }
    });

    // Apply additional client-side filters
    if (ownerIdParam && categoryParam) {
      projects = projects.filter(p => p.ownerId === ownerIdParam);
    }

    // Client-side sorting if needed (when category filter is applied)
    if (needsClientSideSort) {
      projects.sort((a, b) => (b._createdAtTimestamp || 0) - (a._createdAtTimestamp || 0));
    }

    // Apply limit after sorting if needed
    if (limitParam > 0 && needsClientSideSort) {
      projects = projects.slice(0, limitParam);
    }

    // Remove temporary sorting field
    projects = projects.map(({ _createdAtTimestamp, ...project }) => project);

    return NextResponse.json({
      success: true,
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

