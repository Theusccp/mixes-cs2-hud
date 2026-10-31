import { playerPhoto } from './themask-state.js';

// JTs versions that return an empty `steam` field use the optional local assistant.
export function createPortraits({api,apiBase,onChange,fetchImpl=fetch,now=()=>Date.now()}){
  const entries=new Map();
  let helper=null,helperUntil=0;
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
      if((!entry.steam||entry.steam===entry.custom)&&await available()){
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
    const candidates=[...new Set([photo(player.avatar),entry?.custom,entry?.steam].filter(Boolean))];
    return {...player,avatar:candidates[0]||'',avatar_candidates:candidates};
  }
  return {
    request(list){for(const player of list)ensure(player);},
    failed(player){const entry=entries.get(String(player.id));if(entry?.pending||entry?.steam)return;if(entry)entry.retry=0;ensure(player,true);},
    decorate(state){
      if(!state.ok)return state;
      return {...state,left:{...state.left,players:state.left.players.map(decorate)},
        right:{...state.right,players:state.right.players.map(decorate)},observed:decorate(state.observed)};
    }
  };
}

export function setPortrait(element,player,onFailure=()=>{}){
  const candidates=[...new Set([...(player.avatar_candidates||[]),player.avatar,'./assets/themask-logo-256.webp'].filter(Boolean))];
  const key=String(player.id)+':'+candidates.join('|');
  if(element.dataset.portraitKey===key)return;
  element.dataset.portraitKey=key;
  let index=0;
  element.onerror=()=>{
    if(index===0)onFailure(player);
    if(++index<candidates.length)element.src=candidates[index];
    else element.onerror=null;
  };
  element.style.display='';element.src=candidates[0];
}
