import type {Scope} from '../../../organization/application/ports/demo-organization.js';
import type {ContentRecord} from './demo-content.js';
import type {KitchenDraftCatalog} from '../../domain/demo-authoring.js';
export interface AuthoringContentRef {contentPackId:string;version:string;digest:string}
export interface AuthoringOwner extends Scope {runId:string;managerIdentityId:string}
export interface ContentDraft extends AuthoringOwner {
 id:string;contentPackId:string;baseContentRef:AuthoringContentRef;revision:number;catalog:KitchenDraftCatalog;catalogDigest:string;createdAt:Date;updatedAt:Date;
 lastPublished:{revision:number;contentRef:AuthoringContentRef}|null;
}
export interface AuthoringPort {

 getDraft(owner:AuthoringOwner):Promise<ContentDraft|null>;
 saveDraft(value:ContentDraft,expectedRevision:number):Promise<boolean>;
 listPublished(owner:AuthoringOwner,contentPackId:string):Promise<ContentRecord[]>;
 appendVersion(owner:AuthoringOwner,value:ContentRecord):Promise<void>;
 markPublished(owner:AuthoringOwner,draftId:string,revision:number,contentRef:AuthoringContentRef):Promise<boolean>;
}
