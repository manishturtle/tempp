/**
 * ImageUploadRegistry service
 * 
 * A global registry to keep track of image uploads and their associated components.
 * This ensures that images uploaded in one component aren't accidentally captured by another.
 */

import { createContext, useContext } from 'react';

// Define a type for an upload session
export interface UploadSession {
  id: string; // Unique session ID
  component: string; // Component that initiated the upload (e.g., 'product-form', 'variant-form')
  instanceId: string; // Specific instance ID of the component
  ownerType: 'product' | 'variant' | 'division' | 'category' | 'subcategory'; // Type of entity that owns this image
  ownerId?: number; // ID of the owner entity (if available)
  timestamp: number; // When the session was created
}

// The registry tracks all active upload sessions and file associations
class ImageUploadRegistryService {
  private sessions: Record<string, UploadSession> = {};
  private fileRegistry: Record<string, string> = {}; // Maps file.name => sessionId
  
  /**
   * Create a new upload session
   */
  createSession(component: string, instanceId: string, ownerType: 'product' | 'variant' | 'division' | 'category' | 'subcategory', ownerId?: number): string {
    const sessionId = `${component}-${instanceId}-${Date.now()}`;
    console.log(`ImageUploadRegistry: Creating new session ${sessionId} for ${component} (${ownerType}${ownerId ? ` ID: ${ownerId}` : ''})`);
    
    this.sessions[sessionId] = {
      id: sessionId,
      component,
      instanceId,
      ownerType,
      ownerId,
      timestamp: Date.now()
    };
    
    return sessionId;
  }
  
  /**
   * Register files with a session
   */
  registerFiles(sessionId: string, files: File[]): void {
    if (!this.sessions[sessionId]) {
      console.warn(`ImageUploadRegistry: Tried to register files for invalid session ${sessionId}`);
      return;
    }
    
    console.log(`ImageUploadRegistry: Registering ${files.length} files for session ${sessionId}`);
    
    // Register each file with this session
    files.forEach(file => {
      const fileId = this.generateFileId(file);
      this.fileRegistry[fileId] = sessionId;
    });
  }
  
  /**
   * Get the session associated with a file
   */
  getSessionForFile(file: File): UploadSession | null {
    const fileId = this.generateFileId(file);
    const sessionId = this.fileRegistry[fileId];
    
    if (!sessionId) {
      console.warn(`ImageUploadRegistry: No session found for file ${file.name}`);
      return null;
    }
    
    return this.sessions[sessionId] || null;
  }
  
  /**
   * Verify if a file belongs to a specific component instance
   */
  fileMatchesInstance(file: File, ownerType: 'product' | 'variant' | 'division' | 'category' | 'subcategory', instanceId: string): boolean {
    const session = this.getSessionForFile(file);
    
    if (!session) return false;
    
    const matches = session.ownerType === ownerType && session.instanceId === instanceId;
    
    if (!matches) {
      console.warn(`ImageUploadRegistry: File ${file.name} belongs to ${session.ownerType}/${session.instanceId}, not ${ownerType}/${instanceId}`);
    }
    
    return matches;
  }
  
  /**
   * Generate a unique ID for a file based on name, size and last modified
   */
  private generateFileId(file: File): string {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }
  
  /**
   * Clear expired sessions (older than 1 hour)
   */
  cleanup(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    
    Object.entries(this.sessions).forEach(([sessionId, session]) => {
      if (now - session.timestamp > oneHour) {
        console.log(`ImageUploadRegistry: Cleaning up expired session ${sessionId}`);
        delete this.sessions[sessionId];
        
        // Also clean up any files registered to this session
        Object.entries(this.fileRegistry).forEach(([fileId, registeredSessionId]) => {
          if (registeredSessionId === sessionId) {
            delete this.fileRegistry[fileId];
          }
        });
      }
    });
  }
}

// Create a singleton instance
export const imageUploadRegistry = new ImageUploadRegistryService();

// React context for using the registry in components
const ImageUploadRegistryContext = createContext<ImageUploadRegistryService>(imageUploadRegistry);

// Hook for accessing the registry from components
export const useImageUploadRegistry = () => useContext(ImageUploadRegistryContext);

export default imageUploadRegistry;
