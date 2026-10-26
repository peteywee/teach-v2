/** Test-only payload derived from the canonical synthetic catalog; never a browser asset. */
import {readFileSync} from 'node:fs';
import {content} from './fixtures.mjs';
const source=JSON.parse(readFileSync(new URL('../../domains/demo-kitchen/proposal-0.1.0/synthetic-content-template-1.2.0.json',import.meta.url),'utf8'));
export function stationContent(){
 const {stations,people,equipment,inventory,recipes}=structuredClone(source);
 // Retain the test assignment's exact immutable reference, as the recipe tests do.
 return {...structuredClone(content),schemaVersion:'1.2.0',stations,people,equipment,inventory,recipes};
}
