import React, { ReactNode } from 'react';
import { useRoleAccess } from '../../../contexts/ai-platform/RoleAccessContext';

interface FeatureGuardProps {
  featureKey: string;
  permissionKey?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * FeatureGuard - Conditionally render components based on user's feature access
 * 
 * @param featureKey - The feature key to check access for
 * @param permissionKey - Optional specific permission key within the feature
 * @param fallback - Optional fallback UI to show when access is denied
 * @param children - Content to render when access is granted
 */
const FeatureGuard = ({ 
  featureKey, 
  permissionKey,
  fallback = null, 
  children 
}: FeatureGuardProps): React.ReactElement | null => {
  const { hasPermission, hasFeatureAccess, loading } = useRoleAccess();
  
  // Don't render anything while loading permissions
  if (loading) {
    return null;
  }
  
  // Check if user has access to this feature/permission
  const hasAccess = permissionKey 
    ? hasPermission(featureKey, permissionKey)
    : hasFeatureAccess(featureKey);
  
  // Render children if access is granted, otherwise show fallback
  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default FeatureGuard;
