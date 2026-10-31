import { createPanelMotion } from './themask-motion.js';
import { setPortrait } from './themask-photos.js';
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const players=state=>[...(state.left?.players||[]),...(state.right?.players||[])];
const clone=player=>({...player,nades:[...(player.nades||[])]});

export function buildRanking(list){
  return list.map(p=>({...p,kd:number(p.kills)/Math.max(1,number(p.deaths))}))
    .sort((a,b)=>b.kd-a.kd||number(b.kills)-number(a.kills)||number(a.deaths)-number(b.deaths)||String(a.id).localeCompare(String(b.id)));
}

export function roundHighlight(list){
  const sorted=[...list].sort((a,b)=>number(b.round_kills)-number(a.round_kills)||number(b.round_dmg)-number(a.round_dmg)||number(b.assists)-number(a.assists)||String(a.id).localeCompare(String(b.id)));
  const best=sorted[0];
  return best&&(number(best.round_kills)>0||number(best.round_dmg)>0)?clone(best):null;
}

export function createRoundHighlights(now=()=>Date.now()){
  let map='',round=null,active=new Map(),highlight=null,ended=false;
  const merge=list=>{
    for(const p of list){
      const previous=active.get(p.id);
      active.set(p.id,{...clone(p),avatar:p.avatar||previous?.avatar||'',
        round_kills:Math.max(number(p.round_kills),number(previous?.round_kills)),
        round_dmg:Math.max(number(p.round_dmg),number(previous?.round_dmg))});
    }
  };
  const finish=()=>{
    const best=roundHighlight([...active.values()]);
    if(best){
      const key=map+':'+round;
      highlight={...best,round,key,completed_at:highlight?.key===key?highlight.completed_at:now()};
    }
    ended=true;
  };
  return {update(state){
    if(!state.ok)return highlight;
    if(state.map!==map||state.phase==='warmup'||(state.phase==='freezetime'&&state.round===1&&round>1)){
      map=state.map;active=new Map();highlight=null;ended=false;round=null;
    }
    const list=players(state);
    if(state.phase==='over'||state.phase==='gameover'){
      if(round==null)round=state.round;
      merge(list);finish();
    }else if(['live','bomb','defuse'].includes(state.phase)){
      if(ended||round!=null&&state.round!==round){
        if(!ended)finish();
        active=new Map();ended=false;
      }
      round=state.round;merge(list);
    }else if(state.phase==='freezetime'&&!ended&&round!=null&&state.round!==round){
      finish();
    }
    return highlight;
  }};
}

export function createPanels({onPhotoFailure}={}){
  const ranking=document.querySelector('#themask-ranking'),rows=ranking.querySelector('.ranking-rows');
  const mvp=document.querySelector('#themask-mvp'),economy=document.querySelector('#themask-economy');
  const radar=document.querySelector('#themask-radar'),show=createPanelMotion();
  const history=createRoundHighlights();
  let holdTimer=null;
  const text=(element,value)=>{element.textContent=String(value??'');};
  const dollars=value=>value==null?'—':'$'+Math.max(0,number(value)).toLocaleString('pt-BR');
  function render(state){
    const highlight=history.update(state)||state.last_mvp||null;
    const shop=['freezetime','timeout_ct','timeout_t','paused','gameover'].includes(state.phase);
    const options=state.panels||{};
    const rankingVisible=shop&&options.ranking!==false;
    const economyVisible=shop&&state.phase!=='gameover'&&options.economy!==false;
    const remaining=highlight?.completed_at==null?0:Math.max(0,8000-(Date.now()-highlight.completed_at));
    const mvpVisible=Boolean((shop||state.phase==='over'||remaining>0)&&highlight&&options.mvp!==false);
    clearTimeout(holdTimer);
    if(mvpVisible&&!shop&&state.phase!=='over'&&remaining>0)holdTimer=setTimeout(()=>render(state),remaining+10);
    const entered=show(ranking,rankingVisible,260);
    show(economy,economyVisible);
    show(mvp,mvpVisible,100);
    show(radar,!rankingVisible,300);
    if(rankingVisible){
      const existing=new Map([...rows.children].map(row=>[row.dataset.id,row]));
      const nodes=buildRanking(players(state)).map((p,index)=>{
        const row=existing.get(String(p.id))||document.createElement('div');row.className='ranking-row '+p.side;row.dataset.id=String(p.id);
        if(!row.children.length)row.innerHTML='<span class="rank-pos"></span><img class="rank-photo hex" alt=""><span class="rank-name"></span><b class="rank-kills"></b><b class="rank-deaths"></b><b class="rank-kd"></b>';
        text(row.querySelector('.rank-pos'),index+1);setPortrait(row.querySelector('img'),p,onPhotoFailure);
        text(row.querySelector('.rank-name'),p.name);text(row.querySelector('.rank-kills'),p.kills);
        text(row.querySelector('.rank-deaths'),p.deaths);text(row.querySelector('.rank-kd'),p.kd.toFixed(2));
        if(entered&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
          row.getAnimations().forEach(animation=>animation.cancel());
          const animation=row.animate([{opacity:0,transform:'translateX(-16px)'},{opacity:1,transform:'translateX(0)'}],{duration:260,delay:340+index*28,fill:'both',easing:'ease-out'});
          animation.finished.then(()=>animation.cancel()).catch(()=>{});
        }
        return row;
      });
      rows.replaceChildren(...nodes);
    }
    if(mvpVisible){
      mvp.classList.toggle('CT',highlight.side==='CT');mvp.classList.toggle('T',highlight.side==='T');
      const current=players(state).find(player=>player.id===highlight.id);
      setPortrait(mvp.querySelector('.mvp-photo'),{...highlight,avatar:current?.avatar||highlight.avatar,avatar_candidates:current?.avatar_candidates||highlight.avatar_candidates},onPhotoFailure);
      text(mvp.querySelector('.mvp-name'),highlight.name);text(mvp.querySelector('.mvp-real-name'),highlight.real_name);
      text(mvp.querySelector('.mvp-kills'),highlight.round_kills);text(mvp.querySelector('.mvp-damage'),highlight.round_dmg);
      text(mvp.querySelector('.mvp-round'),highlight.round?'RODADA '+highlight.round:'ÚLTIMA RODADA');
    }
    if(economyVisible){
      for(const [side,team] of [['left',state.left],['right',state.right]]){
        const box=economy.querySelector('.eco-'+side);
        box.classList.toggle('CT',team.side==='CT');box.classList.toggle('T',team.side==='T');
        text(box.querySelector('.eco-money'),dollars(team.money));text(box.querySelector('.eco-loss'),dollars(team.loss_bonus));
        box.querySelectorAll('.eco-level i').forEach((pip,index)=>pip.classList.toggle('on',team.loss_level!=null&&index<team.loss_level));
      }
    }
  }
  return {render};
}
