import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from './firebase';
import { saveUserProfile } from './db';

/**
 * Register a new user with email, password, and name
 * Also saves the user profile to Firestore
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @param {string} name - User's name
 * @returns {Promise<{user: User | null, error: string | null}>}
 */
export const registerUser = async (email, password, name) => {
  try {
    // Validate name is required
    if (!name || name.trim() === '') {
      return { user: null, error: 'Name is required' };
    }

    // Create user account with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Save user profile to Firestore
    const { success, error: profileError } = await saveUserProfile(user.uid, email, name);
    
    if (!success) {
      return { user, error: profileError || 'Failed to save user profile' };
    }

    return { user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

/**
 * Login user with email and password
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<{user: User | null, error: string | null}>}
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error) {
    return { user: null, error: error.message };
  }
};

/**
 * Logout the current user
 * @returns {Promise<{error: string | null}>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

// Legacy function names for backward compatibility
/**
 * @deprecated Use loginUser instead
 */
export const signIn = loginUser;

/**
 * @deprecated Use registerUser instead
 */
export const register = registerUser;

/**
 * @deprecated Use logoutUser instead
 */
export const logout = logoutUser;

/**
 * Get the current authenticated user
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Listen to auth state changes
 */
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

