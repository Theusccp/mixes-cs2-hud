import { installAutoSpec } from './auto-spec-client.js';
import { createPortraits } from './themask-photos.js';

export function installEchoSpec({game,actions,config,api,apiBase}){
  installAutoSpec({game,actions,config});
  let latest=null;
  const portraits=createPortraits({api,apiBase,onChange:refresh});
  function refresh(){
    if(!latest)return;
    const list=latest.players.map(p=>({id:p.steamid,side:p.team.side,avatar:p.avatar}));
    const decorated=portraits.decorate({ok:true,left:{players:list},right:{players:[]}}).left.players;
    for(const player of decorated){
      if(!player.avatar)continue;
      const registered=game.players.find(p=>p.steamid===player.id);
      if(registered&&!registered.avatar)registered.avatar=player.avatar;
      else if(!registered)game.players.push({steamid:player.id,name:latest.players.find(p=>p.steamid===player.id)?.name,avatar:player.avatar});
    }
  }
  game.on('data',data=>{latest=data;portraits.request(data.players);refresh();});
  const watch=new MutationObserver(()=>{
    document.querySelectorAll('.player-avatar img,.observed-avatar img,.mvp-avatar img,.sbp-avatar img').forEach(img=>{
      if(img.dataset.echoFallback===img.getAttribute('src'))return;
      img.dataset.echoFallback=img.getAttribute('src')||'';
      img.onerror=()=>{
        const parent=img.closest('.player-container,.observed,.mvp,.sb-player');
        const side=parent?.classList.contains('T')?'T':'CT';
        const fallback=new URL(side==='T'?'./default-t-f42d6f37.png':'./default-ct-f3624238.png',import.meta.url).href;
        if(img.src!==fallback){img.classList.remove('mixes-player-photo');img.src=fallback;}
      };
    });
  });
  watch.observe(document.querySelector('#root'),{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
}
