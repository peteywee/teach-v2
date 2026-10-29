/** Presentation-only editing helpers. Persisted drafts and permission remain server owned. */
const clone=value=>structuredClone(value);
const collections={station:'stations',equipment:'equipment',recipe:'recipes'};
const textLimits={label:80,title:160,reference:1000};
export const authoringIssueMessages=Object.freeze({
 REQUIRED:'Enter a value.', TOO_LONG:'Shorten this value to the stated limit.', PLAIN_TEXT:'Use plain text without links, markup or control characters.',
 QUANTITY:'Enter a whole number from 1 to 100.', REFERENCE:'Choose an item from this draft.', DUPLICATE:'Use each linked item or holding location only once.',
 LIMIT:'This draft has reached the stated demo limit.', REFERENCED:'This item is still referenced. Change its recipe requirements or holdings first.',
 MINIMUM:'Keep at least one item in this collection.', EMPTY_LIST:'Add at least one entry.', TOO_LARGE:'This draft is too large for the demo. Shorten the text or reduce its contents.',
 INVALID:'Check this field before saving.'
});
export const issueMessage=code=>authoringIssueMessages[code]||authoringIssueMessages.INVALID;
export function currentCatalog(workspace){return clone(workspace.draft?.catalog??workspace.source.catalog);}
export function baselineCatalog(workspace){return clone(workspace.latestPublished?.catalog??workspace.source.catalog);}
export function createAuthoringForm(workspace,kind,id=null,{duplicate=false,makeId=()=>crypto.randomUUID()}={}){
 const catalog=currentCatalog(workspace),collection=collections[kind];if(!collection)throw new Error('Unknown authoring form');
 const source=id===null?null:catalog[collection].find(x=>x.id===id);if(id!==null&&!source)throw new Error('Missing authoring item');
 if(duplicate&&kind!=='recipe')throw new Error('Only recipes may be duplicated');
 const itemId=source&&!duplicate?source.id:makeId();let fields;
 if(kind==='station')fields={label:source?.label??'',responsiblePersonId:source?.responsiblePersonId??workspace.source.people[0]?.id??''};
 if(kind==='equipment')fields={label:source?.label??'',kind:source?.kind??'TOOL',holdings:source?catalog.inventory.filter(x=>x.equipmentId===id).map(x=>({stationId:x.stationId===null?'shared':x.stationId,quantity:String(x.quantity)})):[]};
 if(kind==='recipe')fields={title:duplicate?`${[...source.title].slice(0,150).join('')} copy`:source?.title??'',stationId:source?.stationId??catalog.stations[0]?.id??'',servings:String(source?.servings??1),ingredientsText:source?.ingredients.join('\n')??'',stepsText:source?.steps.join('\n')??'',reference:source?.reference??'Fictional planning sample only. Not an approved cooking or food-safety procedure.',requirements:source?source.requirements.map(x=>({equipmentId:x.equipmentId,quantity:String(x.quantity)})):[]};
 return {kind,id:itemId,isNew:!source||duplicate,fields,original:clone(fields),dirty:duplicate,issues:[]};
}
export function updateAuthoringForm(form,path,value){
 const next=clone(form),fields=next.fields;
 const allowed=form.kind==='station'?['label','responsiblePersonId']:form.kind==='equipment'?['label','kind']:['title','stationId','servings','ingredientsText','stepsText','reference'];
 if(allowed.includes(path))fields[path]=String(value);
 else {const match=/^(holdings|requirements)\.(\d+)\.(stationId|equipmentId|quantity)$/.exec(path);if(!match)return form;const [,list,index,key]=match;if(!Array.isArray(fields[list])||!fields[list][Number(index)]||!((list==='holdings'&&['stationId','quantity'].includes(key))||(list==='requirements'&&['equipmentId','quantity'].includes(key))))return form;fields[list][Number(index)][key]=String(value);}
 next.dirty=JSON.stringify(next.fields)!==JSON.stringify(next.original)||next.isNew;next.issues=[];return next;
}
export function changeAuthoringRows(form,list,index=null){
 if(!((form.kind==='equipment'&&list==='holdings')||(form.kind==='recipe'&&list==='requirements')))return form;
 const next=clone(form),rows=next.fields[list];
 if(index===null){if(rows.length>=(list==='requirements'?20:80))return form;rows.push(list==='holdings'?{stationId:'shared',quantity:'1'}:{equipmentId:'',quantity:'1'});}
 else {if(!Number.isInteger(index)||index<0||index>=rows.length)return form;rows.splice(index,1);}
 next.dirty=true;next.issues=[];return next;
}
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
function textIssue(value,max,path,issues){
 if(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value))issues.push({path,code:'PLAIN_TEXT'});
 if(!value.trim())issues.push({path,code:'REQUIRED'});
 else if([...value].length>max)issues.push({path,code:'TOO_LONG'});
 else if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)||/<[^>]*>/u.test(value)||/(^|[^A-Za-z0-9_])([A-Za-z][A-Za-z0-9+.-]*:\/\/|https?:|ftp:|file:|data:|javascript:|vbscript:|mailto:|tel:|www\.)/iu.test(value)||/(^|[\s("'])\/\/\S/u.test(value))issues.push({path,code:'PLAIN_TEXT'});
}
function positive(value,path,issues){if(!/^[1-9]\d{0,2}$/.test(value)||Number(value)>100){issues.push({path,code:'QUANTITY'});return 0;}return Number(value);}
const lines=value=>value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
export function authoringCandidate(workspace,form){
 const catalog=currentCatalog(workspace),issues=[],f=form.fields,collection=collections[form.kind],existing=catalog[collection].findIndex(x=>x.id===form.id);let item;
 if(form.isNew&&catalog[collection].length>=(workspace.limits[collection]??{stations:12,equipment:40,recipes:24}[collection]))issues.push({path:'form',code:'LIMIT'});
 if(!form.isNew&&existing<0)issues.push({path:'form',code:'REFERENCE'});
 if(form.kind==='station'){
  textIssue(f.label,textLimits.label,'label',issues);if(!workspace.source.people.some(x=>x.id===f.responsiblePersonId))issues.push({path:'responsiblePersonId',code:'REFERENCE'});
  item={id:form.id,label:f.label.trim(),responsiblePersonId:f.responsiblePersonId};
 }
 if(form.kind==='equipment'){
  textIssue(f.label,textLimits.label,'label',issues);if(!['TOOL','EQUIPMENT'].includes(f.kind))issues.push({path:'kind',code:'REFERENCE'});
  item={id:form.id,label:f.label.trim(),kind:f.kind};const seen=new Set();
  const holdings=f.holdings.map((x,i)=>{const path=`holdings.${i}`,stationId=x.stationId==='shared'?null:x.stationId;if(stationId!==null&&!catalog.stations.some(y=>y.id===stationId))issues.push({path:path+'.stationId',code:'REFERENCE'});if(seen.has(stationId))issues.push({path:path+'.stationId',code:'DUPLICATE'});seen.add(stationId);return {equipmentId:form.id,stationId,quantity:positive(x.quantity,path+'.quantity',issues)};});
  catalog.inventory=catalog.inventory.filter(x=>x.equipmentId!==form.id).concat(holdings);
  if(catalog.inventory.length===0)issues.push({path:'holdings',code:'MINIMUM'});
  if(catalog.inventory.length>(workspace.limits.inventory??80))issues.push({path:'holdings',code:'LIMIT'});
 }
 if(form.kind==='recipe'){
  textIssue(f.title,textLimits.title,'title',issues);textIssue(f.reference,textLimits.reference,'reference',issues);
  if(!catalog.stations.some(x=>x.id===f.stationId))issues.push({path:'stationId',code:'REFERENCE'});
  const servings=positive(f.servings,'servings',issues),ingredients=lines(f.ingredientsText),steps=lines(f.stepsText);
  for(const [values,name,maxItems,maxLength] of [[ingredients,'ingredientsText',30,500],[steps,'stepsText',20,2000]]){if(!values.length)issues.push({path:name,code:'EMPTY_LIST'});if(values.length>maxItems)issues.push({path:name,code:'LIMIT'});for(const value of values)textIssue(value,maxLength,name,issues);}
  const seen=new Set();if(!f.requirements.length)issues.push({path:'requirements',code:'EMPTY_LIST'});if(f.requirements.length>20)issues.push({path:'requirements',code:'LIMIT'});
  const requirements=f.requirements.map((x,i)=>{const path=`requirements.${i}`;if(!catalog.equipment.some(y=>y.id===x.equipmentId))issues.push({path:path+'.equipmentId',code:'REFERENCE'});if(seen.has(x.equipmentId))issues.push({path:path+'.equipmentId',code:'DUPLICATE'});seen.add(x.equipmentId);return {equipmentId:x.equipmentId,quantity:positive(x.quantity,path+'.quantity',issues)};});
  item={id:form.id,title:f.title.trim(),stationId:f.stationId,servings,ingredients,steps,reference:f.reference.trim(),requirements};
 }
 if(existing<0)catalog[collection].push(item);else catalog[collection][existing]=item;
 if(bytes(catalog)>(workspace.limits.catalogBytes??49152))issues.push({path:'form',code:'TOO_LARGE'});
 return {catalog,issues:issues.filter((x,i,a)=>a.findIndex(y=>y.path===x.path&&y.code===x.code)===i)};
}
export function authoringRemoval(workspace,kind,id){
 const catalog=currentCatalog(workspace),collection=collections[kind],issues=[];if(!collection||!catalog[collection].some(x=>x.id===id))return {catalog,issues:[{path:'form',code:'REFERENCE'}],references:[]};
 const references=kind==='station'?[...catalog.recipes.filter(x=>x.stationId===id).map(x=>x.title),...catalog.inventory.filter(x=>x.stationId===id).map(x=>'Holding: '+(catalog.equipment.find(y=>y.id===x.equipmentId)?.label??''))]:kind==='equipment'?[...catalog.recipes.filter(x=>x.requirements.some(y=>y.equipmentId===id)).map(x=>x.title),...catalog.inventory.filter(x=>x.equipmentId===id).map(x=>'Holding: '+(x.stationId===null?'Shared kitchen':catalog.stations.find(y=>y.id===x.stationId)?.label??''))]:[];
 if(references.length)issues.push({path:'form',code:'REFERENCED'});if(catalog[collection].length<=1)issues.push({path:'form',code:'MINIMUM'});
 if(!issues.length)catalog[collection]=catalog[collection].filter(x=>x.id!==id);return {catalog,issues,references};
}
export function catalogChangeSummary(before,after){
 const rows=[];for(const name of ['stations','equipment','recipes']){const old=new Map(before[name].map(x=>[x.id,x])),next=new Map(after[name].map(x=>[x.id,x]));const added=after[name].filter(x=>!old.has(x.id)).length,removed=before[name].filter(x=>!next.has(x.id)).length,changed=after[name].filter(x=>old.has(x.id)&&JSON.stringify(old.get(x.id))!==JSON.stringify(x)).length;rows.push({collection:name,added,changed,removed});}
 const key=x=>JSON.stringify([x.equipmentId,x.stationId]);const old=new Map(before.inventory.map(x=>[key(x),x.quantity])),next=new Map(after.inventory.map(x=>[key(x),x.quantity]));rows.push({collection:'holdings',added:[...next.keys()].filter(x=>!old.has(x)).length,changed:[...next].filter(([k,v])=>old.has(k)&&old.get(k)!==v).length,removed:[...old.keys()].filter(x=>!next.has(x)).length});return rows;
}
