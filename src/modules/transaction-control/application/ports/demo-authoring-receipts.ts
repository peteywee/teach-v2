import type {AuthoringOwner} from '../../../content/application/ports/demo-authoring.js';
export type AuthoringMutation='SaveContentDraft'|'PublishContentDraft';
export interface AuthoringReceipt extends AuthoringOwner {key:string;operation:AuthoringMutation;payloadDigest:string;result:Record<string,unknown>;createdAt:Date;expiresAt:Date}
export interface AuthoringReceiptPort {get(owner:AuthoringOwner,key:string):Promise<AuthoringReceipt|null>;countOwnedReceipts(owner:AuthoringOwner):Promise<number>;put(receipt:AuthoringReceipt):Promise<void>}
