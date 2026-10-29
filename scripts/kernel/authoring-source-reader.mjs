import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const authoringHash = bytes => createHash('sha256').update(bytes).digest('hex');
export function authoringPath(path) {
  if (typeof path !== 'string' || !/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(path) || path.split('/').some(part => part === '.' || part === '..')) throw Error('finite repository-relative path required');
  return path;
}
/** Fresh synchronous snapshot only. Never shares bytes, stat results or verdicts
 * between inspections, so a mutation immediately after success is rechecked. */
export function authoringReader(root) {
  const bytes = new Map(), directories = new Set();
  const regular = (path, directory = false) => {
    const parts = authoringPath(path).split('/');
    for (let index = 1; index <= parts.length; index++) {
      const ancestor = parts.slice(0, index).join('/');
      const isDirectory = index < parts.length || directory;
      if (isDirectory && directories.has(ancestor)) continue;
      const stat = lstatSync(join(root, ancestor));
      if (stat.isSymbolicLink() || (isDirectory ? !stat.isDirectory() : !stat.isFile())) throw Error(`regular file/ancestor required: ${path}`);
      if (isDirectory) directories.add(ancestor);
    }
  };
  return {
    read(path) { if (!bytes.has(path)) { regular(path); bytes.set(path, readFileSync(join(root, path), 'utf8')); } return bytes.get(path); },
    inventory(path) { regular(path, true); return readdirSync(join(root, path), { withFileTypes: true }); },
  };
}
export function exactAuthoringDirectory(reader, path, files, directories = []) {
  const actual = reader.inventory(path);
  const expected = [...files, ...directories].sort();
  if (JSON.stringify(actual.map(entry => entry.name).sort()) !== JSON.stringify(expected) || actual.some(entry => directories.includes(entry.name) ? !entry.isDirectory() : !entry.isFile())) throw Error(`exact regular-file evidence inventory required: ${path}`);
}
