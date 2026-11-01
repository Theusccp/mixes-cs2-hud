export function installAutoSpec({game,actions,config,fetchImpl=fetch}){
  let mode='off',settings={},last=0,inflight=false,lastRaw=null,retry=0,control=false,sequence=0;
  const controller_id=globalThis.crypto?.randomUUID?.()||String(Math.random());
  const vector=value=>{
    const point=Array.isArray(value)?value:String(value||'').split(',').map(Number);
    return point.length===3&&point.every(Number.isFinite)?point:null;
  };
  function packet(raw){
    const phase=raw.map?.phase==='gameover'?'gameover':raw.round?.phase==='over'?'over':raw.phase_countdowns?.phase||raw.round?.phase||'';
    return {mode,control,controller_id,sent_at:Date.now(),observer:String(raw.provider?.steamid||''),observed:String(raw.player?.steamid||''),
      map:raw.map?.name||'',round:raw.map?.round,phase,hold_ms:3500,native_slots:settings.native_slots===true,
      bomb:raw.bomb?{state:raw.bomb.state,player:raw.bomb.player}:null,
      players:Object.entries(raw.allplayers||{}).map(([id,p])=>{
        const weapon=Object.values(p.weapons||{}).find(w=>w.state==='active');
        return {id,name:p.name||'',side:p.team,hp:Number(p.state?.health)||0,damage:Number(p.state?.round_totaldmg)||0,
          kills:Number(p.match_stats?.kills)||0,ammo:Number(weapon?.ammo_clip??-1),weapon:weapon?.name||'',slot:p.observer_slot,
          position:vector(p.position),forward:vector(p.forward)};
      })};
  }
  async function send(raw,force=false){
    lastRaw=raw;const now=Date.now();if(inflight||now<retry||!force&&now-last<350)return;
    last=now;inflight=true;const version=sequence,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
    try{
      const response=await fetchImpl('http://127.0.0.1:23416/director/frame',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(packet(raw)),signal:controller.signal});
      if(!response.ok)throw Error('Assistente indisponível');
      const status=await response.json();if(status.paused)console.warn('AutoSpec:',status.reason);
      if(version===sequence)control=false;
    }catch{retry=now+3000;}
    finally{clearTimeout(timer);inflight=false;}
  }
  const set=value=>{mode=value;control=true;sequence++;retry=0;console.info('AutoSpec:',mode);if(lastRaw)send(lastRaw,true);};
  actions.on('autoSpecToggle',()=>set(mode==='auto'?'off':'auto'));
  actions.on('autoSpecOn',()=>set('auto'));
  actions.on('autoSpecOff',()=>set('off'));
  actions.on('autoSpecPreview',()=>set('preview'));
  actions.on('autospec_controls',action=>actions.execute(action));
  config.onChange(data=>{settings=data?.autospec_settings||{};});
  settings=config.data?.autospec_settings||{};
  game.on('raw',raw=>send(raw));
  return {getMode:()=>mode};
}
