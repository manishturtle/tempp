'use client';

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';

/**
 * AccessibilityChecker component
 * 
 * This component integrates axe-core for automated accessibility testing during development.
 * It doesn't render anything visible but runs accessibility checks in the background.
 * 
 * Target: WCAG 2.1 Level AA compliance
 * 
 * Note: Automated testing tools like axe-core are helpful but do not catch all issues.
 * Manual testing is still essential:
 * - Keyboard navigation testing
 * - Screen reader compatibility
 * - Color contrast verification
 * - Focus management
 * - Alternative text quality
 */
const AccessibilityChecker: React.FC = () => {
  useEffect(() => {
    // Run only in development environment and in the browser
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      // Dynamically import axe to avoid including it in production bundle
      import('@axe-core/react').then((axe) => {
        // Run axe after a short delay to allow page content to render
        const RENDER_DELAY = 1000; // Adjust as needed
        setTimeout(() => {
          axe.default(React, ReactDOM, RENDER_DELAY);
          console.log('Axe accessibility check ran. Target: WCAG 2.1 Level AA');
        }, RENDER_DELAY);
      });
    }
  }, []); // Run only once on mount

  return null; // This component doesn't render anything visible
};

export default AccessibilityChecker;
