/**
 * Compute recommendation score for a project based on user profile
 * @param {Object} user - User profile with techSkills, interests
 * @param {Object} project - Project with requiredSkills, tags, upvotes
 * @returns {number} Recommendation score
 */
export function computeRecommendationScore(user, project) {
  // Skill match: overlap between user.techSkills and project.requiredSkills
  const userSkills = user.techSkills || [];
  const requiredSkills = project.requiredSkills || [];
  
  let skillMatch = 0;
  if (userSkills.length > 0 && requiredSkills.length > 0) {
    const lowerUserSkills = userSkills.map(s => s.toLowerCase().trim());
    const lowerRequiredSkills = requiredSkills.map(s => s.toLowerCase().trim());
    
    lowerRequiredSkills.forEach(reqSkill => {
      if (lowerUserSkills.some(userSkill => 
        userSkill === reqSkill || 
        userSkill.includes(reqSkill) || 
        reqSkill.includes(userSkill)
      )) {
        skillMatch++;
      }
    });
    
    // Normalize to percentage
    skillMatch = (skillMatch / requiredSkills.length) * 100;
  }

  // Interest match: overlap between user.interests and project.tags
  const userInterests = user.interests || [];
  const projectTags = project.tags || [];
  
  let interestMatch = 0;
  if (userInterests.length > 0 && projectTags.length > 0) {
    const lowerUserInterests = userInterests.map(i => i.toLowerCase().trim());
    const lowerProjectTags = projectTags.map(t => t.toLowerCase().trim());
    
    lowerProjectTags.forEach(tag => {
      if (lowerUserInterests.some(interest => 
        interest === tag || 
        interest.includes(tag) || 
        tag.includes(interest)
      )) {
        interestMatch++;
      }
    });
    
    // Normalize to percentage
    interestMatch = (interestMatch / projectTags.length) * 100;
  }

  // Popularity boost: min(upvotes, 10)
  const popularityBoost = Math.min(project.upvotes || 0, 10);

  // Final score: 3*skillMatch + 2*interestMatch + popularityBoost
  const score = 3 * skillMatch + 2 * interestMatch + popularityBoost;

  return Math.round(score);
}

/**
 * Get top recommended projects for a user
 * @param {Array} projects - Array of project objects
 * @param {Object} user - User profile
 * @param {number} limit - Maximum number of recommendations (default: 5)
 * @returns {Array} Sorted array of projects with recommendation scores
 */
export function getRecommendedProjects(projects, user, limit = 5) {
  if (!user || !projects || projects.length === 0) {
    return [];
  }

  // Compute scores for all projects
  const projectsWithScores = projects.map(project => ({
    ...project,
    recommendationScore: computeRecommendationScore(user, project),
  }));

  // Sort by score (descending) and return top N
  return projectsWithScores
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, limit);
}

