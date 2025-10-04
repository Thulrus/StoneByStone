/**
 * User context utilities
 */

const USER_KEY = 'cemetery_user';

/**
 * Get or create a user identifier
 */
export function getCurrentUser(): string {
  let user = localStorage.getItem(USER_KEY);
  if (!user) {
    user = prompt('Enter your name for change tracking:') || 'Anonymous';
    localStorage.setItem(USER_KEY, user);
  }
  return user;
}

/**
 * Set the current user
 */
export function setCurrentUser(name: string): void {
  localStorage.setItem(USER_KEY, name);
}

/**
 * Get current timestamp in ISO8601 format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}