export interface AuthoringRegistrationInspection { present:boolean; errors:string[]; revisedPaths:string[]; addedPaths:string[]; predecessorFiles:Record<string,string>; registration?:Record<string,unknown>; packageSha256?:string; }
export function inspectAuthoringRegistration(root:string):AuthoringRegistrationInspection;
export const AUTHORING_BASE:string, AUTHORING_PROPOSAL:string, AUTHORING_PACKAGE_ID:string, AUTHORING_BASELINE:string, AUTHORING_BASELINE_TREE:string;
export const AUTHORING_REGISTRATION_SHA256:string|null, AUTHORING_PACKAGE_SHA256:string|null, AUTHORING_SOURCE_SHA256:string|null, AUTHORING_APPROVAL_SHA256:string|null;
export const AUTHORING_OPERATIONS:readonly string[], AUTHORING_TABLES:readonly string[];
