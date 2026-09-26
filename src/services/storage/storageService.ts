/**
 * @license
 * SITEFLOW Firebase Storage Service
 * Enforces company-scoped paths: `companies/{companyId}/employees/{employeeId}/{fileName}`
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, firebaseStatus } from '../firebase/firebaseApp';

export const storageService = {
  /**
   * Upload profile photo
   */
  async uploadProfilePhoto(companyId: string, employeeId: string, file: File): Promise<string> {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload a valid image file (PNG, JPG, WEBP).');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('File size exceeds 5MB limit.');
    }

    if (storage && firebaseStatus.isConfigured) {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `companies/${companyId}/employees/${employeeId}/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      return await getDownloadURL(snapshot.ref);
    } else {
      // Sandbox fallback: convert to base64 Data URL for local persistence
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });
    }
  },
};
