import React, { createContext, useContext, useState, ReactNode } from 'react';

// Define the context type
interface DrawerContextType {
  // Drawer state
  isOpen: boolean;
  drawerMode: 'add' | 'edit' | 'view';
  activeSidebarItem: string | null;
  formData: Record<string, any>;
  
  // Drawer actions
  openDrawer: (mode: 'add' | 'edit' | 'view') => void;
  closeDrawer: () => void;
  setActiveSidebarItem: (itemId: string | null) => void;
  updateFormData: (data: Record<string, any>) => void;
  resetFormData: () => void;
}

// Create the context with a default value
const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

// Provider component
interface DrawerProviderProps {
  children: ReactNode;
}

export const DrawerProvider: React.FC<DrawerProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'add' | 'edit' | 'view'>('view');
  const [activeSidebarItem, setActiveSidebarItem] = useState<string | null>('view');
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Open drawer with specified mode
  const openDrawer = (mode: 'add' | 'edit' | 'view') => {
    setDrawerMode(mode);
    setIsOpen(true);
    // Set default sidebar item based on mode
    setActiveSidebarItem(mode === 'add' ? 'edit' : 'view');
  };

  // Close drawer
  const closeDrawer = () => {
    setIsOpen(false);
    // Reset form data when drawer is closed
    resetFormData();
  };

  // Update form data
  const updateFormData = (data: Record<string, any>) => {
    setFormData(prevData => ({
      ...prevData,
      ...data
    }));
  };

  // Reset form data
  const resetFormData = () => {
    setFormData({});
  };

  return (
    <DrawerContext.Provider
      value={{
        isOpen,
        drawerMode,
        activeSidebarItem,
        formData,
        openDrawer,
        closeDrawer,
        setActiveSidebarItem,
        updateFormData,
        resetFormData
      }}
    >
      {children}
    </DrawerContext.Provider>
  );
};

// Custom hook to use the drawer context
export const useDrawer = (): DrawerContextType => {
  const context = useContext(DrawerContext);
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider');
  }
  return context;
};
