const test=require('node:test');
const assert=require('node:assert/strict');
const {readFile}=require('node:fs/promises');
const {avatarFromXML,createAvatarStore,createHelper}=require('../themask/assistente/themask-helper.cjs');
const avatar='https://avatars.steamstatic.com/'+'a'.repeat(40)+'_full.jpg';
const id='76561198400444880';

test('extrai retrato Steam full e rejeita imagens de outros hosts',()=>{
  assert.equal(avatarFromXML('<avatarFull><![CDATA['+avatar+']]></avatarFull>'),avatar);
  assert.equal(avatarFromXML('<avatarFull>'+avatar+'</avatarFull>'),avatar);
  assert.equal(avatarFromXML('<avatarFull>https://steamstatic.com.evil.test/a.jpg</avatarFull>'),'');
  assert.equal(avatarFromXML('<avatarFull>http://avatars.steamstatic.com/a.jpg</avatarFull>'),'');
});
test('cache evita duplicar consultas simultâneas e tenta novamente após indisponibilidade',async()=>{
  let calls=0,now=1000;
  const get=createAvatarStore({now:()=>now,fetchText:async()=>{calls++;return '<avatarFull>'+avatar+'</avatarFull>';}});
  assert.deepEqual(await Promise.all([get(id),get(id),get(id)]),[avatar,avatar,avatar]);assert.equal(calls,1);
  await get(id);assert.equal(calls,1);
  now+=7*60*60*1000;await get(id);assert.equal(calls,2);
  assert.equal(await get('../test'),'');assert.equal(calls,2);
  let tries=0;
  const retry=createAvatarStore({now:()=>now,fetchText:async()=>{if(++tries===1)throw Error('offline');return '<avatarFull>'+avatar+'</avatarFull>';}});
  assert.equal(await retry(id),'');assert.equal(await retry(id),'');assert.equal(tries,1);
  now+=61000;assert.equal(await retry(id),avatar);assert.equal(tries,2);
});
test('assistente atende somente leitura local com origens do gerenciador',async()=>{
  let calls=0;
  const server=createHelper({port:0,getAvatar:async()=>{calls++;return avatar;}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    let r=await fetch(base+'/health');assert.equal((await r.json()).service,'themask-helper');
    r=await fetch(base+'/avatar/'+id,{headers:{Origin:'http://localhost:23415'}});
    assert.equal(r.headers.get('access-control-allow-origin'),'http://localhost:23415');assert.equal((await r.json()).steam,avatar);
    r=await fetch(base+'/avatar/'+id,{headers:{Origin:'https://other.example'}});assert.equal(r.status,403);
    r=await fetch(base+'/avatar/'+id,{method:'POST'});assert.equal(r.status,405);
    r=await fetch(base+'/avatar/not-an-id');assert.equal(r.status,404);assert.equal(calls,1);
    const status=await new Promise((resolve,reject)=>require('node:http').get(base+'/health',{headers:{Host:'other.example:'+server.address().port}},response=>{response.resume();resolve(response.statusCode);}).on('error',reject));assert.equal(status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
test('HUD prioriza foto cadastrada, consulta Steam ausente e recupera foto quebrada',async()=>{
  const source=await readFile(require.resolve('../themask/assets/themask-state.js'),'utf8');
  const stateURL='data:text/javascript;base64,'+Buffer.from(source).toString('base64');
  const photos=(await readFile(require.resolve('../themask/assets/themask-photos.js'),'utf8')).replace('./themask-state.js',stateURL);
  const {createPortraits}=await import('data:text/javascript;base64,'+Buffer.from(photos).toString('base64'));
  let changed,apiCalls=0,helperCalls=0;
  const updated=()=>new Promise(resolve=>changed=resolve);
  const portraits=createPortraits({apiBase:'http://localhost:23415/',onChange:()=>changed?.(),
    api:{players:{getAvatarURLs:async()=>{apiCalls++;return {custom:'',steam:''};}}},
    fetchImpl:async url=>({ok:true,json:async()=>url.endsWith('/health')?{service:'themask-helper'}:(helperCalls++,{steam:avatar})})});
  const custom={id,avatar:'http://localhost:23415/api/uploads/portrait.png'};
  portraits.request([custom]);assert.equal(apiCalls,0);
  let done=updated();portraits.request([{steamid:id,avatar:''}]);await done;
  let state=portraits.decorate({ok:true,left:{players:[custom]},right:{players:[]},observed:custom});
  assert.equal(state.observed.avatar,custom.avatar);assert.deepEqual(state.observed.avatar_candidates,[custom.avatar,avatar]);assert.equal(helperCalls,1);
  state=portraits.decorate({ok:true,left:{players:[{id,avatar:''}]},right:{players:[]}});
  assert.equal(state.left.players[0].avatar,avatar);
  const other='76561198000000000';done=updated();portraits.failed({id:other,avatar:'http://localhost:23415/broken.png'});await done;
  assert.equal(helperCalls,2);
});

test('painel local funciona sem ação da HUD e parada neutraliza ponte',async()=>{
  let cleared=0;
  const server=createHelper({port:0,onManual:()=>cleared++});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const post=body=>fetch(base+'/director/control',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  try{
    const page=await fetch(base+'/director');assert.match(page.headers.get('content-type'),/text\/html/);
    assert.match(await page.text(),/data-mode="auto"/);
    let r=await post({mode:'auto'}),s=await r.json();
    assert.equal(s.mode,'auto');assert.equal(s.feed.connected,false);assert.equal(s.control_source,'helper');
    r=await post({mode:'preview'});assert.equal((await r.json()).mode,'preview');
    r=await post({mode:'off'});assert.equal((await r.json()).mode,'off');assert.equal(cleared,1);
    assert.equal((await post({mode:'quit'})).status,400);
    r=await fetch(base+'/director/control');assert.equal(r.status,404);
    r=await fetch(base+'/director/control',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://other.example'},body:'{"mode":"auto"}'});assert.equal(r.status,403);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
