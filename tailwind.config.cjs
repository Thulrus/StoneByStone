/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Cemetery-specific colors
        cemetery: {
          grass: {
            light: '#1b5301ff',  // Light grass green for valid cells
            dark: '#264a12ff',   // Dark grass green for valid cells
          },
          invalid: {
            DEFAULT: 'rgba(0, 0, 0, 0)',  // Black overlay for invalid cells
          },
        },
        // Highlight colors for graves and elements
        highlight: {
          yellow: {
            light: 'rgba(234, 179, 8, 0.95)',  // Yellow label background
            border: 'rgba(161, 98, 7, 0.8)',    // Yellow label border
            ring: 'rgba(234, 179, 8, 0.8)',     // Yellow pulsing ring
            bg: {
              light: '#fef3c7',  // Very light yellow background
              dark: '#78350f',   // Dark yellow/amber background
            },
          },
          blue: {
            bg: {
              light: '#dbeafe',  // Light blue background for selected
              dark: '#1e3a8a',   // Dark blue background for selected
            },
          },
          green: {
            DEFAULT: '#10b981',  // Green for success/valid elements
          },
          red: {
            DEFAULT: '#ef4444',  // Red for errors/conflicts
          },
        },
      },
    },
  },
  plugins: [],
}

