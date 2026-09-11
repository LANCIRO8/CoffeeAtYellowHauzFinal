import { auth } from '../firebase';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errorCode = (error as any)?.code || '';

  const isPermissionDenied =
    errMsg.toLowerCase().includes('permission') ||
    errMsg.toLowerCase().includes('missing or insufficient') ||
    errorCode === 'permission-denied';

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth?.currentUser?.uid ?? null,
      email: auth?.currentUser?.email ?? null,
      emailVerified: auth?.currentUser?.emailVerified ?? null,
      isAnonymous: auth?.currentUser?.isAnonymous ?? null,
      tenantId: auth?.currentUser?.tenantId ?? null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  if (isPermissionDenied) {
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  }

  // Non-permission error (quota exceeded, offline, resource-exhausted, etc.)
  // Log as warning and allow graceful fallback to offline/cached storage without crashing the app
  console.warn(`Firestore sync note (${operationType} on "${path}"): ${errMsg}. Utilizing local storage cache.`);
}
