/* Local companion: public Steam portraits and a separate Windows overlay focus fix. */
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');

const validID=id=>/^765\d{14}$/.test(id);
function avatarFromXML(xml){
  const raw=String(xml).match(/<avatarFull>\s*(?:<!\[CDATA\[)?(https:\/\/[^<\]\s]+)(?:\]\]>)?\s*<\/avatarFull>/i)?.[1];
  if(!raw)return '';
  try{const url=new URL(raw.replace(/&amp;/g,'&'));
    return url.protocol==='https:'&&/(^|\.)steamstatic\.com$|(^|\.)steamcdn-a\.akamaihd\.net$|(^|\.)steamusercontent\.com$/i.test(url.hostname)?url.href:'';
  }catch{return '';}
}
function createAvatarStore({fetchText,cachePath,now=()=>Date.now()}={}){
  const pending=new Map(),cache=new Map();
  if(cachePath)try{for(const [id,entry] of Object.entries(JSON.parse(fs.readFileSync(cachePath,'utf8'))))
    if(validID(id)&&entry.steam&&avatarFromXML('<avatarFull>'+entry.steam+'</avatarFull>'))cache.set(id,entry);
  }catch{}
  const load=fetchText||async function(url){
    const response=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{'User-Agent':'TheMask-HUD/1.5 (public Steam avatar lookup)'}});
    if(!response.ok)throw Error('Steam unavailable');
    const xml=await response.text();if(xml.length>524288)throw Error('Profile too large');return xml;
  };
  return async function get(id){
    if(!validID(id))return '';
    const saved=cache.get(id);if(saved&&saved.expires>now())return saved.steam;
    if(pending.has(id))return pending.get(id);
    const task=(async()=>{
      let steam='';try{steam=avatarFromXML(await load('https://steamcommunity.com/profiles/'+id+'/?xml=1'));}catch{}
      cache.set(id,{steam,expires:now()+(steam?6*60*60*1000:60000)});
      if(steam&&cachePath)try{fs.mkdirSync(path.dirname(cachePath),{recursive:true});fs.writeFileSync(cachePath,JSON.stringify(Object.fromEntries(cache)));}catch{}
      return steam;
    })();
    pending.set(id,task);
    try{return await task;}finally{pending.delete(id);}
  };
}
function createHelper({getAvatar=createAvatarStore(),port=23416}={}){
  const server=http.createServer(async(req,res)=>{
    const origin=req.headers.origin;
    const originOK=!origin||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const hostOK=new RegExp('^(127\\.0\\.0\\.1|localhost):'+(server.address()?.port||port)+'$').test(req.headers.host||'');
    if(!originOK||!hostOK){res.writeHead(403);return res.end();}
    if(origin)res.setHeader('Access-Control-Allow-Origin',origin);
    res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Private-Network','true');
    res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
    res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
    if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
    if(req.method!=='GET'){res.writeHead(405);return res.end('{}');}
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/health')return res.end(JSON.stringify({service:'themask-helper',version:'1.5.0'}));
    const id=pathname.match(/^\/avatar\/(765\d{14})$/)?.[1];
    if(!id){res.writeHead(404);return res.end('{}');}
    try{res.end(JSON.stringify({steam:await getAvatar(id)}));}
    catch{res.writeHead(502);res.end('{"steam":""}');}
  });
  return server;
}
if(require.main===module){
  const getAvatar=createAvatarStore({cachePath:path.join(__dirname,'cache','steam-avatars.json')});
  const server=createHelper({getAvatar});
  let mouse;
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'O assistente ja esta aberto (porta 23416).':error.message);process.exitCode=1;});
  server.listen(23416,'127.0.0.1',()=>{
    console.log('TheMask 1.5: fotos Steam automaticas ativas. Deixe esta janela aberta.');
    console.log('Apos iniciar a HUD, use Alt+Tab e selecione Counter-Strike 2 uma vez.');
    if(process.platform==='win32'){
      mouse=spawn('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'TheMask-Mouse.ps1')],{stdio:'inherit',windowsHide:true});
      mouse.on('error',()=>console.log('Nao foi possivel iniciar o ajuste da janela. Use a HUD apenas no OBS.'));
    }
  });
  const stop=()=>{mouse?.kill();server.close();process.exit();};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);process.on('SIGHUP',stop);process.on('exit',()=>mouse?.kill());
}
module.exports={avatarFromXML,createAvatarStore,createHelper};
