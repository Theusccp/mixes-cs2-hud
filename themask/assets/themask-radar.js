const NS='http://www.w3.org/2000/svg';
const vector=value=>Array.isArray(value)&&value.length>=2&&value.slice(0,2).every(Number.isFinite);

export function project(position,map){
  if(!vector(position)||!map)return null;
  const z=Number(position[2])||0;
  const floor=map.floors.find(f=>!f.gate||({'>=':z>=f.gate.z,'<':z<f.gate.z,'>':z>f.gate.z,'<=':z<=f.gate.z})[f.gate.operator]);
  if(!floor)return null;
  const x=floor.origin.x+position[0]*floor.pxPerUX,y=floor.origin.y+position[1]*floor.pxPerUY;
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  return {x,y,level:floor.id,scale:Math.abs(floor.pxPerUX)};
}

const svg=(name,attributes={},text)=>{
  const element=document.createElementNS(NS,name);
  for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));
  if(text!=null)element.textContent=String(text);
  return element;
};

export function createRadar(){
  const root=document.querySelector('#themask-radar');
  const title=root.querySelector('.radar-title'),note=root.querySelector('.radar-note');
  const canvas=root.querySelector('svg'),mapImage=svg('image'),objects=svg('g');
  canvas.append(mapImage,objects);
  let maps=null,lastState=null,lastMap='';
  fetch('./assets/themask-radar-maps.json').then(r=>{if(!r.ok)throw Error('radar assets unavailable');return r.json();})
    .then(data=>{maps=data;if(lastState)render(lastState);})
    .catch(()=>{note.textContent='Radar indisponível';root.classList.add('radar-unavailable');});

  function render(state){
    lastState=state;
    const name=state.radar?.map || 'de_'+String(state.map||'').toLowerCase();
    const map=maps?.[name];
    title.textContent=String(state.map||'RADAR');
    root.classList.toggle('radar-unavailable',Boolean(maps&&!map));
    if(!map){note.textContent=maps?'Mapa sem calibração':'Carregando radar';mapImage.removeAttribute('href');lastMap='';objects.replaceChildren();return;}
    note.textContent='CT / TR';
    if(lastMap!==name){
      lastMap=name;canvas.setAttribute('viewBox',`0 0 ${map.width} ${map.height}`);
      mapImage.setAttribute('href','./assets/'+map.file);
      mapImage.setAttribute('width',map.width);mapImage.setAttribute('height',map.height);
    }
    const nodes=[];
    for(const p of [...state.left.players,...state.right.players]){
      const point=project(p.position,map);if(!point)continue;
      const group=svg('g',{transform:`translate(${point.x} ${point.y})`,class:`radar-player ${p.side} ${p.hp<=0?'dead':''} ${p.observed?'observed':''}`,'data-id':p.id});
      const angle=vector(p.forward)?Math.atan2(p.forward[0],p.forward[1])*180/Math.PI:0;
      if(p.hp>0){
        group.append(svg('path',{d:'M -14 -22 L 0 -53 L 14 -22 Z',transform:`rotate(${angle})`,class:'radar-heading'}));
        group.append(svg('circle',{r:29,class:'radar-dot'}));
        if(p.observed)group.append(svg('circle',{r:37,class:'radar-observed'}));
        group.append(svg('text',{'text-anchor':'middle','dominant-baseline':'central',class:'radar-slot'},p.slot));
        if(p.bomb)group.append(svg('rect',{x:22,y:17,width:14,height:14,class:'radar-carrier'}));
      }else group.append(svg('path',{d:'M -16 -16 L 16 16 M -16 16 L 16 -16',class:'radar-dead'}));
      nodes.push(group);
    }
    for(const grenade of state.radar?.grenades || []){
      const point=project(grenade.position,map);if(!point)continue;
      if(grenade.type==='smoke'&&Number(grenade.effecttime)>0)
        nodes.push(svg('circle',{cx:point.x,cy:point.y,r:144*point.scale,class:'radar-smoke'}));
    }
    const bomb=state.radar?.bomb;
    if(bomb&&!['carried','planting','defused','exploded'].includes(bomb.state)){
      const point=project(bomb.position,map);
      if(point){const group=svg('g',{transform:`translate(${point.x} ${point.y})`,class:'radar-bomb'});
        group.append(svg('rect',{x:-25,y:-22,width:50,height:44,rx:5}));
        group.append(svg('text',{'text-anchor':'middle','dominant-baseline':'central'},'C4'));nodes.push(group);}
    }
    objects.replaceChildren(...nodes);
  }
  return {render};
}
