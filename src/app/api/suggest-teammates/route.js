import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { firestore } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_KEY || process.env.GEMINI_KEY);

/**
 * Calculate weighted match score for a user
 */
function calculateMatchScore(user, project) {
  // 1. Skill Match (0.35 weight)
  const userSkills = Array.isArray(user.techSkills) ? user.techSkills : [];
  const requiredSkills = Array.isArray(project.requiredSkills) ? project.requiredSkills : [];
  const skillMatches = userSkills.filter(skill => 
    requiredSkills.some(reqSkill => 
      skill.toLowerCase().includes(reqSkill.toLowerCase()) || 
      reqSkill.toLowerCase().includes(skill.toLowerCase())
    )
  );
  const skillMatch = requiredSkills.length > 0 
    ? (skillMatches.length / requiredSkills.length) * 100 
    : 0;

  // 2. Interest Alignment (0.20 weight)
  const userInterests = Array.isArray(user.interests) ? user.interests : [];
  const projectTags = Array.isArray(project.tags) ? project.tags : [];
  const projectCategory = project.category || '';
  const interestMatches = userInterests.filter(interest => {
    const lowerInterest = interest.toLowerCase();
    return projectTags.some(tag => 
      lowerInterest.includes(tag.toLowerCase()) || 
      tag.toLowerCase().includes(lowerInterest)
    ) || (projectCategory && lowerInterest.includes(projectCategory.toLowerCase()));
  });
  const interestAlignment = userInterests.length > 0 
    ? (interestMatches.length / Math.max(userInterests.length, 1)) * 100 
    : 0;

  // 3. Role Complement Score (0.15 weight)
  // Simple heuristic: if preferredRole is different from common roles, give bonus
  const commonRoles = ['Frontend Developer', 'Backend Developer', 'Full Stack Developer'];
  const userRole = user.preferredRole || '';
  const roleComplementScore = userRole && !commonRoles.includes(userRole) ? 80 : 50;

  // 4. Experience Compatibility (0.10 weight)
  const experienceLevels = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
  const userExp = experienceLevels[user.experienceLevel] || 2;
  const projectNeedsExp = 2; // Assume intermediate by default
  const expDiff = Math.abs(userExp - projectNeedsExp);
  const experienceCompatibility = expDiff <= 1 ? 100 : 0;

  // 5. Availability Fit (0.10 weight)
  const userAvailability = user.availability || '';
  const availabilityFit = userAvailability ? 100 : 0; // Simple: has availability = fit

  // 6. Collaboration Style Fit (0.10 weight)
  // Complementary pairs: Analytical+Creative, Structured+Flexible
  const userStyle = user.personalityStyle || '';
  const collaborationStyleFit = userStyle ? 100 : 0; // Simple: has style = fit

  // Calculate weighted score
  const matchScore = 
    0.35 * skillMatch +
    0.20 * interestAlignment +
    0.15 * roleComplementScore +
    0.10 * experienceCompatibility +
    0.10 * availabilityFit +
    0.10 * collaborationStyleFit;

  return Math.round(matchScore);
}

/**
 * POST /api/suggest-teammates
 * Get AI-powered teammate suggestions for a project
 * Body: { postId }
 * Returns: { success: true, teammates: [...] }
 */
export async function POST(request) {
  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId is required' },
        { status: 400 }
      );
    }

    // 1. Fetch project data from Firestore
    const projectRef = doc(firestore, 'projects', postId);
    const projectSnap = await getDoc(projectRef);

    let project;

    if (!projectSnap.exists()) {
      // Try posts collection as fallback
      const postRef = doc(firestore, 'posts', postId);
      const postSnap = await getDoc(postRef);
      
      if (postSnap.exists()) {
        const postData = postSnap.data();
        project = {
          id: postSnap.id,
          requiredSkills: Array.isArray(postData.requiredSkills) 
            ? postData.requiredSkills 
            : (postData.requiredSkills ? postData.requiredSkills.split(',').map(s => s.trim()) : []),
          category: postData.category || postData.topic || '',
          description: postData.description || '',
          tags: Array.isArray(postData.tags) ? postData.tags : [],
          createdBy: postData.ownerId || postData.ownerEmail || '',
        };
      } else {
        return NextResponse.json(
          { success: false, error: 'Project/Post not found' },
          { status: 404 }
        );
      }
    } else {
      const projectData = projectSnap.data();
      project = {
        id: projectSnap.id,
        requiredSkills: Array.isArray(projectData.requiredSkills) 
          ? projectData.requiredSkills 
          : (projectData.requiredSkills ? projectData.requiredSkills.split(',').map(s => s.trim()) : []),
        category: projectData.category || projectData.topic || '',
        description: projectData.description || '',
        tags: Array.isArray(projectData.tags) ? projectData.tags : [],
        createdBy: projectData.ownerId || projectData.createdBy || projectData.ownerEmail || '',
      };
    }

    if (!project.createdBy) {
      return NextResponse.json(
        { success: false, error: 'Project owner ID not found' },
        { status: 400 }
      );
    }

    // 2. Fetch all user profiles except the project owner
    const usersRef = collection(firestore, 'users');
    const usersSnapshot = await getDocs(usersRef);

    const users = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Skip the project owner
      if (userId !== project.createdBy) {
        users.push({
          uid: userId,
          name: userData.name || userData.email || 'Unknown',
          email: userData.email || '',
          techSkills: Array.isArray(userData.techSkills) ? userData.techSkills : 
                     (Array.isArray(userData.skills) ? userData.skills : []),
          nonTechSkills: Array.isArray(userData.nonTechSkills) ? userData.nonTechSkills : [],
          interests: Array.isArray(userData.interests) ? userData.interests : [],
          preferredRole: userData.preferredRole || '',
          experienceLevel: userData.experienceLevel || '',
          availability: userData.availability || '',
          personalityStyle: userData.personalityStyle || '',
        });
      }
    });

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        teammates: [],
        message: 'No other users found',
      });
    }

    // 3. Calculate weighted scores for all users
    const scoredUsers = users.map(user => ({
      ...user,
      matchScore: calculateMatchScore(user, project),
    }))
    .filter(user => user.matchScore >= 40) // Filter low scores
    .sort((a, b) => b.matchScore - a.matchScore) // Sort by score descending
    .slice(0, 10); // Take top 10 for Gemini refinement

    if (scoredUsers.length === 0) {
      return NextResponse.json({
        success: true,
        teammates: [],
        message: 'No suitable matches found',
      });
    }

    // 4. Pass to Gemini for refinement
    const prompt = `You are a project team formation assistant for university student teams.

Refine and rank these candidates based on collaboration quality, not just skill match.
Explain the reasoning in one short friendly sentence per candidate.

Project Context:
- Description: ${project.description}
- Category: ${project.category}
- Required Skills: ${project.requiredSkills.join(', ')}
- Tags: ${project.tags.join(', ')}

Candidates (already scored):
${JSON.stringify(scoredUsers.map(u => ({
  uid: u.uid,
  name: u.name,
  preferredRole: u.preferredRole,
  techSkills: u.techSkills,
  interests: u.interests,
  experienceLevel: u.experienceLevel,
  availability: u.availability,
  personalityStyle: u.personalityStyle,
  matchScore: u.matchScore,
})), null, 2)}

Return a JSON array with the top 5 candidates, each with:
{
  "uid": "user_id",
  "name": "User Name",
  "preferredRole": "Role",
  "matchScore": 85,
  "reason": "Brief friendly explanation",
  "personalityStyle": "Analytical",
  "availability": "10-20 hr/week"
}

Return ONLY valid JSON array, no markdown or additional text.`;

    let teammates = [];
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse Gemini response
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/g, '').trim();
      }

      const jsonMatch = jsonText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonText);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Process and validate results
      teammates = parsed
        .map((item) => {
          const originalUser = scoredUsers.find(u => u.uid === item.uid);
          return {
            uid: item.uid || originalUser?.uid || '',
            name: item.name || originalUser?.name || '',
            email: originalUser?.email || '',
            preferredRole: item.preferredRole || originalUser?.preferredRole || '',
            matchScore: typeof item.matchScore === 'number' ? item.matchScore : (originalUser?.matchScore || 0),
            reason: item.reason || 'Good match for this project',
            personalityStyle: item.personalityStyle || originalUser?.personalityStyle || '',
            availability: item.availability || originalUser?.availability || '',
            experienceLevel: item.experienceLevel || originalUser?.experienceLevel || '',
            techSkills: originalUser?.techSkills || [],
            interests: originalUser?.interests || [],
          };
        })
        .filter((t) => t.uid && t.matchScore >= 40)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 5);

    } catch (geminiError) {
      console.error('Error calling Gemini API:', geminiError);
      
      // Fallback: Use scored users directly
      teammates = scoredUsers
        .slice(0, 5)
        .map(user => ({
          uid: user.uid,
          name: user.name,
          email: user.email,
          preferredRole: user.preferredRole,
          matchScore: user.matchScore,
          reason: `Strong match with ${user.techSkills.length} relevant skills`,
          personalityStyle: user.personalityStyle,
          availability: user.availability,
          experienceLevel: user.experienceLevel,
          techSkills: user.techSkills,
          interests: user.interests,
        }));
    }

    // 5. Return final JSON
    return NextResponse.json({
      success: true,
      teammates,
    });
  } catch (error) {
    console.error('Error in suggest-teammates API:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
