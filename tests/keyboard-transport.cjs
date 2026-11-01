const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {validCommand,createKeyboardTransport}=require('../themask/assistente/keyboard-transport.cjs');
const {createAutoSpec}=require('../themask/assistente/auto-director.cjs');
const command='spec_autodirector 0\nspec_mode 1\nspec_player "Bravo"';
function folder(){return fs.mkdtempSync(path.join(os.tmpdir(),'themask-keyboard-'));}
test('grava CFG própria, verifica foco antes do arquivo e novamente antes da tecla',async()=>{
  const directory=folder(),calls=[];
  try{
    const key=createKeyboardTransport({directory,platform:'win32',request:async action=>{calls.push(action);return {code:action==='check'?'READY':'SENT'};}});
    await key.send(command);assert.deepEqual(calls,['check','press']);assert.ok(fs.readFileSync(key.file,'utf8').endsWith(command+'\n'));
    key.clear();assert.ok(!fs.readFileSync(key.file,'utf8').includes('spec_player'));
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('sem foco não pressiona tecla; perda de foco entre preparação e envio neutraliza CFG',async()=>{
  for(const afterCheck of [false,true]){
    const directory=folder(),calls=[];
    try{
      const key=createKeyboardTransport({directory,platform:'win32',request:async action=>{calls.push(action);return {code:action==='check'&&afterCheck?'READY':'FOCUS_LOST'};}});
      await assert.rejects(key.send(command),{code:'FOCUS_LOST'});
      assert.deepEqual(calls,afterCheck?['check','press']:['check']);
      assert.ok(!fs.readFileSync(key.file,'utf8').includes('spec_player'));
    }finally{fs.rmSync(directory,{recursive:true,force:true});}
  }
});
test('não sobrescreve arquivo alheio e rejeita comandos fora da lista de espectador',async()=>{
  const directory=folder(),filename=path.join(directory,'themask_autospec_bridge.cfg');
  try{
    fs.writeFileSync(filename,'config pessoal');
    assert.throws(()=>createKeyboardTransport({directory,platform:'win32',request:()=>{}}),/nao reconhecida/);
    assert.equal(fs.readFileSync(filename,'utf8'),'config pessoal');fs.unlinkSync(filename);
    let calls=0;const key=createKeyboardTransport({directory,platform:'win32',request:async()=>{calls++;}});
    for(const bad of [command+'\nquit',command.replace('Bravo','Bravo";quit'),command.replace('spec_mode 1','sv_cheats 1')]){
      assert.equal(validCommand(bad),false);await assert.rejects(key.send(bad),/invalido/);
    }
    assert.equal(calls,0);
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
test('auto aguarda foco sem pausar permanentemente e retoma com confirmação GSI',async()=>{
  let time=10000,calls=0;
  const auto=createAutoSpec({now:()=>time,log:()=>{},transport:'keyboard',send:async()=>{if(++calls===1)throw Object.assign(Error('focus'),{code:'FOCUS_LOST'});}});
  const players=['76561198000000001','76561198000000002'].map((id,i)=>({id,name:i?'Bravo':'Alpha',side:i?'T':'CT',hp:100,position:[i*500,0,0],forward:[1,0,0]}));
  const frame={controller_id:'keyboard',control:true,mode:'auto',observer:'76561198400444880',observed:players[0].id,map:'de_mirage',round:1,phase:'live',sent_at:time,players,bomb:{state:'planting',player:players[1].id}};
  await auto.frame(frame);assert.equal(auto.status().paused,false);assert.match(auto.status().reason,/em foco/);
  time+=500;frame.sent_at=time;frame.control=false;await auto.frame(frame);assert.equal(calls,1);
  time+=1000;frame.sent_at=time;await auto.frame(frame);assert.equal(calls,2);
  time+=400;frame.sent_at=time;frame.observed=players[1].id;await auto.frame(frame);assert.equal(auto.status().paused,false);
});
test('corte cancelado enquanto aguarda a ponte não grava alvo nem pressiona tecla',async()=>{
  const directory=folder();let current=true,calls=0;
  try{
    const key=createKeyboardTransport({directory,platform:'win32',request:async()=>{calls++;current=false;return {code:'READY'};}});
    await assert.rejects(key.send(command,{isCurrent:()=>current}),{code:'CANCELLED'});
    assert.equal(calls,1);assert.ok(!fs.readFileSync(key.file,'utf8').includes('spec_player'));
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
});
