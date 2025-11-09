export const defaultProjectImages = {
  "WebDev": "https://source.unsplash.com/featured/?web,code,design",
  "AI/ML": "https://source.unsplash.com/featured/?artificial,intelligence,neural,brain",
  "IoT": "https://source.unsplash.com/featured/?iot,device,hardware,sensor",
  "AppDev": "https://source.unsplash.com/featured/?mobile,app,ui,ux",
  "Cybersec": "https://source.unsplash.com/featured/?cybersecurity,hacker,security",
  "Blockchain": "https://source.unsplash.com/featured/?blockchain,crypto,network",
  "Others": "https://source.unsplash.com/featured/?technology,abstract"
};

/**
 * Get default image URL for a project category
 * @param {string} category - Project category
 * @returns {string} Image URL
 */
export function getDefaultProjectImage(category) {
  return defaultProjectImages[category] || defaultProjectImages["Others"];
}

