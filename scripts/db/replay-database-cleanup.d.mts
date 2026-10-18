import type { Pool } from 'pg';

export declare function dropReplayDatabase(
  admin: Pick<Pool, 'query'>,
  name: string,
  timeoutMs?: number,
): Promise<void>;
