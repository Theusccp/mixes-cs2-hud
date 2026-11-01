import { playerPhoto } from './themask-state.js';

// JTs versions that return an empty `steam` field use the optional local assistant.
export function createPortraits({api,apiBase,onChange,fetchImpl=fetch,now=()=>Date.now()}){
  const entries=new Map();
  let helper=null,helperUntil=0,mode='auto';
  const photo=url=>playerPhoto(url,apiBase);
  async function requestJSON(url,timeout=1800){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
    try{const response=await fetchImpl(url,{signal:controller.signal,credentials:'omit'});
      if(!response.ok)throw Error('Avatar unavailable');return await response.json();
    }finally{clearTimeout(timer);}
  }
  async function available(){
    if(helper&&now()<helperUntil)return helper;
    helperUntil=now()+15000;
    helper=requestJSON('http://127.0.0.1:23416/health').then(data=>data.service==='themask-helper').catch(()=>false);
    return helper;
  }
  function ensure(player,force=false){
    if(mode!=='auto')return;
    const id=String(player.id||player.steamid||'');
    if(!/^765\d{14}$/.test(id)||(!force&&photo(player.avatar)))return;
    const old=entries.get(id);
    if(old?.pending||old&&old.retry>now())return;
    const entry={...old,pending:true,retry:now()+30000};entries.set(id,entry);
    (async()=>{
      let response={};
      try{response=await api.players.getAvatarURLs(id)||{};}catch{}
      entry.custom=photo(response.custom);
      entry.steam=photo(response.steam);
      // Some JTs builds return the custom URL in both fields, without a Steam lookup.
      if((!entry.steam||entry.steam===entry.custom)&&mode==='auto'&&await available()&&mode==='auto'){
        try{entry.steam=photo((await requestJSON('http://127.0.0.1:23416/avatar/'+id,10000)).steam);}catch{}
      }
      entry.pending=false;
      if(entry.steam)entry.retry=now()+6*60*60*1000;
      onChange();
    })().catch(()=>{entry.pending=false;});
  }
  function decorate(player){
    if(!player)return player;
    const entry=entries.get(String(player.id));
    const supplied=photo(player.avatar);
    const suppliedIsSteam=supplied&&supplied===entry?.steam&&supplied!==entry?.custom;
    const custom=[...new Set([suppliedIsSteam?'':supplied,entry?.custom].filter(Boolean))];
    const candidates=mode==='agents'?[]:mode==='custom'?custom:[...new Set([...custom,entry?.steam].filter(Boolean))];
    return {...player,avatar:candidates[0]||'',avatar_candidates:candidates,custom_avatar_candidates:custom,portrait_mode:mode};
  }
  return {
    setMode(value){mode=['auto','agents'].includes(value)?value:'custom';},
    remember(id,response={}){
      const entry=entries.get(String(id))||{pending:false,retry:0};
      entry.custom=photo(response.custom);entry.steam=photo(response.steam);
      if(entry.steam&&entry.steam!==entry.custom)entry.retry=now()+6*60*60*1000;
      entries.set(String(id),entry);
    },
    request(list){for(const player of list)ensure(player);},
    failed(player){const entry=entries.get(String(player.id));if(entry?.pending||entry?.steam)return;if(entry)entry.retry=0;ensure(player,true);},
    decorate(state){
      if(!state.ok)return state;
      return {...state,portrait_mode:mode,left:{...state.left,players:state.left.players.map(decorate)},
        right:{...state.right,players:state.right.players.map(decorate)},observed:decorate(state.observed)};
    }
  };
}

export function setPortrait(element,player,onFailure=()=>{}){
  const fallback=player.side==='T'?'./assets/themask-agent-tr-v2.webp':'./assets/themask-agent-ct-v2.webp';
  const photos=player.portrait_mode==='agents'?[]:player.portrait_mode==='custom'
    ?(player.custom_avatar_candidates||[player.avatar]):[...(player.avatar_candidates||[]),player.avatar];
  const candidates=[...new Set([...photos,fallback].filter(Boolean))];
  const key=String(player.id)+':'+candidates.join('|');
  if(element.dataset.portraitKey===key)return;
  element.dataset.portraitKey=key;
  let index=0;
  element.onerror=()=>{
    if(index===0)onFailure(player);
    if(++index<candidates.length)apply();
    else element.onerror=null;
  };
  function apply(){element.classList.toggle('agent-portrait',candidates[index]===fallback);element.src=candidates[index];}
  element.style.display='';apply();
}
