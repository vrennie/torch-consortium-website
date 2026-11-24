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
const navHtml=nav.map(n=>n.items?'<details><summary>'+escape(n.label)+'</summary><div class="dropdown">'+(n.label==='Projects'||n.label==='About us'?'':'<a href="'+link(n.href)+'">Overview</a>')+n.items.map(c=>'<a href="'+link(c[1])+'">'+escape(c[0])+'</a>').join('')+'</div></details>':'<a href="'+link(n.href)+'">'+escape(n.label)+'</a>').join('');
function frame(title,body){
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(title)+' | TORCH Consortium</title><meta name="description" content="Tuberculosis Omics ResearCH (TORCH) consortium"><link rel="icon" href="'+link('torch-lungs-favicon.svg')+'"><link rel="stylesheet" href="'+link('assets/site.css')+'?v=funding-cards-20261124'+'"></head><body><a class="skip" href="#main">Skip to content</a><header><div class="shell head"><a class="brand" href="'+link('')+'" aria-label="TORCH Consortium home"><img class="brand-logo" src="'+link('branding/torch-horizontal.svg')+'" alt="TORCH — Tuberculosis Omics ResearCH"></a><nav>'+navHtml+'</nav></div></header><main id="main">'+body+'</main><footer class="site-footer"><div class="shell fine">© '+new Date().getUTCFullYear()+' TORCH Consortium</div></footer>'+''+'</body></html>';
}
function banner(title,kicker,description=''){return '<section class="banner"><div class="shell"><div class="eyebrow">'+escape(kicker)+'</div><h1>'+escape(title)+'</h1>'+(description?'<p>'+escape(description)+'</p>':'')+'</div></section>'}
function image(p){const x=p.content.match(/!\[[^\]]*\]\(([^)]+)\)/);return x?fix('<img src="'+escape(x[1])+'" alt="" loading="lazy">'):''}
function personCard(p){
 const photo=image(p);
 const initials=p.title.replace(/^(Prof\.?|Dr\.?)\s+/i,'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
 return '<a class="person-card" href="'+link(p.slug+'/')+'" aria-label="View '+escape(p.title)+' profile">'+
   '<div class="person-photo">'+(photo||'<div class="person-fallback" aria-hidden="true">'+escape(initials)+'</div>')+'</div>'+
   '<div class="person-name">'+escape(p.title)+'</div></a>';
}
function summary(p){
 let s=p.content
   .replace(/!\[[^\]]*\]\([^)]+\)/g,' ')
   .replace(/^#{1,6}\s+.*$/gm,' ')
   .replace(/\[([^\]]+)\]\([^)]+\)/g,'$1')
   .replace(/[#*_>]/g,'')
   .replace(/\s+/g,' ').trim();
 if(s.toLowerCase().startsWith(p.title.toLowerCase()))s=s.slice(p.title.length).replace(/^\s*[-–:]?\s*/,'');
 if(!s || s.startsWith('No text was included'))return 'Project details coming soon.';
 return escape(s.length>125?s.slice(0,122).replace(/\s+\S*$/,'')+'…':s);
}
// PARR-TB resource thumbnail overrides are kept separate from page content.
const parrtbImages={
 'cro-contact-form':'assets/media/aafdb5e6-stellenbosch_logo.jpg',
 'faqs-copy-1':'branding/mick-magma-logo.jpg',
 'frequently-asked-questions':'branding/faq.svg',
 'mickmagma-contact-form':'assets/media/066f42ff-GPA_logo.png',
 'parrtb-intro':'assets/media/066f42ff-GPA_logo.png',
 'relevant-documents':'assets/media/066f42ff-GPA_logo.png',
 'treatment-guidance-tutorial':'assets/media/b227473b-horizontal_logo_Oct_2024.jpg'
};
function card(p){
 const project=p.section==='Projects';
 const resource=p.section==='PARR-TB';
 const asset=resource?parrtbImages[p.slug]:null;
 const visual=asset?'<img src="'+link(asset)+'" alt="" loading="lazy">':image(p)||(project?'<img src="'+link('branding/torch-horizontal.svg')+'" alt="TORCH Consortium logo" loading="lazy">':'<span>T.</span>');
 return '<a class="card'+(project?' project-card':'')+(resource?' resource-card':'')+'" href="'+link(p.slug+'/')+'"><div class="cover">'+visual+'</div><div class="card-body"><h3>'+escape(p.title)+'</h3>'+(resource?'':'<p>'+summary(p)+'</p><b>Explore ↗</b>')+'</div></a>';
}
function renderBooklet(){
 const url=link('assets/documents/PARR-TB-Medical-Officers-Pamphlet.pdf');
 return '<section class="native-pdf" aria-label="PARR-TB medical officers pamphlet PDF">'+
  '<div class="native-pdf-actions"><span>Medical Officers information pamphlet · 4 pages</span>'+
  '<div><a href="'+url+'" target="_blank" rel="noopener">Open full screen ↗</a>'+
  '<a href="'+url+'" download="PARR-TB-Medical-Officers-Pamphlet.pdf">Download PDF ↓</a></div></div>'+
  '<iframe src="'+url+'#view=FitH&toolbar=1" title="PARR-TB Medical Officers information pamphlet (4-page PDF)" loading="lazy"></iframe>'+
  '<p class="native-pdf-fallback">If the document does not appear, <a href="'+url+'" target="_blank" rel="noopener">open the PDF in a new tab</a>.</p>'+
  '</section>';
}
async function save(p,html){const path=join(output,p);await mkdir(dirname(path),{recursive:true});await writeFile(path,html)}
await mkdir(join(output,'assets'),{recursive:true});
await copyFile('public/site.css',join(output,'assets','site.css'));
await copyFile('public/favicon.svg',join(output,'favicon.svg'));
await copyFile('public/torch-lungs-favicon.svg',join(output,'torch-lungs-favicon.svg'));
await mkdir(join(output,'branding'),{recursive:true});
await copyFile('public/branding/torch-horizontal.svg',join(output,'branding','torch-horizontal.svg'));
await copyFile('public/branding/torch-square.svg',join(output,'branding','torch-square.svg'));
await copyFile('public/branding/faq.svg',join(output,'branding','faq.svg'));
await copyFile('public/branding/mick-magma-logo.jpg',join(output,'branding','mick-magma-logo.jpg'));
if(existsSync('public/assets/media'))await cp('public/assets/media',join(output,'assets','media'),{recursive:true});
if(existsSync('public/assets/documents'))await cp('public/assets/documents',join(output,'assets','documents'),{recursive:true});
if(domain)await copyFile('CNAME',join(output,'CNAME'));
await writeFile(join(output,'.nojekyll'),'');
for(const p of pages){
 if(p.draft)continue;
 if(p.slug==='funding-1'){
  const destination=link('funding/');
  await save('funding-1/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url='+destination+'"><link rel="canonical" href="'+destination+'"><title>Funding | TORCH Consortium</title></head><body><p>This page has moved to <a href="'+destination+'">Funding</a>.</p></body></html>');
  continue;
 }
 if(p.slug==='output'){
  const destination=link('publications/');
  await save('output/index.html','<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url='+destination+'"><link rel="canonical" href="'+destination+'"><title>Moved to Publications | TORCH Consortium</title></head><body><p>The Output page has moved to <a href="'+destination+'">Publications</a>.</p></body></html>');
  continue;
 }
 let content=fix(marked.parse(p.content,{gfm:true}));
 if(p.slug==='parrtb-intro')content=content.replace(/<p>\s*\[\[PARR_TB_BOOKLET\]\]\s*<\/p>/,renderBooklet());
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
 if(slug==='people'){
  const groups=JSON.parse(await readFile('data/people.json','utf8'));
  const sections=groups.map(group=>{
   const cards=group.members.map(id=>bySlug.get(id)).filter(p=>p&&p.section==='People'&&!p.draft);
   return '<section class="people-group" aria-label="'+escape(group.title)+'"><h2>'+escape(group.title)+'</h2><div class="people-grid">'+cards.map(personCard).join('')+'</div></section>';
  }).join('');
  await save('people/index.html',frame('People',banner('People','TORCH Consortium','Meet the researchers and partners in the TORCH consortium.')+'<div class="shell list-wrap">'+sections+'</div>'));
  continue;
 }
 if(slug==='vacancies'){
  const body=fix(marked.parse(await readFile('content/vacancies.md','utf8')));
  await save('vacancies/index.html',frame('Vacancies',banner('Vacancies','TORCH Consortium')+
    '<div class="shell body-wrap"><article class="prose vacancies-message">'+body+'</article></div>'));
  continue;
 }
 if(slug==='parrtb'){
  const resources=[
   ['parrtb-intro','Guidance Document'],
   ['relevant-documents-copy','Informed Consent'],
   ['new-page','MICK-MAGMA Account Setup'],
   ['treatment-guidance-tutorial','MICK-MAGMA Tutorial'],
   ['faqs-copy-1','MICK-MAGMA Troubleshooting'],
   ['frequently-asked-questions','Frequently asked questions'],
   ['cro-contact-form','CRO Details'],
   ['mickmagma-contact-form','Contact Form'],
   ['relevant-documents','Supporting Documents']
  ].filter(([id])=>bySlug.has(id)&&!bySlug.get(id).draft);
  const intro='<p class="parrtb-intro">This page provides guidance and supporting resources for healthcare professionals participating in the GenPath PARR-TB study. Start with the Guidance Document for an overview of the study. You can also find information about informed consent, MICK-MAGMA account setup and treatment recommendations, troubleshooting, and frequently asked questions. For additional assistance, consult CRO Details or the Contact Form. Study materials and reference documents are available under Supporting Documents.</p>';
  const subtitles={
   'parrtb-intro':'Study overview',
   'relevant-documents-copy':'Consent requirements',
   'new-page':'Getting started',
   'treatment-guidance-tutorial':'Treatment guidance',
   'faqs-copy-1':'Technical support',
   'frequently-asked-questions':'Common questions',
   'cro-contact-form':'Clinical research contacts',
   'mickmagma-contact-form':'Submit enquiries',
   'relevant-documents':'Study reference materials'
  };
  const items=resources.map(([id,title])=>'<a class="parrtb-link" href="'+link(id+'/')+'"><span class="parrtb-link-copy"><strong>'+escape(title)+'</strong><small>'+escape(subtitles[id]||'')+'</small></span><span class="parrtb-arrow" aria-hidden="true">↗</span></a>').join('');
  await save('parrtb/index.html',frame('PARR-TB',banner('PARR-TB study resources','PARR-TB study')+'<div class="shell parrtb-resources">'+intro+'<nav class="parrtb-link-grid" aria-label="PARR-TB resource pages">'+items+'</nav></div>'));
  continue;
 }
 if(slug==='projects'){
  const catalog=JSON.parse(await readFile('data/projects.json','utf8'));
  const renderGroup=(title,ids)=>'<section class="project-group" aria-label="'+escape(title)+'"><h2>'+escape(title)+'</h2><div class="cards">'+ids.map(id=>bySlug.get(id)).filter(p=>p&&!p.draft).map(card).join('')+'</div></section>';
  const content=renderGroup('Current Projects',catalog.current)+renderGroup('Past Projects',catalog.past);
  await save('projects/index.html',frame('Projects',banner('Projects','TORCH Consortium',sub)+'<div class="shell list-wrap">'+content+'</div>'));
  continue;
 }
 const list=inSection(section).filter(p=>slug!=='about'||p.slug!=='contact-us');
 await save(slug+'/index.html',frame(heading,banner(heading,'TORCH Consortium',sub)+'<div class="shell list-wrap"><div class="cards">'+list.map(card).join('')+'</div></div>'));
}
const selected=JSON.parse(await readFile('data/projects.json','utf8')).current.map(x=>bySlug.get(x)).filter(Boolean);
const home=bySlug.get('home');
const logos=home?fix(marked.parse(home.content)):'';
const landing='<section class="hero"><div class="shell hero-grid"><div><div class="eyebrow">Tuberculosis Omics ResearCH</div><h1>Research that connects.<br><em>Insights that matter.</em></h1><p>The TORCH consortium brings together researchers across institutions and disciplines to advance tuberculosis genomics, omics and translational research.</p><div class="hero-actions"><a class="button" href="'+link('what-we-do/')+'">What we do ↗</a><a class="button secondary" href="'+link('publications/')+'">Publications</a></div></div><div class="hero-logo-panel"><img class="hero-square-logo" src="'+link('branding/torch-square.svg')+'" alt="TORCH Tuberculosis Omics ResearCH logo"></div></div></section>'+
'<section class="section shell"><div class="section-top"><div><div class="eyebrow">Our work</div><h2>Research and collaborations</h2></div><a href="'+link('projects/')+'">All projects ↗</a></div><div class="cards">'+selected.map(card).join('')+'</div></section>'+
'<section class="dark"><div class="shell split"><div><div class="eyebrow">The consortium</div><h2>Connecting research across borders.</h2><p>Working together on genomics, surveillance, data analysis and tuberculosis research.</p><a class="button outline" href="'+link('people/')+'">Meet the people ↗</a></div><div class="metrics"><div><strong>'+inSection('People').length+'</strong><span>People profiles</span></div><div><strong>'+inSection('Projects').length+'</strong><span>Project pages</span></div></div></div></section>'+
'<section class="section shell"><div class="eyebrow">Our network</div><h2>Institutional partners</h2><div class="logos">'+logos+'</div></section>';
await save('index.html',frame('Home',landing));
await save('404.html',frame('Page not found',banner('Page not found','404')+'<div class="shell body-wrap"><a class="button" href="'+link('')+'">Back to homepage</a></div>'));
console.log('Built '+pages.filter(p=>!p.draft).length+' pages with base '+base);
