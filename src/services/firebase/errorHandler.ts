/**
 * @license
 * SITEFLOW Firebase Service Error Handler
 * Conforms strictly to FirestoreErrorInfo format required by the Firebase Integration Skill.
 */

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  currentUser?: {
    uid?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerData?: { providerId: string; email?: string | null }[];
  } | null
): never {
  const errMessage = error instanceof Error ? error.message : String(error);

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    operationType,
    path,
    authInfo: {
      userId: currentUser?.uid || null,
      email: currentUser?.email || null,
      emailVerified: currentUser?.emailVerified || null,
      isAnonymous: currentUser?.isAnonymous || null,
      tenantId: currentUser?.tenantId || null,
      providerInfo: currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email || null,
      })) || [],
    },
  };

  console.error('Firestore Error:', JSON.stringify(errInfo, null, 2));

  // Throw user-friendly error with JSON debug info attached
  if (errMessage.includes('permission-denied') || errMessage.includes('Missing or insufficient permissions')) {
    throw new Error('You do not have permission to access this area or perform this operation.');
  }

  if (errMessage.includes('not-found')) {
    throw new Error('The requested record was not found.');
  }

  if (errMessage.includes('the client is offline') || errMessage.includes('network-request-failed')) {
    throw new Error('Network connection issue. Please check your internet connection.');
  }

  throw new Error(errMessage || 'An unexpected database error occurred.');
}
