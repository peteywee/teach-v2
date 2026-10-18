export type ContentVersion = { version: string; digest: string };
export type ContentRecord = { id: string; organizationId: string; version: string; digest: string; canonicalJson: string };
export type Evaluation = { engineVersion: '1.0.0'; blockId: string; selectedOptionIndex: number; matchesExpectedChoice: boolean; feedback: string };
export interface ContentPort {
 getVersion(id:string,organizationId:string,version:string): Promise<ContentRecord|null>;
 publish(value:ContentRecord): Promise<void>;
}
