/// <reference types="react-scripts" />

// This file is needed for TypeScript to understand JSX and React types
// when using Create React App with TypeScript

// Add this if you're using CSS modules
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

// Add this if you're using SCSS modules
declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}
