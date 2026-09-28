/**
 * @license
 * SITEFLOW Firebase Storage Service
 * Phase 0.4B Cloud Storage Security & Error Handling
 * Enforces company-scoped paths: `companies/{companyId}/employees/{employeeId}/{fileName}`
 */

import { ref, uploadBytes, getDownloadURL, type StorageError } from 'firebase/storage';
import { storage, firebaseStatus } from '../firebase/firebaseApp';

export class StorageSecurityError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'StorageSecurityError';
  }
}

export const storageService = {
  /**
   * Upload profile photo with explicit validation and storage error handling.
   * Guarantees that Storage failures NEVER affect Firebase Auth state.
   */
  async uploadProfilePhoto(companyId: string, employeeId: string, file: File): Promise<string> {
    if (!file) {
      throw new Error('No file provided for upload.');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload a valid image file (PNG, JPG, WEBP).');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit.');
    }

    // Tenant and employee ID path validation
    if (!companyId || !companyId.trim() || companyId.includes('/') || companyId.includes('..')) {
      throw new Error('Invalid company identifier for storage operations.');
    }
    if (!employeeId || !employeeId.trim() || employeeId.includes('/') || employeeId.includes('..')) {
      throw new Error('Invalid employee identifier for storage operations.');
    }

    if (storage && firebaseStatus.isConfigured) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `companies/${companyId}/employees/${employeeId}/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      try {
        const snapshot = await uploadBytes(storageRef, file, {
          contentType: file.type,
        });

        return await getDownloadURL(snapshot.ref);
      } catch (err: unknown) {
        const storageErr = err as StorageError;
        console.warn(`[SITEFLOW] Storage operation rejected at "${storagePath}":`, storageErr?.code || storageErr);

        if (storageErr?.code === 'storage/unauthorized') {
          throw new StorageSecurityError(
            'Storage permission denied: File access is restricted under tenant isolation policy.',
            storageErr.code
          );
        } else if (storageErr?.code === 'storage/quota-exceeded') {
          throw new StorageSecurityError(
            'Storage quota exceeded for this workspace.',
            storageErr.code
          );
        } else if (storageErr?.code === 'storage/canceled') {
          throw new StorageSecurityError(
            'Upload was canceled by the client.',
            storageErr.code
          );
        } else {
          throw new StorageSecurityError(
            storageErr?.message || 'Failed to upload photo to secure storage.',
            storageErr?.code
          );
        }
      }
    } else {
      // Sandbox fallback: convert to base64 Data URL for local persistence
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image in local preview mode.'));
        reader.readAsDataURL(file);
      });
    }
  },
};

