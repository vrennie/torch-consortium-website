import {readFile,mkdir,writeFile,stat} from 'node:fs/promises';
import {join} from 'node:path';
const assets=JSON.parse(await readFile('data/media.json','utf8'));
const dir=join('public','assets','media');
await mkdir(dir,{recursive:true});
let index=0,success=0,failed=0;
async function worker(){
 while(index<assets.length){
  const a=assets[index++];const dest=join(dir,a.file);
  try{
   if((await stat(dest).catch(()=>null))?.size>0){success++;continue}
   const r=await fetch(a.source,{signal:AbortSignal.timeout(45000)});
   if(!r.ok)throw Error('HTTP '+r.status);
   const b=Buffer.from(await r.arrayBuffer());
   if(b.length>25*1024*1024)throw Error('Image exceeds 25 MB');
   await writeFile(dest,b);success++;
  }catch(e){failed++;console.warn('Could not cache '+a.file+': '+e.message)}
 }
}
await Promise.all(Array.from({length:5},worker));
console.log('Images cached: '+success+'/'+assets.length+'; failed: '+failed);
