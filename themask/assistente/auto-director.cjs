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
  let misses=0,retryUntil=0,lastMiss=null;
  const skipped=new Map();
  function update(frame){
    const time=now(),list=Array.isArray(frame.players)?frame.players.slice(0,64):[];
    const mode=['auto','preview'].includes(frame.mode)?frame.mode:'off';
    const active=list.filter(p=>['CT','T'].includes(p.side));
    const alive=active.filter(p=>p.hp>0&&validID(p.id));
    enabled=mode==='auto';suggestion=null;
    const hold=Math.max(2500,Math.min(7000,Number(frame.hold_ms)||3500));
    if(!validID(frame.observer)||(frame.players||[]).some(p=>p.id===frame.observer&&['CT','T'].includes(p.side))){
      reason='Aguardando conta de espectador (provider.steamid)';enabled=false;pending=null;return null;
    }
    if(!Number.isFinite(frame.sent_at)||Math.abs(time-frame.sent_at)>2000){reason='Dados atrasados';pending=null;return null;}
    if(map!==frame.map||round!==frame.round){
      previous=new Map();heat=new Map();pending=null;lastSeen='';lastCut=-Infinity;retryUntil=0;skipped.clear();
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
    if(!['live','bomb','defuse'].includes(frame.phase)){reason='Compra / pausa / fim de rodada';pending=null;retryUntil=0;lastSeen=frame.observed||'';return null;}
    if(lastMiss?.id===frame.observed){
      skipped.delete(lastMiss.id);misses=0;lastMiss=null;retryUntil=0;lastSeen=frame.observed;
    }
    if(pending){
      if(frame.observed===pending.id){lastSeen=frame.observed;pending=null;misses=0;lastMiss=null;}
      else if(!alive.some(p=>p.id===pending.id)){
        // A dead or disconnected target cannot acknowledge a new POV.
        pending=null;lastSeen=frame.observed||'';lastCut=-Infinity;
      }
      else if(time-pending.at>5000){
        misses++;lastMiss={id:pending.id,name:pending.name};skipped.set(pending.id,time+15000);
        pending=null;lastSeen=frame.observed||'';retryUntil=time+1500;
        if(misses>=3){reason='3 cortes sem confirmação: automático pausado; verifique F10 e reative';enabled=false;return {pause:true};}
        reason='Corte sem confirmação ('+misses+'/3): tentando outro alvo em 1,5s';
        return {retry:true};
      }
      else{reason='Aguardando confirmação da câmera';return null;}
    }
    if(time<retryUntil){reason='Aguardando nova tentativa de câmera';return null;}
    if(enabled&&lastSeen&&frame.observed&&frame.observed!==lastSeen&&active.find(p=>p.id===lastSeen)?.hp>0)manualUntil=time+10000;
    lastSeen=frame.observed||'';
    if(enabled&&manualUntil>time){reason='Intervenção manual: pausa de 10s';return null;}
    const count=side=>alive.filter(p=>p.side===side).length;
    const scores=alive.filter(p=>!(skipped.get(p.id)>time)).map(p=>{
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
    lastCut=time;pending={id:best.id,name:best.name,at:time};reason='Corte: '+best.name+' ('+best.label+')';
    return {command:best.command,id:best.id,name:best.name,reason:best.label};
  }
  return {update,status:()=>({enabled,reason,suggestion,unconfirmed_cuts:misses,
    pending_target:pending?{id:pending.id,name:pending.name}:null,last_unconfirmed_target:lastMiss}),
    reset(){pending=null;lastSeen='';manualUntil=0;lastCut=-Infinity;enabled=false;suggestion=null;
      misses=0;retryUntil=0;lastMiss=null;skipped.clear();}};
}

function sendNetcon(command,{port=2020,connect=net.createConnection,isCurrent=()=>true}={}){
  return new Promise((resolve,reject)=>{
    const socket=connect({host:'127.0.0.1',port}),timer=setTimeout(()=>socket.destroy(Error('Netcon timeout')),1500);
    socket.on('error',error=>{clearTimeout(timer);reject(error);});
    socket.on('connect',()=>{if(!isCurrent())return socket.destroy(Object.assign(Error('Corte cancelado'),{code:'CANCELLED'}));socket.end(command+'\r\n',()=>{clearTimeout(timer);resolve();});});
  });
}
function createAutoSpec({send=sendNetcon,now=()=>Date.now(),log=console.log,transport='netcon'}={}){
  const director=createDirector({now});let paused=false,busy=false,mode='off',reason='Desligado',lastLog='',lastFrame=-Infinity,owner='',blockedUntil=0,generation=0;
  let localControl=false,feed=null;
  function activate(value,client){
    if(!['off','auto','preview'].includes(value))throw Error('Invalid mode');
    owner=client;mode=value;paused=false;director.reset();lastFrame=-Infinity;blockedUntil=0;generation++;
    reason=value==='off'?'Manual':'Aguardando dados da HUD';
  }
  return {
    control(value){
      activate(value,'local-panel');localControl=true;
      log('[AutoSpec] Painel do assistente: '+value);
      return this.status();
    },
    async frame(frame){
      if(!frame||typeof frame!=='object')throw Error('Invalid frame');
      feed={received_at:now(),sent_at:frame.sent_at,map:String(frame.map||'').slice(0,80),
        phase:String(frame.phase||'').slice(0,40),players:Array.isArray(frame.players)?frame.players.length:0,
        hud_mode:String(frame.mode||'').slice(0,20)};
      const client=String(frame.controller_id||'single');
      if(frame.control===true){activate(frame.mode,client);localControl=false;}
      else if(localControl)frame={...frame,controller_id:'local-panel',mode};
      else if(owner!==client||frame.mode!==mode)return this.status();
      if(paused)return this.status();
      if(now()<blockedUntil)return this.status();
      if(busy||now()-lastFrame<180)return this.status();lastFrame=now();
      const result=director.update(frame);reason=director.status().reason;
      if(result?.pause){paused=true;log(reason);return this.status();}
      if(result?.retry)log('[AutoSpec] '+reason);
      if(reason!==lastLog){if(frame.mode==='preview')log('[AutoSpec] '+reason);lastLog=reason;}
      if(result?.command){
        busy=true;
        const version=generation;
        try{await send(result.command,{isCurrent:()=>version===generation&&mode==='auto'&&!paused&&now()-frame.sent_at<=2000});log('[AutoSpec] Corte enviado: '+result.name+' ('+result.reason+'); aguardando confirmacao GSI.');}
        catch(error){
          if(error.code==='CANCELLED'){director.reset();reason=mode==='auto'?'Corte expirado; aguardando novos dados':'Manual';}
          else if(['FOCUS_LOST','MODIFIER_HELD'].includes(error.code)){
            director.reset();blockedUntil=now()+1200;
            reason=error.code==='FOCUS_LOST'?'Aguardando CS2 em foco; nenhum atalho enviado':'Aguardando soltar Alt/Shift/Ctrl';
          }else{
            paused=true;reason=transport==='keyboard'?'Falha na ponte de teclado: '+error.message:'Sem Netcon ('+(error.code||error.message)+'). Windows normal: use o assistente SEM-TOOLS.';
          }
          log(reason);
        }
        finally{busy=false;}
      }
      return this.status();
    },
    status(){
      const age=feed?Math.max(0,now()-feed.received_at):null;
      const fresh=age!==null&&age<=2500&&Number.isFinite(feed.sent_at)&&Math.abs(now()-feed.sent_at)<=2500;
      return {...director.status(),enabled:mode==='auto'&&!paused&&fresh&&director.status().enabled,
        paused,reason:mode!=='off'&&!paused&&!fresh?'Sem dados recentes da HUD: abra a Echo AutoSpec de teste':reason,
        transport,mode,control_source:localControl?'helper':'hud',
        feed:{connected:fresh,age_ms:age,map:feed?.map||'',phase:feed?.phase||'',players:feed?.players||0,hud_mode:feed?.hud_mode||''}};
    }
  };
}
module.exports={createDirector,createAutoSpec,targetCommand,sendNetcon};
