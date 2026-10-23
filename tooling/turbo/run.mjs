import { spawnSync } from 'node:child_process';
import { dirname, delimiter, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const tooling = dirname(fileURLToPath(import.meta.url));
const root = resolve(tooling, '../..');
const result = spawnSync(process.execPath, [
  resolve(tooling, 'node_modules/turbo/bin/turbo'),
  '--skip-infer',
  'run',
  ...process.argv.slice(2),
  '--cwd', root,
  '--cache=local:rw',
], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    TURBO_TELEMETRY_DISABLED: '1',
    PATH: [dirname(process.execPath), process.env.PATH].filter(Boolean).join(delimiter),
    TEACH_TURBO_RUNTIME: `${process.version}/${process.platform}/${process.arch}`,
  },
});
if (result.error) {
  console.error(`Unable to start Turborepo: ${result.error.message}`);
}
process.exitCode = result.status ?? 1;
