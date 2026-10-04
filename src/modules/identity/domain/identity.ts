export const identityStatuses = ['ACTIVE', 'INACTIVE', 'DELETED'] as const;
export type IdentityStatus = (typeof identityStatuses)[number];

export interface IdentityRecord {
  readonly id: string;
  readonly status: IdentityStatus;
  readonly offboardedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export function assertAllowedIdentityTransition(
  from: IdentityStatus,
  to: IdentityStatus,
): void {
  if (to === 'DELETED' && from !== 'DELETED') {
    throw new RangeError(
      'Identity DELETED ingress is not authorized while C15 deletion semantics remain unresolved',
    );
  }
  if (from === 'DELETED' && to !== 'DELETED') {
    throw new RangeError('Identity DELETED is terminal');
  }
  if (
    from !== to &&
    !(
      (from === 'ACTIVE' && to === 'INACTIVE') ||
      (from === 'INACTIVE' && to === 'ACTIVE')
    )
  ) {
    throw new RangeError(`unsupported Identity transition ${from} -> ${to}`);
  }
}
