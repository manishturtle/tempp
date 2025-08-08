// /**
//  * Theme Context Provider
//  * 
//  * This context manages the application theme state (light/dark mode and color themes)
//  */

// 'use client';

// import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// type ThemeMode = 'light' | 'dark';
// type ColorTheme = 'blue' | 'purple' | 'green' | 'teal' | 'indigo' | 'amber';

// interface ThemeContextType {
//   mode: ThemeMode;
//   colorTheme: ColorTheme;
//   toggleMode: () => void;
//   setColorTheme: (theme: ColorTheme) => void;
// }

// const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// export const ThemeProvider = ({ children }: { children: ReactNode }) => {
//   // Initialize state from localStorage if available, otherwise use defaults
//   const [mode, setMode] = useState<ThemeMode>('light');
//   const [colorTheme, setColorTheme] = useState<ColorTheme>('blue');

//   // Load saved preferences on mount
//   useEffect(() => {
//     const savedMode = localStorage.getItem('themeMode') as ThemeMode;
//     const savedColorTheme = localStorage.getItem('colorTheme') as ColorTheme;
    
//     if (savedMode) setMode(savedMode);
//     if (savedColorTheme) setColorTheme(savedColorTheme);
//   }, []);

//   // Update localStorage when preferences change
//   useEffect(() => {
//     localStorage.setItem('themeMode', mode);
//     localStorage.setItem('colorTheme', colorTheme);
    
//     // Apply theme to document
//     document.documentElement.classList.remove('light', 'dark');
//     document.documentElement.classList.add(mode);
    
//     // Apply color theme
//     document.documentElement.setAttribute('data-color-theme', colorTheme);
//   }, [mode, colorTheme]);

//   const toggleMode = () => {
//     setMode(prevMode => prevMode === 'light' ? 'dark' : 'light');
//   };

//   return (
//     <ThemeContext.Provider value={{ mode, colorTheme, toggleMode, setColorTheme }}>
//       {children}
//     </ThemeContext.Provider>
//   );
// };

// // Custom hook for using the theme context
// export const useTheme = () => {
//   const context = useContext(ThemeContext);
//   if (context === undefined) {
//     throw new Error('useTheme must be used within a ThemeProvider');
//   }
//   return context;
// };
