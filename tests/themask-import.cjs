// Run with adm-zip 0.5.16 installed and the actual JTs hud.routes.ts source.
// node tests/themask-import.cjs HUD.zip /path/to/JTs-Hud/src/main/server/domains/huds/hud.routes.ts
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const assert=require('node:assert/strict');
const AdmZip=require('adm-zip');
const [zipPath,routePath]=process.argv.slice(2);
if(!zipPath||!routePath)throw Error('Pass the HUD ZIP and the JTs hud.routes.ts path.');
const source=fs.readFileSync(routePath,'utf8');
const marker='async (req: Request, res: Response) => {';
const start=source.indexOf(marker,source.indexOf('// POST /api/huds/upload-zip'));
const end=source.indexOf('\n  // GET /api/huds',start);
assert.ok(start>=0&&end>start,'JTs import route not found');
const body=source.slice(start+marker.length,end).replace(/\n  }\)\s*$/,'')
  .replace('let hudId: string','let hudId')
  .replace('let hudData: Record<string, any>','let hudData')
  .replace('catch (e: any)','catch (e)');
const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
const upload=new AsyncFunction('req','res','AdmZip','fs','path','getHudsDir','SignatureVerifier',body);
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'themask-import-'));
async function run(buffer,name){
  const response={status:200,body:null};
  const res={status(code){response.status=code;return this;},json(data){response.body=data;return response;}};
  await upload({file:{buffer,originalname:name}},res,AdmZip,fs,path,()=>directory,{});
  return response;
}
(async()=>{
  try{
    const buffer=fs.readFileSync(zipPath);
    const good=await run(buffer,path.basename(zipPath));
    assert.equal(good.status,200,JSON.stringify(good.body));assert.equal(good.body.ok,true);
    const destination=path.join(directory,good.body.id);
    assert.ok(fs.existsSync(path.join(destination,'index.html')));
    const entries=new AdmZip(buffer).getEntries().filter(e=>!e.isDirectory);
    for(const entry of entries)assert.deepEqual(fs.readFileSync(path.join(destination,entry.entryName)),entry.getData(),entry.entryName);
    const broken=await run(buffer.subarray(0,buffer.length-100000),'incomplete.zip');
    assert.equal(broken.status,500);assert.ok(broken.body.error);
    console.log(`PASS: actual JTs import handler extracted ${entries.length} files; version ${good.body.config.version}.`);
    console.log('PASS: truncated ZIP rejected by the same handler.');
  }finally{fs.rmSync(directory,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
