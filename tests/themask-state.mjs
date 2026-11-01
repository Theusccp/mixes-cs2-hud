import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../themask/assets/themask-state.js',import.meta.url),'utf8');
const stateURL='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const {normalizeJTs,safeImage,playerPhoto,teamLabel,lossBonus}=await import(stateURL);
function fixture(){
  const ct={side:'CT',orientation:'left',score:9,name:'COBRA',matches_won_this_series:1};
  const tr={side:'T',orientation:'right',score:8,name:'LOBO',matches_won_this_series:0};
  const player=(id,slot,team,hp)=>({steamid:id,name:'Player '+id,observer_slot:slot,team,
    state:{health:hp,armor:100,money:3250,round_totaldmg:187,round_kills:2,defusekit:team.side==='CT'},
    stats:{kills:18,deaths:7,assists:3},weapons:[{name:'weapon_m4a1_silencer',type:'Rifle',state:'active',ammo_clip:21,ammo_reserve:60}]});
  const players=[player('1',4,ct,100),player('2',1,ct,0),player('3',0,tr,70),player('4',6,tr,100)];
  return {map:{name:'de_mirage',round:17,phase:'live',team_ct:ct,team_t:tr},
    players,player:players[0],phase_countdowns:{phase:'live',phase_ends_in:82},round:{phase:'live'}};
}
test('normaliza dados reais do JTs sem perder fotos, stats, arma ou observador',()=>{
  const input=fixture();input.players[0].avatar='/api/players/avatar/1';
  const state=normalizeJTs(input,null,{},'http://localhost:1349/');
  assert.equal(state.round,18);assert.equal(state.map,'MIRAGE');
  assert.equal(state.left.score,9);assert.equal(state.observed.name,'Player 1');
  assert.equal(state.observed.avatar,'http://localhost:1349/api/players/avatar/1');
  assert.equal(state.observed.active,'M4A1-S');assert.deepEqual(state.observed.ammo,[21,60]);
  assert.equal(state.left.players[0].hp,0);assert.equal(state.right.players.at(-1).slot,0);
});
test('troca de lado segue a orientação, mantendo as cores ligadas a CT/TR',()=>{
  const input=fixture();input.map.team_ct.orientation='right';input.map.team_t.orientation='left';
  const state=normalizeJTs(input);assert.equal(state.left.side,'T');assert.equal(state.right.side,'CT');
});
test('desarme usa o tempo e kit do desarmador; final de rodada não avança o contador',()=>{
  const input=fixture();input.bomb={state:'defusing',countdown:4.2,player:input.players[0]};
  let state=normalizeJTs(input);assert.equal(state.phase,'defuse');assert.equal(state.time_left,4.2);assert.equal(state.action_total,5);
  input.bomb=null;input.round={phase:'over',win_team:'CT'};input.phase_countdowns.phase='over';
  state=normalizeJTs(input);assert.equal(state.round,17);assert.equal(state.win_team,'CT');
});
test('ausência de dados não produz placar fictício; normaliza melhor de e URLs',()=>{
  assert.equal(normalizeJTs(null).ok,false);
  assert.equal(normalizeJTs(fixture(),null,{best_of:900}).series.best_of,1);
  assert.equal(safeImage('javascript:alert(1)'), '');
  assert.equal(safeImage('data:text/html,<script>'), '');
  assert.equal(safeImage('data:image/png;base64,YQ=='),'data:image/png;base64,YQ==');
});

test('nomes padrão viram CT/TR e equipes cadastradas mantêm seus nomes',()=>{
  assert.equal(teamLabel('Contra-Terroristas','CT'),'CT');
  assert.equal(teamLabel('Terroristas','T'),'TR');
  assert.equal(teamLabel('Counter-Terrorists','CT'),'CT');
  assert.equal(teamLabel('TheMask Academy','CT'),'TheMask Academy');
  const data=fixture();data.map.team_ct.name='Contra-Terroristas';data.map.team_t.name='Terroristas';
  const state=normalizeJTs(data);assert.equal(state.left.name,'CT');assert.equal(state.right.name,'TR');
});

test('avatar Steam usa resolução full e retrato personalizado preserva o arquivo original',()=>{
  const hash='a'.repeat(40);
  assert.equal(playerPhoto(`https://avatars.steamstatic.com/${hash}_medium.jpg`),`https://avatars.steamstatic.com/${hash}_full.jpg`);
  const custom='http://localhost:1349/api/players/photo.png?original=1';
  assert.equal(playerPhoto(custom),custom);
});

const radarSource=await readFile(new URL('../themask/assets/themask-radar.js',import.meta.url),'utf8');
const {project}=await import('data:text/javascript;base64,'+Buffer.from(radarSource).toString('base64'));
const maps=JSON.parse(await readFile(new URL('../themask/assets/themask-radar-maps.json',import.meta.url),'utf8'));
test('radar projeta coordenadas negativas, rejeita dados ausentes e separa andares de Nuke',()=>{
  const point=project([-200,-2100,0],maps.de_mirage);
  assert.ok(point.x>600&&point.x<610);assert.ok(point.y>760&&point.y<770);
  assert.equal(project(null,maps.de_mirage),null);
  assert.equal(project([NaN,1,0],maps.de_mirage),null);
  assert.equal(project([0,0,-450],maps.de_nuke).level,'high');
  assert.equal(project([0,0,-451],maps.de_nuke).level,'low');
});

test('economia soma o dinheiro dos jogadores e mantém dados desconhecidos como ausentes',()=>{
  const data=fixture();data.map.team_ct.consecutive_round_losses=3;
  let state=normalizeJTs(data);assert.equal(state.left.money,6500);assert.equal(state.left.loss_bonus,2900);
  assert.equal(state.right.loss_bonus,null);
  delete data.players[0].state.money;state=normalizeJTs(data);assert.equal(state.left.money,null);
  assert.deepEqual([0,1,2,3,4,7].map(lossBonus),[1400,1900,2400,2900,3400,3400]);
});

const motionSource=await readFile(new URL('../themask/assets/themask-motion.js',import.meta.url),'utf8');
const motionURL='data:text/javascript;base64,'+Buffer.from(motionSource).toString('base64');
const photoSource=(await readFile(new URL('../themask/assets/themask-photos.js',import.meta.url),'utf8')).replace('./themask-state.js',stateURL);
const photoURL='data:text/javascript;base64,'+Buffer.from(photoSource).toString('base64');
const panelSource=(await readFile(new URL('../themask/assets/themask-panels.js',import.meta.url),'utf8')).replace('./themask-motion.js',motionURL).replace('./themask-photos.js',photoURL);
const {buildRanking,createRoundHighlights}=await import('data:text/javascript;base64,'+Buffer.from(panelSource).toString('base64'));
test('ranking usa K/D e lida com zero mortes sem infinito',()=>{
  const rows=buildRanking([{id:'a',kills:8,deaths:0},{id:'b',kills:20,deaths:5},{id:'c',kills:0,deaths:0}]);
  assert.equal(rows[0].id,'a');assert.equal(rows[0].kd,8);assert.equal(rows[2].kd,0);
});
test('destaque usa abates e dano, sobrevive ao reset da compra e é limpo em novo mapa',()=>{
  const tracker=createRoundHighlights();const data=fixture();
  data.players[2].state.round_kills=2;data.players[2].state.round_totaldmg=250;
  let state=normalizeJTs(data);assert.equal(tracker.update(state),null);
  data.round={phase:'over',win_team:'T'};data.phase_countdowns.phase='over';
  const end=tracker.update(normalizeJTs(data));assert.equal(end.id,'3');assert.equal(end.round_dmg,250);
  for(const p of data.players){p.state.round_kills=0;p.state.round_totaldmg=0;}
  data.round={phase:'freezetime'};data.phase_countdowns.phase='freezetime';data.map.round=18;
  const freeze=tracker.update(normalizeJTs(data));assert.equal(freeze.id,'3');assert.equal(freeze.round_dmg,250);
  data.map.name='de_inferno';assert.equal(tracker.update(normalizeJTs(data)),null);
});

test('fim de rodada prevalece sobre contador e bomba atrasados no GSI',()=>{
  const data=fixture();data.phase_countdowns.phase='bomb';data.bomb={state:'planted'};
  data.round={phase:'over',win_team:'CT'};
  assert.equal(normalizeJTs(data).phase,'over');
  data.phase_countdowns.phase='live';assert.equal(normalizeJTs(data).phase,'over');
  data.map.phase='gameover';assert.equal(normalizeJTs(data).phase,'gameover');
});
test('destaque preserva o pico antes de um pacote zerado e captura fim sem pacote over',()=>{
  let now=1000;const tracker=createRoundHighlights(()=>now),data=fixture();
  data.players[2].state.round_kills=3;data.players[2].state.round_totaldmg=320;
  tracker.update(normalizeJTs(data));
  for(const p of data.players){p.state.round_kills=0;p.state.round_totaldmg=0;}
  tracker.update(normalizeJTs(data)); // Last live packet can already contain reset counters.
  data.round={phase:'over',win_team:'T'};data.phase_countdowns.phase='live';
  const end=tracker.update(normalizeJTs(data));
  assert.equal(end.id,'3');assert.equal(end.round_kills,3);assert.equal(end.round_dmg,320);
  now=5000;assert.equal(tracker.update(normalizeJTs(data)).completed_at,1000);
  const skipped=createRoundHighlights(()=>now),live=fixture();
  live.players[2].state.round_totaldmg=290;skipped.update(normalizeJTs(live));
  live.map.round++;live.phase_countdowns.phase='freezetime';live.round.phase='freezetime';
  for(const p of live.players){p.state.round_kills=0;p.state.round_totaldmg=0;}
  assert.equal(skipped.update(normalizeJTs(live)).round_dmg,290);
});
