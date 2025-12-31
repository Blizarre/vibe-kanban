// Shared Tailwind CSS class constants for consistent styling

// Button variants
export const buttonBase =
  "rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-opacity-50";

export const buttonPrimary = `${buttonBase} bg-sky-600 hover:bg-sky-500 text-white focus:ring-sky-400`;
export const buttonSecondary = `${buttonBase} bg-gray-600 hover:bg-gray-500 text-gray-200 focus:ring-gray-400`;
export const buttonDanger = `${buttonBase} bg-red-600 hover:bg-red-500 text-white focus:ring-red-400`;

// Icon button variants (rounded full)
export const iconButtonBase =
  "p-1.5 rounded-full focus:outline-none focus:ring-2 focus:ring-opacity-75 transition-all duration-150";

export const iconButtonSky = `${iconButtonBase} text-sky-400 hover:text-sky-200 hover:bg-sky-700 focus:ring-sky-500`;
export const iconButtonRed = `${iconButtonBase} text-red-400 hover:text-red-200 hover:bg-red-700 focus:ring-red-500`;

// Input field
export const inputField =
  "w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100 placeholder-gray-500 focus:ring-sky-500 focus:border-sky-500 focus:outline-none focus:ring-2";

// Modal
export const modalOverlay =
  "fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50";

export const modalCloseButton =
  "text-gray-400 hover:text-gray-200 transition-colors";

// Dropdown
export const dropdownContainer =
  "absolute z-50 mt-1 bg-gray-800 border border-gray-600 rounded-md shadow-lg max-h-64 overflow-y-auto";

export const dropdownItem =
  "w-full p-2 text-left hover:bg-gray-700 flex items-center gap-2";

export const dropdownItemSelected = `${dropdownItem} bg-gray-700`;
