/** Typed boundary for the read-only, source-bound registration inspector. */
export interface RecipeRegistrationInspection {
  present: boolean;
  errors: string[];
  revisedPaths: string[];
  addedPaths: string[];
  predecessorFiles: Record<string,string>;
  registration?: Record<string,unknown>;
  packageSha256?: string;
}
export function inspectRecipeRegistration(root:string): RecipeRegistrationInspection;
export const RECIPE_REGISTRATION_SHA256:string;
export const RECIPE_PACKAGE_SHA256:string;
