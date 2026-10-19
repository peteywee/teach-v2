import { databaseObject } from '../../../../platform/database-target.js';
import type {ContentPort,ContentRecord} from '../../application/ports/demo-content.js';
import {parseStrictJson,validateContent} from '../../domain/demo-content.js';
type Query={query<T>(text:string,values?:readonly unknown[]):Promise<T[]>};
export class PostgresDemoContent implements ContentPort {
 constructor(private readonly db:Query){}
 async getVersion(id:string,organizationId:string,version:string){const [r]=await this.db.query<ContentRecord>(`SELECT p.id,p.organization_id AS "organizationId",v.version,v.digest,v.canonical_json AS "canonicalJson" FROM ${databaseObject("content_packs")} p JOIN ${databaseObject("content_pack_versions")} v ON v.content_pack_id=p.id WHERE p.id=$1 AND p.organization_id=$2 AND v.version=$3 FOR SHARE OF p,v`,[id,organizationId,version]);if(r)this.validate(r);return r??null;}
 private validate(v:ContentRecord){const c=validateContent(parseStrictJson(v.canonicalJson));if(c.canonicalJson!==v.canonicalJson||c.digest!==v.digest||c.content.contentPackId!==v.id||c.content.organizationId!==v.organizationId||c.content.version!==v.version)throw Error('Invalid persisted content binding');}
 async publish(v:ContentRecord){this.validate(v);await this.db.query(`INSERT INTO ${databaseObject("content_packs")}(id,organization_id) VALUES($1,$2)`,[v.id,v.organizationId]);await this.db.query(`INSERT INTO ${databaseObject("content_pack_versions")}(content_pack_id,version,digest,canonical_json) VALUES($1,$2,$3,$4)`,[v.id,v.version,v.digest,v.canonicalJson]);}
}
