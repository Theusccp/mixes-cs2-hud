import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../themask/assets/themask-state.js',import.meta.url),'utf8');
const {normalizeJTs,safeImage}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
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
