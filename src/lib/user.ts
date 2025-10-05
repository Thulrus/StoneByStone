/**
 * User context utilities
 */

const USER_KEY = 'cemetery_user';

/**
 * Get the stored user identifier (if any)
 * Returns null if not set - no longer prompts automatically
 */
export function getCurrentUser(): string | null {
  return localStorage.getItem(USER_KEY);
}

/**
 * Get the user identifier or return 'Anonymous' if not set
 * Use this only when you need a guaranteed non-null value
 */
export function getCurrentUserOrAnonymous(): string {
  return localStorage.getItem(USER_KEY) || 'Anonymous';
}

/**
 * Set the current user identifier
 */
export function setCurrentUser(identifier: string): void {
  localStorage.setItem(USER_KEY, identifier);
}

/**
 * Check if a user identifier has been set
 */
export function hasUserIdentifier(): boolean {
  return !!localStorage.getItem(USER_KEY);
}

/**
 * Clear the stored user identifier
 */
export function clearUserIdentifier(): void {
  localStorage.removeItem(USER_KEY);
}

/**
 * Get current timestamp in ISO8601 format
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
