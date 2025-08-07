import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface RoleAccessContextType {
  roles: any[];
  permissions: Map<string, boolean>;
  loading: boolean;
  error: string | null;
  hasPermission: (featureKey: string, permissionKey: string) => boolean;
  hasFeatureAccess: (featureKey: string) => boolean;
  setRoleData: (data: any) => void;
}

const RoleAccessContext = createContext<RoleAccessContextType | undefined>(undefined);

interface RoleAccessProviderProps {
  children: ReactNode;
  initialData?: any;
}

export const RoleAccessProvider = ({ children, initialData }: RoleAccessProviderProps) => {
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const hasPermission = (featureKey: string, permissionKey: string): boolean => {
    const key = `${featureKey}:${permissionKey}`;
    return permissions.has(key) && permissions.get(key) === true;
  };
  
  const hasFeatureAccess = (featureKey: string): boolean => {
    // Check if user has any permission for this feature
    return Array.from(permissions.keys()).some(key => key.startsWith(`${featureKey}:`)) || 
           permissions.has(`feature:${featureKey}`);
  };
  
  const setRoleData = (data: any): void => {
    if (!data || !data.roles) return;
    
    setRoles(data.roles);
    const permMap = new Map<string, boolean>();
    
    // Process roles and extract all permissions
    data.roles.forEach((role: any) => {
      if (role.modules) {
        role.modules.forEach((module: any) => {
          if (module.features) {
            module.features.forEach((feature: any) => {
              // Mark feature access
              permMap.set(`feature:${feature.feature_key}`, true);
              
              // Process individual permissions
              if (feature.permissions) {
                feature.permissions.forEach((permission: any) => {
                  permMap.set(`${feature.feature_key}:${permission.permission_key}`, true);
                });
              }
            });
          }
        });
      }
    });
    
    setPermissions(permMap);
    setLoading(false);
    setError(null);
  };
  
  // Process initial data when provided
  useEffect(() => {
    if (initialData) {
      setRoleData(initialData);
    }
  }, [initialData]);

  return (
    <RoleAccessContext.Provider 
      value={{ 
        roles, 
        permissions, 
        loading, 
        error, 
        hasPermission, 
        hasFeatureAccess,
        setRoleData 
      }}
    >
      {children}
    </RoleAccessContext.Provider>
  );
};

export const useRoleAccess = (): RoleAccessContextType => {
  const context = useContext(RoleAccessContext);
  if (context === undefined) {
    throw new Error('useRoleAccess must be used within a RoleAccessProvider');
  }
  return context;
};
