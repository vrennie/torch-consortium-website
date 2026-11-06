import {readFile,readdir,mkdir,writeFile,copyFile,cp} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {marked} from 'marked';
const root=process.cwd();
const output=join(root,'dist');
const domain=existsSync('CNAME');
const env=process.env.SITE_BASE_PATH;
const base=env?(env==='/'?'/':'/'+env.replace(/^\/|\/$/g,'')+'/'):(domain?'/':'/torch-consortium-website/');
const link=p=>base+String(p||'').replace(/^\/+/,'');
const escape=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const nav=JSON.parse(await readFile('data/navigation.json','utf8'));
const media=JSON.parse(await readFile('data/media.json','utf8'));
const sources=new Map(media.map(x=>[x.file,x.source]));
const pages=[];
for(const file of (await readdir('content/pages')).filter(x=>x.endsWith('.md'))){
 const raw=await readFile('content/pages/'+file,'utf8');
 const m=raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
 if(!m)throw Error('Bad page header: '+file);
 const obj={};
 for(const line of m[1].split('\n')){const i=line.indexOf(':');if(i<0)continue;const k=line.slice(0,i).trim();const v=line.slice(i+1).trim();try{obj[k]=JSON.parse(v)}catch{obj[k]=v}}
 pages.push({...obj,slug:file.replace(/\.md$/,''),content:m[2]});
}
const bySlug=new Map(pages.map(p=>[p.slug,p]));
const inSection=s=>pages.filter(p=>p.section===s&&!p.draft);
function fix(html){
 return html.replace(/\b(href|src)=(["'])(.*?)\2/gi,(_all,key,quote,original)=>{
  let v=original;
  const own=v.match(/^https?:\/\/(?:www\.)?torch-consortium\.com(\/[^?#]*)?([?#].*)?$/i);
  if(own)v=(own[1]||'/')+(own[2]||'');
  if(key.toLowerCase()==='src'&&v.startsWith('/assets/media/')){
   const f=v.split('/').pop();
   if(!existsSync(join(root,'public','assets','media',f)))v=sources.get(f)||v;
  }
  if(!/^(?:https?:|mailto:|tel:|data:|#)/i.test(v)){
   if(v.startsWith('/')){
    const m=v.match(/^([^?#]*)(.*)$/);
    const path=m[1].replace(/^\/|\/$/g,'');
    v=link(path+(path&&!path.startsWith('assets/')?'/' : ''))+m[2];
   }else if(key.toLowerCase()==='href'&&!v.startsWith('.')){
    const slug=v.replace(/\/$/,'');
    if(bySlug.has(slug))v=link(slug+'/');
   }
  }
  return key+'='+quote+escape(v)+quote;
 });
}
const navHtml=nav.map(n=>n.items?'<details><summary>'+escape(n.label)+'</summary><div class="dropdown"><a href="'+link(n.href)+'">Overview</a>'+n.items.map(c=>'<a href="'+link(c[1])+'">'+escape(c[0])+'</a>').join('')+'</div></details>':'<a href="'+link(n.href)+'">'+escape(n.label)+'</a>').join('');
function frame(title,body){
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+' | TORCH Consortium</title><meta name="description" content="Tuberculosis Omics ResearCH (TORCH) consortium"><link rel="icon" href="'+link('favicon.svg')+'"><link rel="stylesheet" href="'+link('assets/site.css')+'"></head><body><a class="skip" href="#main">Skip to content</a><header><div class="shell head"><a class="brand" href="'+link('')+'"><span class="symbol">T<span>.</span></span><span>TORCH<small>CONSORTIUM</small></span></a><nav>'+navHtml+'</nav></div></header><main id="main">'+body+'</main><footer><div class="shell foot"><div><strong>TORCH Consortium</strong><p>Collaborative research on tuberculosis genomics and omics.</p></div><div><a href="'+link('what-we-do/')+'">About</a><a href="'+link('publications/')+'">Publications</a><a href="'+link('contact-us/')+'">Contact</a></div></div><div class="shell fine">© '+new Date().getUTCFullYear()+' TORCH Consortium</div></footer></body></html>';
}
function banner(title,kicker,description=''){return '<section class="banner"><div class="shell"><div class="eyebrow">'+escape(kicker)+'</div><h1>'+escape(title)+'</h1>'+(description?'<p>'+escape(description)+'</p>':'')+'</div></section>'}
function image(p){const x=p.content.match(/!\[[^\]]*\]\(([^)]+)\)/);return x?fix('<img src="'+escape(x[1])+'" alt="" loading="lazy">'):''}
function summary(p){let s=p.content.replace(/!\[[^\]]*\]\([^)]+\)/g,' ').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[#*_>]/g,'').replace(/\s+/g,' ').trim();return escape(s.length>140?s.slice(0,137)+'…':s)}
function card(p){return '<a class="card" href="'+link(p.slug+'/')+'"><div class="cover">'+(image(p)||'<span>T.</span>')+'</div><div class="card-body"><h3>'+escape(p.title)+'</h3><p>'+summary(p)+'</p><b>Explore ↗</b></div></a>'}
async function save(p,html){const path=join(output,p);await mkdir(dirname(path),{recursive:true});await writeFile(path,html)}
await mkdir(join(output,'assets'),{recursive:true});
await copyFile('public/site.css',join(output,'assets','site.css'));
await copyFile('public/favicon.svg',join(output,'favicon.svg'));
if(existsSync('public/assets/media'))await cp('public/assets/media',join(output,'assets','media'),{recursive:true});
if(domain)await copyFile('CNAME',join(output,'CNAME'));
await writeFile(join(output,'.nojekyll'),'');
for(const p of pages){
 if(p.draft)continue;
 let content=fix(marked.parse(p.content,{gfm:true}));
 const initial=content.match(/^<h1[^>]*>([\s\S]*?)<\/h1>\s*/i);
 if(initial&&initial[1].replace(/<[^>]*>/g,'').trim().toLowerCase()===p.title.toLowerCase())content=content.slice(initial[0].length);
 await save(p.slug+'/index.html',frame(p.title,banner(p.title,p.section)+'<div class="shell body-wrap"><article class="prose">'+content+'</article></div>'));
}
for(const [slug,section,heading,sub] of [
 ['people','People','People','Researchers and collaborators connected through TORCH.'],
 ['projects','Projects','Projects','Research projects and partnerships.'],
 ['parrtb','PARR-TB','PARR-TB study resources','Training information and support materials.'],
 ['vacancies','Vacancies','Vacancies','Past and current opportunities.'],
 ['about','About','About TORCH','Our mission, focus areas and collaborations.']
]){
 const list=inSection(section).filter(p=>slug!=='about'||p.slug!=='contact-us');
 await save(slug+'/index.html',frame(heading,banner(heading,'TORCH Consortium',sub)+'<div class="shell list-wrap"><div class="cards">'+list.map(card).join('')+'</div></div>'));
}
const selected=['smartt','new-page-2','genpath-africa-parrtb','exitrif','vliruos'].map(x=>bySlug.get(x)).filter(Boolean);
const home=bySlug.get('home');
const logos=home?fix(marked.parse(home.content)):'';
const landing='<section class="hero"><div class="shell hero-grid"><div><div class="eyebrow">Tuberculosis Omics ResearCH</div><h1>Research that connects.<br><em>Insights that matter.</em></h1><p>The TORCH consortium brings together researchers across institutions and disciplines to advance tuberculosis genomics, omics and translational research.</p><div class="hero-actions"><a class="button" href="'+link('what-we-do/')+'">What we do ↗</a><a class="button secondary" href="'+link('publications/')+'">Publications</a></div></div><div class="orb"><span>T<b>.</b></span><small>RESEARCH · COLLABORATION · IMPACT</small></div></div></section>'+
'<section class="section shell"><div class="section-top"><div><div class="eyebrow">Our work</div><h2>Research and collaborations</h2></div><a href="'+link('projects/')+'">All projects ↗</a></div><div class="cards">'+selected.map(card).join('')+'</div></section>'+
'<section class="dark"><div class="shell split"><div><div class="eyebrow">The consortium</div><h2>Connecting research across borders.</h2><p>Working together on genomics, surveillance, data analysis and tuberculosis research.</p><a class="button outline" href="'+link('people/')+'">Meet the people ↗</a></div><div class="metrics"><div><strong>'+inSection('People').length+'</strong><span>People profiles</span></div><div><strong>'+inSection('Projects').length+'</strong><span>Project pages</span></div></div></div></section>'+
'<section class="section shell"><div class="eyebrow">Our network</div><h2>Institutional partners</h2><div class="logos">'+logos+'</div></section>';
await save('index.html',frame('Home',landing));
await save('404.html',frame('Page not found',banner('Page not found','404')+'<div class="shell body-wrap"><a class="button" href="'+link('')+'">Back to homepage</a></div>'));
console.log('Built '+pages.filter(p=>!p.draft).length+' pages with base '+base);
