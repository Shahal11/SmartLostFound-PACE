/** @type {import('tailwindcss').Config} */
// We need to import the default theme to extend it, especially for fonts
const { fontFamily } = require('tailwindcss/defaultTheme');

module.exports = {
  // 'content' tells Tailwind which files to scan for classes
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scans all .js, .jsx, etc. files in your src folder
  ],
  theme: {
    extend: {
      // --- Font Family (from your mockup specs) ---
      fontFamily: {
        // Sets 'Poppins' as the default sans-serif font
        sans: ['Poppins', ...fontFamily.sans],
      },
      // --- Custom Color Palette (from your mockup screenshots) ---
      colors: {
        'pace-blue': {
          DEFAULT: '#0052CC', // The main bright blue for buttons and links
          dark: '#0040A3',   // A darker shade for hover effects
          light: '#F4F8FF',  // The very light blue for page backgrounds
        },
        'pace-yellow': {
          DEFAULT: '#FFAB00', // The accent yellow for rewards and some highlights
        },
        'pace-red': {
          DEFAULT: '#DE350B', // The red color for "Lost" status and errors
        },
        'pace-green': {
          DEFAULT: '#36B37E', // The green color for "Safe" status and success
        },
        'ink': { // The text colors from your mockups for better readability
          darkest: '#172B4D', // For headlines
          dark: '#42526E',    // For primary body text
          light: '#5E6C84',   // For sub-headings and descriptions
          lightest: '#6B778C', // For helper text
        }
      }
    },
  },
  plugins: [
    // You can add Tailwind plugins here later if needed (e.g., @tailwindcss/forms)
  ],
}