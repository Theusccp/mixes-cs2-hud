import { createRenderer } from './themask-renderer.js';
const renderer = createRenderer({demo:true});
const response = await fetch('./assets/themask-demo.json');
if (!response.ok) throw new Error('Não foi possível carregar a demonstração local.');
const sample = await response.json();
const control = document.createElement('div');
control.id = 'demo-controls';
const caption = document.createElement('span');
caption.textContent = 'PRÉVIA THEMASK';
control.appendChild(caption);
function select(mode) {
  const state = structuredClone(sample);
  if (mode === 'live') {state.phase='live';state.time_left=82;state.bomb='';}
  if (mode === 'freeze') {state.phase='freezetime';state.time_left=15;state.bomb='';}
  if (mode === 'pause') {state.phase='timeout_ct';state.time_left=30;state.bomb='';}
  if (mode === 'win') {state.phase='over';state.time_left=7;state.bomb='';state.win_team='CT';}
  if (mode === 'defuse') {state.phase='defuse';state.time_left=5;state.action_left=5;state.action_total=5;state.bomb='defusing';state.bomb_player=state.observed.name;}
  if (mode === 'swap') {
    [state.left,state.right]=[state.right,state.left];
    for(const team of [state.left,state.right]) for(const p of team.players) p.side=team.side;
  }
  if (mode === 'missing') {
    for (const team of [state.left,state.right]) {team.logo='';for(const p of team.players)p.avatar='';}
    state.observed.avatar='';
  }
  state.action_left=state.time_left;
  renderer.render(state);
  for(const button of control.querySelectorAll('button'))button.classList.toggle('selected',button.dataset.mode===mode);
}
for (const [mode,label] of [['bomb','Bomba'],['live','Ao vivo'],['freeze','Compra'],['pause','Pausa'],['defuse','Desarme'],['win','Vitória'],['swap','Lados'],['missing','Sem fotos']]) {
  const button=document.createElement('button');button.textContent=label;button.dataset.mode=mode;
  button.addEventListener('click',()=>select(mode));control.appendChild(button);
}
document.body.appendChild(control);
document.body.classList.add('demo-mode');
if(new URLSearchParams(location.search).get('clean')==='1')control.hidden=true;
select('bomb');
