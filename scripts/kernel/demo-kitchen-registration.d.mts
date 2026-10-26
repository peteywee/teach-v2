/** Source integrity only; never independent review or physical admission. */
export interface KitchenRegistrationInspection {
  present: boolean;
  errors: string[];
  revisedPaths: string[];
  addedPaths: string[];
  predecessorFiles: Record<string,string>;
  registration?: Record<string,unknown>;
  packageSha256?: string;
}
export function inspectKitchenRegistration(root:string): KitchenRegistrationInspection;
export const KITCHEN_BASE:string;
export const KITCHEN_PROPOSAL:string;
export const KITCHEN_PACKAGE_ID:string;
export const KITCHEN_SCHEMA_PROJECTION:string;
export const KITCHEN_PACKAGE_SHA256:string;
export const KITCHEN_REGISTRATION_SHA256:string;
export const KITCHEN_REVISED_PATHS:readonly string[];
