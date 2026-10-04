import type { IdentityRecord } from '../../domain/identity.js';

export interface IdentityRepository {
  create(input: { readonly id: string; readonly now: Date }): Promise<IdentityRecord>;
  getById(id: string): Promise<IdentityRecord | null>;
  deactivate(input: { readonly id: string; readonly now: Date }): Promise<IdentityRecord>;
  reactivate(input: { readonly id: string; readonly now: Date }): Promise<IdentityRecord>;
}

export class IdentityNotFoundError extends Error {
  constructor() {
    super('Identity not found');
    this.name = 'IdentityNotFoundError';
  }
}

export class IdentityTransitionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentityTransitionConflictError';
  }
}
