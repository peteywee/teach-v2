import {createDemoApi} from './api.mjs';
import {createDemoController} from './controller.mjs';
import {renderApp} from './views.mjs';
const root=document.querySelector('#app');let previous=null,search='',signIn=false;
const controller=createDemoController({api:createDemoApi(),onChange:render});
function render(s){
 if(previous?.session&&(!s.session||previous.session.identityId!==s.session.identityId||previous.session.demo.runId!==s.session.demo.runId)){search='';signIn=false;}
 root.innerHTML=renderApp(s,{search,signIn});
 for(const id of ['reset-demo','logout-demo']){const el=document.getElementById(id);el.hidden=!s.session;el.disabled=s.busy;}
 document.getElementById('home-button').disabled=s.busy;
 document.title=`Teach · ${s.session?s.screen:'Welcome'} · Isolated demo`;
 const changed=!previous||previous.screen!==s.screen||previous.phase!==s.phase||previous.assignmentId!==s.assignmentId||previous.feedbackId!==s.feedbackId;
 if(changed&&previous){const target=s.feedbackId&&s.phase==='ready'?document.querySelector('.response'):document.getElementById('page-title');target?.focus();}
 if(s.notice!==previous?.notice)document.querySelector('#announcer').textContent=s.notice;
 previous=s;
}
root.addEventListener('click',event=>{const target=event.target.closest('[data-action]');if(!target||target.disabled)return;const s=controller.snapshot(),id=target.dataset.id;
 switch(target.dataset.action){
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
root.addEventListener('input',event=>{if(event.target.id==='team-search'){const position=event.target.selectionStart;search=event.target.value;render(controller.snapshot());const input=document.getElementById('team-search');input.focus();try{input.setSelectionRange(position,position);}catch{}}});
document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('main')?.focus();document.getElementById('main')?.scrollIntoView({block:'start'});});
document.getElementById('home-button').addEventListener('click',()=>{search='';signIn=false;controller.snapshot().session?controller.dashboard():controller.boot();});
document.getElementById('theme-toggle').addEventListener('click',event=>{const dark=document.documentElement.dataset.theme==='dark';document.documentElement.dataset.theme=dark?'light':'dark';event.currentTarget.setAttribute('aria-label',`Switch to ${dark?'dark':'light'} theme`);});
document.getElementById('logout-demo').addEventListener('click',()=>{search='';signIn=false;controller.logout();});
document.getElementById('reset-demo').addEventListener('click',()=>{if(window.confirm('End this demo and start a new one? Current access will be revoked. Synthetic records are retained, not erased.')){search='';signIn=false;controller.reset();}});
window.addEventListener('offline',()=>controller.offline());
window.addEventListener('pagehide',()=>{search='';signIn=false;controller.conceal();});
window.addEventListener('pageshow',event=>{if(event.persisted)controller.boot();});
window.addEventListener('popstate',()=>controller.recover());
controller.boot();
