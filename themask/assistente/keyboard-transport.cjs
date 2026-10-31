const fs=require('node:fs');
const path=require('node:path');
const readline=require('node:readline');
const {spawn}=require('node:child_process');
const HEADER='// TheMask AutoSpec generated bridge\n';

function validCommand(command){
  return /^spec_autodirector 0\nspec_mode 1\nspec_player (?:[1-9]|10|"[^";\\\r\n]{1,80}")$/.test(command);
}
function createKeyboardTransport({directory,request,platform=process.platform}={}){
  if(platform!=='win32')throw Error('Keyboard transport requires Windows');
  if(!directory||!fs.statSync(directory).isDirectory())throw Error('Pasta cfg do CS2 nao encontrada');
  const file=path.join(directory,'themask_autospec_bridge.cfg'),temporary=file+'.tmp';
  if(fs.existsSync(file)&&!fs.readFileSync(file,'utf8').startsWith(HEADER))throw Error('CFG existente nao reconhecida; nenhum arquivo foi alterado');
  function write(content){
    try{fs.writeFileSync(temporary,HEADER+content+'\n','utf8');fs.renameSync(temporary,file);}
    finally{try{fs.unlinkSync(temporary);}catch{}}
  }
  const clear=()=>write('echo "[AutoSpec] Aguardando corte. F10 reservado para a ponte."');
  clear();
  async function send(command,{isCurrent=()=>true}={}){
    if(!validCommand(command))throw Error('Comando de espectador invalido');
    const checkCurrent=()=>{if(!isCurrent())throw Object.assign(Error('Corte cancelado ou expirado'),{code:'CANCELLED'});};
    checkCurrent();
    let result=await request('check');
    checkCurrent();
    if(result.code!=='READY')throw Object.assign(Error(result.code),{code:result.code});
    write(command);
    result=await request('press'); // Check focus again immediately before the key.
    if(result.code!=='SENT'){clear();throw Object.assign(Error(result.code),{code:result.code});}
  }
  return {send,clear,file};
}
function createKeyboardBridge({script=path.join(__dirname,'TheMask-Keyboard.ps1'),launch=spawn}={}){
  const child=launch('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script],{stdio:['pipe','pipe','inherit'],windowsHide:true});
  let pending=null,readyResolve,readyReject,closed=false;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  // Startup failures are also handled by the first request; avoid unhandled rejection.
  ready.catch(()=>{});
  const startup=setTimeout(()=>readyReject(Error('Ponte de teclado nao iniciou')),12000);
  const lines=readline.createInterface({input:child.stdout});
  lines.on('line',line=>{try{
    const result=JSON.parse(line);
    if(result.ready){clearTimeout(startup);readyResolve();}
    else if(pending){clearTimeout(pending.timer);const {resolve}=pending;pending=null;resolve(result);}
  }catch{}});
  const fail=()=>{closed=true;clearTimeout(startup);const error=Error('Ponte de teclado foi encerrada');readyReject(error);
    if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}};
  child.on('error',fail);child.on('exit',fail);
  return {
    ready,
    async request(action){
      await ready;if(closed)throw Error('Ponte de teclado indisponivel');if(pending)throw Error('Ponte ocupada');
      return new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{pending=null;child.kill();reject(Error('Tempo esgotado na ponte de teclado'));},2500);
        pending={resolve,reject,timer};child.stdin.write(JSON.stringify({action})+'\n',error=>{if(error)fail();});
      });
    },
    close(){child.kill();}
  };
}
module.exports={validCommand,createKeyboardTransport,createKeyboardBridge};
