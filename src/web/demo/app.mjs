import {createAuthoringDemoApi as createDemoApi} from './authoring-api.mjs';
import {createDemoController} from './controller.mjs';
import {renderApp} from './views.mjs';
const root=document.querySelector('#app');let previous=null,search='',recipeSearch='',station='',signIn=false;
const controller=createDemoController({api:createDemoApi(),onChange:render});
function render(s){
 if(previous?.session&&(!s.session||previous.session.identityId!==s.session.identityId||previous.session.demo.runId!==s.session.demo.runId)){search='';recipeSearch='';station='';signIn=false;}
 root.innerHTML=renderApp(s,{search,recipeSearch,station,signIn});
 for(const id of ['reset-demo','logout-demo']){const el=document.getElementById(id);el.hidden=!s.session;el.disabled=s.busy;}
 document.getElementById('home-button').disabled=s.busy;
 document.title=`Teach · ${s.session?s.screen:'Welcome'} · Isolated demo`;
 const changed=!previous||previous.screen!==s.screen||previous.phase!==s.phase||previous.recipeKey!==s.recipeKey||previous.stationKey!==s.stationKey||previous.equipmentKey!==s.equipmentKey||previous.assignmentId!==s.assignmentId||previous.feedbackId!==s.feedbackId||previous.authoring?.form?.id!==s.authoring?.form?.id||previous.authoring?.preview?.revision!==s.authoring?.preview?.revision;
 if(changed&&previous){const target=s.feedbackId&&s.phase==='ready'?document.querySelector('.response'):document.getElementById('page-title');target?.focus();}
 if(changed||s.notice!==previous?.notice)document.querySelector('#announcer').textContent=s.notice;
 previous=s;
}
root.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target||target.disabled)return;const s=controller.snapshot(),id=target.dataset.id;
 const action=target.dataset.action;if(['dashboard','recover','refresh','switch','authoring','kitchen','stations','station','equipment','recipes','recipe','member'].includes(action)&&!leaveAuthoring())return;
 switch(target.dataset.action){
  case 'authoring':controller.authoring();break;
  case 'authoring-tab':controller.authoringTab(id);break;
  case 'authoring-add':controller.authoringEdit(target.dataset.kind);focusAuthoring();break;
  case 'authoring-edit':controller.authoringEdit(target.dataset.kind,id);focusAuthoring();break;
  case 'authoring-duplicate':controller.authoringEdit('recipe',id,true);focusAuthoring();break;
  case 'authoring-save':Promise.resolve(controller.authoringSave()).then(focusAuthoringErrors);break;
  case 'authoring-cancel':if(leaveAuthoring())controller.authoringCancel();break;
  case 'authoring-reload':if(leaveAuthoring())controller.authoringReload();break;
  case 'authoring-remove':if(window.confirm('Remove this item from the draft? Referenced items cannot be removed. This does not change published versions.'))Promise.resolve(controller.authoringRemove(target.dataset.kind,id)).then(focusAuthoringErrors);break;
  case 'authoring-restore':if(window.confirm('Save the last published catalog as a new draft revision? Earlier published versions and training attempts stay unchanged.'))controller.authoringRestore();break;
  case 'authoring-add-row':controller.authoringRow(target.dataset.list);focusAuthoring();break;
  case 'authoring-remove-row':controller.authoringRow(target.dataset.list,Number(target.dataset.row));focusAuthoring();break;
  case 'authoring-preview':controller.authoringPreview();break;
  case 'authoring-close-preview':controller.authoringClosePreview();break;
  case 'authoring-publish':controller.authoringPublish();break;
  case 'authoring-check':controller.authoringCheck();break;
  case 'authoring-retry':controller.authoringRetry();break;
  case 'authoring-check-assignment':controller.authoringCheckAssignment();break;
  case 'authoring-assign':controller.authoringAssign();break;
  case 'authoring-focus':(document.getElementById('authoring-field-'+target.dataset.field.replace(/[^a-zA-Z0-9_-]/g,'-'))??document.getElementById('authoring-errors'))?.focus();break;
  case 'kitchen':recipeSearch='';station='';controller.library('kitchen');break;
  case 'stations':controller.library('stations');break;
  case 'station':controller.library('station',id);break;
  case 'equipment':controller.library('equipment',id??null);break;
  case 'recipes':recipeSearch='';station='';controller.library('recipes');break;
  case 'recipe':controller.library('recipe',id);break;
  case 'clear-recipes':recipeSearch='';station='';render(s);document.getElementById('recipe-search')?.focus();announceRecipeResults();break;
  case 'enter':signIn=false;controller.enter();break;
  case 'signin':signIn=true;render(s);document.querySelector('.feedback-alert')?.focus();break;
  case 'dashboard':search='';controller.dashboard();break;
  case 'recover':search='';controller.recover();break;
  case 'refresh':controller.refresh();break;
  case 'switch':search='';controller.switchPersona(s.session.demo.persona==='LEARNER'?'MANAGER':'LEARNER');break;
  case 'start':controller.start(id);break;
  case 'choose':controller.choose(Number(target.dataset.index));document.querySelector(`[data-index="${target.dataset.index}"]`)?.focus();break;
  case 'save':controller.save();break;
  case 'next':controller.next();document.querySelector('#page-title')?.focus();break;
  case 'complete':controller.complete();break;
  case 'member':controller.member(id);break;
  case 'assign':controller.assignAgain(id);break;
 }
});
function leaveAuthoring(){const warning=controller.authoringLeaveWarning();return !warning||window.confirm(warning);}
function focusAuthoring(){document.querySelector('[data-authoring-field]')?.focus();}
function focusAuthoringErrors(){document.querySelector('[aria-invalid="true"]')?.focus();if(!document.querySelector('[aria-invalid="true"]'))document.getElementById('authoring-errors')?.focus();}
function updateAuthoring(event){if(event.isComposing)return;const target=event.target,path=target.dataset?.authoringField;if(!path&&target.id!=='authoring-search')return;const start=target.selectionStart,end=target.selectionEnd,id=target.id;if(path)controller.authoringField(path,target.value);else controller.authoringSearch(target.value);const next=document.getElementById(id);next?.focus();try{next?.setSelectionRange(start,end);}catch{}}
root.addEventListener('input',updateAuthoring);root.addEventListener('compositionend',updateAuthoring);
root.addEventListener('change',event=>{if(event.target.tagName==='SELECT'&&event.target.dataset?.authoringField)updateAuthoring(event);if(event.target.id==='authoring-assignee')controller.authoringAssignee(event.target.value);});
root.addEventListener('submit',event=>{if(event.target.id==='authoring-form'){event.preventDefault();Promise.resolve(controller.authoringSave()).then(focusAuthoringErrors);}});
function announceRecipeResults(){const count=document.getElementById('recipe-result-count');if(count)document.getElementById('announcer').textContent=count.textContent;}
function updateRecipeSearch(event){if(event.target.id!=='recipe-search'||event.isComposing)return;const position=event.target.selectionStart;recipeSearch=event.target.value;render(controller.snapshot());const input=document.getElementById('recipe-search');input.focus();try{input.setSelectionRange(position,position);}catch{}announceRecipeResults();}
root.addEventListener('input',updateRecipeSearch);
root.addEventListener('compositionend',updateRecipeSearch);
root.addEventListener('change',event=>{if(event.target.id==='recipe-station'){station=event.target.value;render(controller.snapshot());document.getElementById('recipe-station')?.focus();announceRecipeResults();}});
root.addEventListener('input',event=>{if(event.target.id==='team-search'){const position=event.target.selectionStart;search=event.target.value;render(controller.snapshot());const input=document.getElementById('team-search');input.focus();try{input.setSelectionRange(position,position);}catch{}}});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('main')?.focus();document.getElementById('main')?.scrollIntoView({block:'start'});});
document.getElementById('home-button').addEventListener('click',()=>{if(!leaveAuthoring())return;search='';signIn=false;controller.snapshot().session?controller.dashboard():controller.boot();});
document.getElementById('theme-toggle').addEventListener('click',event=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';event.currentTarget.setAttribute('aria-label',`Switch to ${dark?'dark':'light'} theme`);});
document.getElementById('logout-demo').addEventListener('click',()=>{if(!leaveAuthoring())return;search='';signIn=false;controller.logout();});
document.getElementById('reset-demo').addEventListener('click',()=>{if(!leaveAuthoring())return;if(window.confirm('End this demo and start a new one? Current access will be revoked. Synthetic records are retained, not erased.')){search='';signIn=false;controller.reset();}});
window.addEventListener('offline',()=>controller.offline());
window.addEventListener('pagehide',()=>{search='';signIn=false;controller.conceal();});
window.addEventListener('pageshow',event=>{if(event.persisted)controller.boot();});
window.addEventListener('popstate',()=>{if(leaveAuthoring())controller.recover();});
window.addEventListener('beforeunload',event=>{if(controller.authoringLeaveWarning()){event.preventDefault();event.returnValue='';}});
controller.boot();
