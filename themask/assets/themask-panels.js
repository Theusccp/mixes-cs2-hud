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

export function createRoundHighlights(){
  let map='',lastRound=null,lastPhase='',active=[],highlight=null,ended=false;
  return {update(state){
    if(!state.ok)return highlight;
    if(state.map!==map||state.phase==='warmup'||(state.phase==='freezetime'&&state.round===1&&lastRound>1)){
      map=state.map;active=[];highlight=null;ended=false;lastRound=null;lastPhase='';
    }
    const list=players(state);
    if(state.phase==='over'||state.phase==='gameover'){
      const best=roundHighlight(list)||roundHighlight(active);
      if(best)highlight={...best,round:state.round};
      ended=true;
    }else if(['live','bomb','defuse'].includes(state.phase)){
      if(ended){active=[];ended=false;}
      active=list.map(clone);
    }else if(!ended&&lastRound!=null&&state.round!==lastRound&&['live','bomb','defuse'].includes(lastPhase)){
      const best=roundHighlight(active);
      if(best)highlight={...best,round:lastRound};
      ended=true;
    }
    lastPhase=state.phase;lastRound=state.round;
    return highlight;
  }};
}

export function createPanels(){
  const ranking=document.querySelector('#themask-ranking'),rows=ranking.querySelector('.ranking-rows');
  const mvp=document.querySelector('#themask-mvp'),economy=document.querySelector('#themask-economy');
  const history=createRoundHighlights();
  const image=(element,url)=>{
    const source=url||'./assets/themask-logo-256.webp';
    if(element.getAttribute('src')!==source)element.src=source;
    element.onerror=()=>{element.onerror=null;element.src='./assets/themask-logo-256.webp';};
  };
  const text=(element,value)=>{element.textContent=String(value??'');};
  const dollars=value=>value==null?'—':'$'+Math.max(0,number(value)).toLocaleString('pt-BR');
  function render(state){
    const highlight=history.update(state)||state.last_mvp||null;
    const shop=['freezetime','timeout_ct','timeout_t','paused','gameover'].includes(state.phase);
    const options=state.panels||{};
    ranking.hidden=!(shop&&options.ranking!==false);
    economy.hidden=!(shop&&state.phase!=='gameover'&&options.economy!==false);
    mvp.hidden=!((shop||state.phase==='over')&&highlight&&options.mvp!==false);
    document.documentElement.classList.toggle('ranking-active',!ranking.hidden);
    if(!ranking.hidden){
      const nodes=buildRanking(players(state)).map((p,index)=>{
        const row=document.createElement('div');row.className='ranking-row '+p.side;
        row.innerHTML='<span class="rank-pos"></span><img class="rank-photo hex" alt=""><span class="rank-name"></span><b class="rank-kills"></b><b class="rank-deaths"></b><b class="rank-kd"></b>';
        text(row.querySelector('.rank-pos'),index+1);image(row.querySelector('img'),p.avatar);
        text(row.querySelector('.rank-name'),p.name);text(row.querySelector('.rank-kills'),p.kills);
        text(row.querySelector('.rank-deaths'),p.deaths);text(row.querySelector('.rank-kd'),p.kd.toFixed(2));
        return row;
      });
      rows.replaceChildren(...nodes);
    }
    if(!mvp.hidden){
      mvp.classList.toggle('CT',highlight.side==='CT');mvp.classList.toggle('T',highlight.side==='T');
      image(mvp.querySelector('.mvp-photo'),highlight.avatar);
      text(mvp.querySelector('.mvp-name'),highlight.name);text(mvp.querySelector('.mvp-real-name'),highlight.real_name);
      text(mvp.querySelector('.mvp-kills'),highlight.round_kills);text(mvp.querySelector('.mvp-damage'),highlight.round_dmg);
      text(mvp.querySelector('.mvp-round'),highlight.round?'RODADA '+highlight.round:'ÚLTIMA RODADA');
    }
    if(!economy.hidden){
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
