import { getChatId } from './directMessages';

/**
 * Navigate to messages page and start a chat with a specific user
 * @param {string} otherUserId - User ID to start chat with
 * @param {Function} router - Next.js router instance
 */
export const startChat = (otherUserId, router) => {
  if (!otherUserId || !router) return;
  router.push(`/messages?userId=${otherUserId}`);
};

/**
 * Get chat URL for a specific user
 * @param {string} otherUserId - User ID
 * @returns {string} Messages page URL with userId query param
 */
export const getChatUrl = (otherUserId) => {
  return `/messages?userId=${otherUserId}`;
};

