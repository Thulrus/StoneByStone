/**
 * Centralized color definitions for StoneByStone
 *
 * This file provides color values that can be used both in Tailwind classes
 * and in direct SVG/CSS attributes. Keep these in sync with tailwind.config.cjs
 */

export const colors = {
  // Cemetery-specific colors
  cemetery: {
    grass: {
      light: '#86a876', // Light grass green for valid cells
      dark: '#4a5f3f', // Dark grass green for valid cells
    },
    invalid: 'rgba(0, 0, 0, 0.8)', // Black overlay for invalid cells
  },

  // Highlight colors for graves and elements
  highlight: {
    yellow: {
      light: 'rgba(234, 179, 8, 0.95)', // Yellow label background
      border: 'rgba(161, 98, 7, 0.8)', // Yellow label border
      ring: 'rgba(234, 179, 8, 0.8)', // Yellow pulsing ring
      bg: {
        light: '#fef3c7', // Very light yellow background (for list items)
        dark: '#78350f', // Dark yellow/amber background (for list items)
      },
    },
    blue: {
      bg: {
        light: '#dbeafe', // Light blue background for selected
        dark: '#1e3a8a', // Dark blue background for selected
      },
    },
    green: '#10b981', // Green for success/valid elements
    red: '#ef4444', // Red for errors/conflicts
  },

  // Text colors
  text: {
    dark: '#1f2937', // Dark gray for text on light backgrounds
    light: '#f9fafb', // Light gray for text on dark backgrounds
  },

  // Grid colors
  grid: {
    line: {
      light: '#9ca3af', // Light mode grid lines (gray-400)
      dark: '#4b5563', // Dark mode grid lines (gray-600)
    },
  },
} as const;

/**
 * Get the current theme from the document
 */
export function isDarkTheme(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Get theme-aware color value
 */
export function getThemeColor(lightColor: string, darkColor: string): string {
  return isDarkTheme() ? darkColor : lightColor;
}
