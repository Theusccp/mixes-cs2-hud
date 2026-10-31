const test=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const {createDirector,createAutoSpec,targetCommand,sendNetcon}=require('../themask/assistente/auto-director.cjs');
const ids=['76561198000000001','76561198000000002','76561198000000003','76561198000000004'];
function fixture(time=10000){
  return {controller_id:'test',control:false,mode:'auto',sent_at:time,observer:'76561198400444880',observed:ids[0],map:'de_mirage',round:3,phase:'live',
    players:ids.map((id,i)=>({id,name:['Alpha','Bravo','Charlie','Delta'][i],side:i<2?'CT':'T',hp:100,damage:0,kills:0,ammo:30,weapon:'rifle',slot:i+1,position:[[0,4500,600,6000][i],0,0],forward:[1,0,0]}))};
}
test('somente espectador confirmado com dados recentes pode cortar; simulação não envia comando',()=>{
  let time=10000;const d=createDirector({now:()=>time});let f=fixture(time);f.observer=ids[0];
  assert.equal(d.update(f),null);assert.equal(d.status().enabled,false);
  f=fixture(time);delete f.observer;assert.equal(d.update(f),null);
  f=fixture(time);f.sent_at=time-3000;assert.equal(d.update(f),null);
  f=fixture(time);f.mode='preview';assert.equal(d.update(f),null);assert.ok(d.status().suggestion);
  f.phase='freezetime';f.mode='auto';assert.equal(d.update(f),null);
  f=fixture(time);f.players=[...f.players,...Array.from({length:20},(_,i)=>({...f.players[0],id:'76561198000000'+String(100+i)})),{...f.players[0],id:f.observer}];
  f.bomb={state:'planting',player:ids[1]};assert.equal(d.update(f),null);assert.equal(d.status().enabled,false);
});
test('dano recente gera corte, exige confirmação e segura câmera antes de outro duelo',()=>{
  let time=10000;const d=createDirector({now:()=>time}),f=fixture(time);d.update(f);
  time+=400;f.sent_at=time;f.players[1].damage=100;
  const cut=d.update(f);assert.equal(cut.id,ids[1]);assert.ok(cut.command.includes('spec_player "Bravo"'));
  time+=400;f.sent_at=time;assert.equal(d.update(f),null);assert.match(d.status().reason,/confirmação/);
  f.observed=ids[1];d.update(f);
  time+=400;f.sent_at=time;f.players[3].damage=150;f.players[3].hp=80;assert.equal(d.update(f),null);assert.match(d.status().reason,/Segurando/);
});
test('desarme tem prioridade e confirmação tem tolerância de cinco segundos',()=>{
  let time=10000;const d=createDirector({now:()=>time}),f=fixture(time);d.update(f);
  time+=1000;f.sent_at=time;f.bomb={state:'defusing',player:ids[1]};
  assert.equal(d.update(f).id,ids[1]);
  time+=3100;f.sent_at=time;assert.equal(d.update(f),null);assert.equal(d.status().unconfirmed_cuts,0);
  time+=2000;f.sent_at=time;assert.deepEqual(d.update(f),{retry:true});assert.equal(d.status().enabled,true);
});
test('troca manual pausa dez segundos; morte do assistido não parece intervenção manual',()=>{
  let time=10000;const d=createDirector({now:()=>time}),f=fixture(time);d.update(f);
  time+=500;f.sent_at=time;f.observed=ids[1];f.players[2].damage=400;
  assert.equal(d.update(f),null);assert.match(d.status().reason,/manual/);
  const fresh=createDirector({now:()=>time}),g=fixture(time);fresh.update(g);
  time+=500;g.sent_at=time;g.players[0].hp=0;g.observed=ids[1];fresh.update(g);
  assert.doesNotMatch(fresh.status().reason,/manual/);
});
test('comandos rejeitam injeção, nomes numéricos/ambíguos e só usam slots quando habilitados',()=>{
  const f=fixture(),p=f.players[0];
  for(const name of ['";quit','abc\nquit','a\\b','9Player'])assert.equal(targetCommand({...p,name},f.players),null);
  assert.equal(targetCommand({...p,name:'Al'},[p,{...f.players[1],name:'Also'}]),null);
  assert.match(targetCommand({...p,name:'9Player',slot:0},f.players,true),/spec_player 10$/);
  assert.equal(targetCommand({...p,name:'9Player',slot:99},f.players,true),null);
});
test('conexão Netcon envia apenas ao loopback e transmite os comandos',async()=>{
  let resolveData;const data=new Promise(r=>resolveData=r);
  const server=net.createServer(socket=>{let body='';socket.on('data',chunk=>body+=chunk);socket.on('end',()=>resolveData(body));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{await sendNetcon('spec_mode 1\nspec_player "Alpha"',{port:server.address().port});assert.equal(await data,'spec_mode 1\nspec_player "Alpha"\r\n');}
  finally{await new Promise(r=>server.close(r));}
});
test('manual prevalece sobre outra fonte OBS e reativação recupera falha Netcon',async()=>{
  let time=10000,calls=0;const auto=createAutoSpec({now:()=>time,log:()=>{},send:async()=>{calls++;throw Error('offline');}});
  const f=fixture(time);f.control=true;f.bomb={state:'defusing',player:ids[1]};
  await auto.frame(f);assert.equal(auto.status().paused,true);assert.equal(calls,1);
  time+=500;f.sent_at=time;f.control=false;await auto.frame(f);assert.equal(calls,1);
  f.mode='off';f.control=true;await auto.frame(f);assert.equal(auto.status().enabled,false);
  const other={...f,controller_id:'obs',mode:'auto',control:false};time+=500;other.sent_at=time;await auto.frame(other);assert.equal(calls,1);
  f.mode='auto';f.sent_at=time;f.control=true;await auto.frame(f);assert.equal(calls,2);
});

test('painel local ativa com HUD em manual, confirma câmera e respeita parada explícita',async()=>{
  let time=10000,calls=0;
  const auto=createAutoSpec({now:()=>time,log:()=>{},send:async()=>{calls++;}});
  const f=fixture(time);f.mode='off';f.bomb={state:'defusing',player:ids[1]};
  await auto.frame(f);assert.equal(auto.status().enabled,false);
  assert.equal(auto.status().feed.connected,true);
  assert.equal(auto.control('auto').mode,'auto');
  await auto.frame(f);assert.equal(calls,1);assert.equal(auto.status().enabled,true);
  assert.equal(auto.status().control_source,'helper');
  time+=500;f.sent_at=time;f.observed=ids[1];await auto.frame(f);
  assert.equal(auto.status().paused,false);assert.equal(calls,1);
  auto.control('preview');time+=500;f.sent_at=time;f.bomb.player=ids[2];await auto.frame(f);
  assert.equal(calls,1);assert.equal(auto.status().suggestion.id,ids[2]);
  auto.control('auto');f.control=true;f.mode='off';await auto.frame(f);
  assert.equal(auto.status().mode,'off');assert.equal(auto.status().control_source,'hud');
  f.control=false;f.controller_id='old-obs';f.mode='auto';time+=500;f.sent_at=time;
  await auto.frame(f);assert.equal(calls,1);assert.equal(auto.status().mode,'off');
  assert.throws(()=>auto.control('invalid'));
  auto.control('auto');time+=3000;assert.equal(auto.status().feed.connected,false);
  assert.equal(auto.status().enabled,false);assert.match(auto.status().reason,/Sem dados/);
});

test('falha isolada não trava durante compra; próxima rodada confirma e zera falhas',async()=>{
  let time=10000,calls=0;
  const auto=createAutoSpec({now:()=>time,log:()=>{},send:async()=>{calls++;},transport:'keyboard'});
  const f=fixture(time);f.control=true;f.bomb={state:'defusing',player:ids[1]};
  await auto.frame(f);assert.equal(calls,1);
  time+=5100;f.sent_at=time;f.control=false;await auto.frame(f);
  assert.equal(auto.status().paused,false);assert.equal(auto.status().unconfirmed_cuts,1);
  time+=400;f.sent_at=time;f.phase='freezetime';f.players=f.players.filter(p=>p.id!==ids[1]);
  await auto.frame(f);assert.match(auto.status().reason,/Compra/);assert.equal(calls,1);
  assert.equal(auto.status().feed.players,3);
  time+=15000;f.sent_at=time;f.phase='live';f.round++;f.bomb.player=ids[2];
  await auto.frame(f);assert.equal(calls,2);assert.equal(auto.status().paused,false);
  time+=400;f.sent_at=time;f.observed=ids[2];await auto.frame(f);
  assert.equal(auto.status().unconfirmed_cuts,0);assert.equal(auto.status().last_unconfirmed_target,null);
  assert.equal(auto.status().paused,false);
});

test('alvo morto ou desconectado antes de confirmar é descartado sem contar falha',()=>{
  for(const disconnected of [false,true]){
    let time=10000;const d=createDirector({now:()=>time}),f=fixture(time);
    f.bomb={state:'defusing',player:ids[1]};assert.equal(d.update(f).id,ids[1]);
    if(disconnected)f.players=f.players.filter(p=>p.id!==ids[1]);else f.players[1].hp=0;
    time+=400;f.sent_at=time;f.bomb.player=ids[2];
    assert.equal(d.update(f).id,ids[2]);assert.equal(d.status().unconfirmed_cuts,0);
  }
});

test('confirmação atrasada recupera alvo e não conta como intervenção manual',()=>{
  let time=10000;const d=createDirector({now:()=>time}),f=fixture(time);
  f.bomb={state:'defusing',player:ids[1]};d.update(f);
  time+=5100;f.sent_at=time;assert.deepEqual(d.update(f),{retry:true});
  time+=400;f.sent_at=time;f.observed=ids[1];assert.equal(d.update(f),null);
  assert.match(d.status().reason,/Mantendo/);assert.equal(d.status().unconfirmed_cuts,0);
});

test('três falhas consecutivas pausam; manual cancela recuperação e dados de jogador nunca cortam',async()=>{
  let time=10000,calls=0;
  const auto=createAutoSpec({now:()=>time,log:()=>{},send:async()=>{calls++;}});
  const f=fixture(time);f.control=true;f.observed='';
  for(let attempt=1;attempt<=3;attempt++){
    await auto.frame(f);assert.equal(calls,attempt);f.control=false;
    time+=5100;f.sent_at=time;await auto.frame(f);
    assert.equal(auto.status().unconfirmed_cuts,attempt);
    assert.equal(auto.status().paused,attempt===3);
    time+=1600;f.sent_at=time;
  }
  assert.match(auto.status().reason,/3 cortes/);
  await auto.frame(f);assert.equal(calls,3);
  auto.control('off');await auto.frame(f);assert.equal(calls,3);assert.equal(auto.status().mode,'off');
  auto.control('auto');f.observer=ids[0];await auto.frame(f);
  assert.equal(calls,3);assert.equal(auto.status().enabled,false);
});
