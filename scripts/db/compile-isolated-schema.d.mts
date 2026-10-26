export interface IsolatedMigration { name: string; historicalSha256: string; isolatedSha256: string; when: number }
export interface IsolatedLineage { files: Map<string, string>; manifest: { version: number; schema: string; journal: string; historicalJournalSha256: string; tables: string[]; functions: string[]; migrations: IsolatedMigration[] } }
export const ISOLATED_SCHEMA: 'teach_v2_demo';
export const REPOSITORY_ROOT: string;
export const HISTORICAL_PINS: Readonly<Record<string, string>>;
export function buildIsolatedLineage(root?: string): IsolatedLineage;
export function verifyIsolatedLineage(root?: string): IsolatedLineage;
export function sha256(value: string | Buffer): string;
export function tokenizeSql(sql: string): Array<{kind: string; text: string; value?: string; body?: string}>;
export function qualifySql(sql: string, objectNames: Set<string>): string;
