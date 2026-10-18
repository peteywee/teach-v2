/** Typed fail-closed boundary for the independently reviewed local storage successor. */
export interface DemoRecipePhysicalInspection {
  errors: string[];
  present: boolean;
  admitted: boolean;
  migrationCount?: number;
  addedPaths?: string[];
  revisedPaths?: string[];
  envelope?: Record<string,unknown>;
}
export function inspectDemoRecipePhysicalSuccessor(root:string): DemoRecipePhysicalInspection;
export const DEMO_RECIPE_REVIEWED_SOURCE_PATHS: readonly string[];
export function demoRecipeReviewedSourceHashes(root: string): Record<string, string>;
