import {createHash} from 'node:crypto';
import {canonicalJson,validateContent,type StationTeachingContent,type ValidatedContent} from './demo-content.js';

export type KitchenDraftCatalog=Pick<StationTeachingContent,'stations'|'equipment'|'inventory'|'recipes'>;
export type AuthoringIssue={path:string;rule:string};
export const AUTHORING_LIMITS=Object.freeze({stations:12,equipment:40,inventory:80,recipes:24,catalogBytes:49152,saves:100,publications:10,receiptKeys:256});
export class AuthoringValidationError extends Error {
 readonly details:readonly AuthoringIssue[];
 constructor(details:AuthoringIssue[]){super('Invalid authoring catalog');this.name='AuthoringValidationError';this.details=Object.freeze(details.slice(0,50).map(x=>Object.freeze({...x})));}
}
export function catalogOf(content:StationTeachingContent):KitchenDraftCatalog{return structuredClone({stations:content.stations,equipment:content.equipment,inventory:content.inventory,recipes:content.recipes});}
export function catalogDigest(catalog:KitchenDraftCatalog):string{return 'sha256:'+createHash('sha256').update(canonicalJson(catalog)).digest('hex');}
export function validateAuthoringCatalog(value:unknown,base:StationTeachingContent):KitchenDraftCatalog{
 const issues:AuthoringIssue[]=[];const issue=(path:string,rule:string)=>{if(issues.length<50)issues.push({path,rule});};
 try{const bytes=Buffer.byteLength(canonicalJson(value),'utf8');if(bytes>AUTHORING_LIMITS.catalogBytes)issue('/catalog','too_large');}catch{throw new AuthoringValidationError([{path:'/catalog',rule:'invalid_json'}]);}
 const object=(v:unknown,keys:string[],path:string):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v)){issue(path,'object_required');return {};}
  const o=v as Record<string,unknown>;if(Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))issue(path,'exact_fields_required');return o;};
 const array=(v:unknown,max:number,path:string):unknown[]=>{if(!Array.isArray(v)){issue(path,'list_required');return [];}if(v.length<1||v.length>max)issue(path,'count_out_of_bounds');return v.slice(0,max+1);};
 const text=(v:unknown,max:number,path:string)=>{if(typeof v!=='string'||v.trim().length===0){issue(path,'name_required');return;}if([...v].length>max)issue(path,'text_too_long');if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v)||/<[^>]*>|\b(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|https?:|ftp:|file:|data:|javascript:|vbscript:|mailto:|tel:|www\.)|(?:^|[\s("'])\/\/\S+/i.test(v))issue(path,'plain_text_required');};
 const id=(v:unknown,path:string):string=>{if(typeof v!=='string'||!/^[A-Za-z0-9_-]{1,128}$(?![\s\S])/.test(v)){issue(path,'identifier_required');return '';}return v;};
 const quantity=(v:unknown,path:string)=>{if(typeof v!=='number'||!Number.isSafeInteger(v)||v<1||v>100)issue(path,'quantity_out_of_bounds');};
 const root=object(value,['stations','equipment','inventory','recipes'],'/catalog');const people=new Set(base.people.map(p=>p.id)),stations=new Set<string>(),equipment=new Set<string>(),recipes=new Set<string>();
 const unique=(set:Set<string>,v:unknown,path:string)=>{const key=id(v,path);if(key&&set.has(key))issue(path,'duplicate_identifier');if(key)set.add(key);return key;};
 array(root.stations,12,'/catalog/stations').forEach((v,i)=>{const p=`/catalog/stations/${i}`,o=object(v,['id','label','responsiblePersonId'],p);unique(stations,o.id,p+'/id');text(o.label,80,p+'/label');if(!people.has(id(o.responsiblePersonId,p+'/responsiblePersonId')))issue(p+'/responsiblePersonId','unknown_person');});
 array(root.equipment,40,'/catalog/equipment').forEach((v,i)=>{const p=`/catalog/equipment/${i}`,o=object(v,['id','label','kind'],p);unique(equipment,o.id,p+'/id');text(o.label,80,p+'/label');if(o.kind!=='TOOL'&&o.kind!=='EQUIPMENT')issue(p+'/kind','equipment_kind_required');});
 const requirement=(v:unknown,p:string,keys=['equipmentId','quantity'])=>{const o=object(v,keys,p);const key=id(o.equipmentId,p+'/equipmentId');if(!equipment.has(key))issue(p+'/equipmentId','unknown_equipment');quantity(o.quantity,p+'/quantity');return {o,key};};
 const holdings=new Set<string>();array(root.inventory,80,'/catalog/inventory').forEach((v,i)=>{const p=`/catalog/inventory/${i}`,{o,key}=requirement(v,p,['equipmentId','stationId','quantity']);if(o.stationId!==null&&!stations.has(id(o.stationId,p+'/stationId')))issue(p+'/stationId','unknown_station');const binding=JSON.stringify([key,o.stationId]);if(holdings.has(binding))issue(p,'duplicate_holding');holdings.add(binding);});
 array(root.recipes,24,'/catalog/recipes').forEach((v,i)=>{const p=`/catalog/recipes/${i}`,o=object(v,['id','title','stationId','servings','ingredients','steps','reference','requirements'],p);unique(recipes,o.id,p+'/id');text(o.title,160,p+'/title');if(!stations.has(id(o.stationId,p+'/stationId')))issue(p+'/stationId','unknown_station');quantity(o.servings,p+'/servings');text(o.reference,1000,p+'/reference');array(o.ingredients,30,p+'/ingredients').forEach((x,j)=>text(x,500,p+`/ingredients/${j}`));array(o.steps,20,p+'/steps').forEach((x,j)=>text(x,2000,p+`/steps/${j}`));const required=new Set<string>();array(o.requirements,20,p+'/requirements').forEach((x,j)=>{const {key}=requirement(x,p+`/requirements/${j}`);if(required.has(key))issue(p+`/requirements/${j}/equipmentId`,'duplicate_requirement');required.add(key);});});
 if(issues.length)throw new AuthoringValidationError(issues);
 try{const validated=validateContent({...structuredClone(base),...structuredClone(value as KitchenDraftCatalog)});if(validated.content.schemaVersion!=='1.2.0')throw Error();return catalogOf(validated.content);}catch{throw new AuthoringValidationError([{path:'/catalog',rule:'invalid_catalog'}]);}
}
export function composeAuthoredContent(base:StationTeachingContent,catalog:KitchenDraftCatalog,version:string):ValidatedContent{
 const safe=validateAuthoringCatalog(catalog,base);return validateContent({...structuredClone(base),...safe,version});
}
