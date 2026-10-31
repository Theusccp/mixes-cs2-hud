const net=require('node:net');
const validID=id=>/^765\d{14}$/.test(String(id||''));
const vector=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const unsafeName=name=>!name||name.length>80||/^[0-9]|[;"\\\r\n]/.test(name);

function targetCommand(player,players,nativeSlots=false){
  if(nativeSlots&&Number.isInteger(player.slot)&&player.slot>=0&&player.slot<=10)
    return `spec_autodirector 0\nspec_mode 1\nspec_player ${player.slot||10}`;
  const name=String(player.name||'');
  if(unsafeName(name)||players.some(p=>p.id!==player.id&&String(p.name).toLowerCase().includes(name.toLowerCase())))return null;
  return `spec_autodirector 0\nspec_mode 1\nspec_player "${name}"`;
}

function createDirector({now=()=>Date.now()}={}){
  let previous=new Map(),heat=new Map(),map='',round=null,lastCut=-Infinity,lastSeen='',pending=null,manualUntil=0;
  let enabled=false,reason='Desligado',suggestion=null,lastTime=0;
  function update(frame){
    const time=now(),list=Array.isArray(frame.players)?frame.players.slice(0,16):[];
    const mode=['auto','preview'].includes(frame.mode)?frame.mode:'off';
    const active=list.filter(p=>['CT','T'].includes(p.side));
    const alive=active.filter(p=>p.hp>0&&validID(p.id));
    enabled=mode==='auto';suggestion=null;
    const hold=Math.max(2500,Math.min(7000,Number(frame.hold_ms)||3500));
    if(!validID(frame.observer)||active.some(p=>p.id===frame.observer)){
      reason='Aguardando conta de espectador (provider.steamid)';enabled=false;pending=null;return null;
    }
    if(!Number.isFinite(frame.sent_at)||Math.abs(time-frame.sent_at)>2000){reason='Dados atrasados';pending=null;return null;}
    if(map!==frame.map||round!==frame.round){
      previous=new Map();heat=new Map();pending=null;lastSeen='';lastCut=-Infinity;
    }else if(time-lastTime>2500){previous=new Map();heat=new Map();}
    map=frame.map;round=frame.round;lastTime=time;
    for(const p of active){
      const old=previous.get(p.id);let points=0;
      if(old){
        if(p.hp<old.hp&&p.hp>0)points+=95;
        if(p.damage>old.damage)points+=120;
        if(p.kills>old.kills)points+=80;
        if(p.weapon===old.weapon&&p.ammo>=0&&p.ammo<old.ammo)points+=25;
      }
      if(points)heat.set(p.id,{points,until:time+1800});
      previous.set(p.id,{...p});
    }
    if(mode==='off'){reason='Manual';pending=null;lastSeen=frame.observed||'';return null;}
    if(!['live','bomb','defuse'].includes(frame.phase)){reason='Compra / pausa / fim de rodada';pending=null;lastSeen=frame.observed||'';return null;}
    if(pending){
      if(frame.observed===pending.id){lastSeen=frame.observed;pending=null;}
      else if(time-pending.at>3000){reason='Corte sem confirmação: automático pausado';enabled=false;return {pause:true};}
      else{reason='Aguardando confirmação da câmera';return null;}
    }
    if(enabled&&lastSeen&&frame.observed&&frame.observed!==lastSeen&&active.find(p=>p.id===lastSeen)?.hp>0)manualUntil=time+10000;
    lastSeen=frame.observed||'';
    if(enabled&&manualUntil>time){reason='Intervenção manual: pausa de 10s';return null;}
    const count=side=>alive.filter(p=>p.side===side).length;
    const scores=alive.map(p=>{
      let score=0,label='posição';
      const activity=heat.get(p.id);if(activity?.until>time){score+=activity.points;label='trocação recente';}
      for(const enemy of alive.filter(e=>e.side!==p.side)){
        if(!vector(p.position)||!vector(enemy.position))continue;
        const delta=enemy.position.map((v,i)=>v-p.position[i]);
        if(Math.abs(delta[2])>180)continue;
        const distance=Math.hypot(...delta);
        if(distance>2000||distance<1)continue;
        score+=Math.max(0,38-distance/55);
        if(vector(p.forward)&&delta.reduce((v,x,i)=>v+x*p.forward[i],0)/distance>.65)score+=22;
      }
      if(count(p.side)===1&&count(p.side==='CT'?'T':'CT')>0){score+=55;label='clutch';}
      const objective=frame.bomb?.player===p.id&&['planting','defusing'].includes(frame.bomb.state);
      if(objective){score+=260;label=frame.bomb.state==='defusing'?'desarme':'plantio';}
      const command=targetCommand(p,alive,frame.native_slots===true);
      return {id:p.id,name:p.name,score,label,objective,command};
    }).filter(p=>p.command).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const best=scores[0],current=scores.find(p=>p.id===frame.observed);
    if(!best){reason='Sem alvo com nome/slot utilizável';return null;}
    suggestion={id:best.id,name:best.name,reason:best.label};
    if(mode==='preview'){reason='Simulação: '+best.name+' ('+best.label+')';return null;}
    if(best.id===frame.observed){reason='Mantendo '+best.name;return null;}
    if(current&&time-lastCut<hold&&!best.objective){reason='Segurando câmera';return null;}
    if(time-lastCut<1000){reason='Intervalo mínimo de corte';return null;}
    if(current&&!best.objective&&best.score<current.score+30){reason='Mantendo câmera estável';return null;}
    lastCut=time;pending={id:best.id,at:time};reason='Corte: '+best.name+' ('+best.label+')';
    return {command:best.command,id:best.id,name:best.name,reason:best.label};
  }
  return {update,status:()=>({enabled,reason,suggestion}),reset(){pending=null;lastSeen='';manualUntil=0;lastCut=-Infinity;}};
}

function sendNetcon(command,{port=2020,connect=net.createConnection}={}){
  return new Promise((resolve,reject)=>{
    const socket=connect({host:'127.0.0.1',port}),timer=setTimeout(()=>socket.destroy(Error('Netcon timeout')),1500);
    socket.on('error',error=>{clearTimeout(timer);reject(error);});
    socket.on('connect',()=>socket.end(command+'\r\n',()=>{clearTimeout(timer);resolve();}));
  });
}
function createAutoSpec({send=sendNetcon,now=()=>Date.now(),log=console.log}={}){
  const director=createDirector({now});let paused=false,busy=false,mode='off',reason='Desligado',lastLog='',lastFrame=-Infinity,owner='';
  return {
    async frame(frame){
      if(!frame||typeof frame!=='object')throw Error('Invalid frame');
      const client=String(frame.controller_id||'single');
      if(frame.control===true){owner=client;mode=frame.mode;paused=false;director.reset();lastFrame=-Infinity;}
      else if(owner!==client||frame.mode!==mode)return this.status();
      if(paused)return this.status();
      if(busy||now()-lastFrame<180)return this.status();lastFrame=now();
      const result=director.update(frame);reason=director.status().reason;
      if(result?.pause){paused=true;log(reason);return this.status();}
      if(reason!==lastLog){if(result?.command||frame.mode==='preview')log('[AutoSpec] '+reason);lastLog=reason;}
      if(result?.command){
        busy=true;
        try{await send(result.command);}
        catch{paused=true;reason='Sem Netcon. Inicie CS2 com -netconport 2020 e reative o automático.';log(reason);}
        finally{busy=false;}
      }
      return this.status();
    },
    status(){return {...director.status(),enabled:mode==='auto'&&!paused&&director.status().enabled,paused,reason};}
  };
}
module.exports={createDirector,createAutoSpec,targetCommand,sendNetcon};
