import {pagesOf,textOf,type NotebookDocument,type Block} from './types';

/** Reader-facing author text, separate from selector offsets and protected literals. */
export function readerFields(b:Block){
 const values:[string,unknown][]=[];
 for(const key of ['title','text','question','prompt','result','explanation','caption','alt','xLabel','yLabel','attribution'])if(!(key==='text'&&['quote','code'].includes(b.type)))values.push([key,b[key]]);
 for(const key of ['items','steps','options'] as const)(b[key]||[]).forEach((v,i)=>values.push([`${key}.${i}`,v.text]));
 b.parameters?.forEach((p,i)=>{values.push([`parameters.${i}.name`,p.name],[`parameters.${i}.description`,p.description]);});
 [...b.columns||[],...(b.rows||[]).flat()].forEach((v,i)=>values.push([`cells.${i}`,v]));
 [...b.nodes||[],...b.edges||[],...b.series||[]].forEach((v,i)=>values.push([`labels.${i}`,v.label]));
 b.pairs?.forEach((p,i)=>values.push([`pairs.${i}.left`,p.left],[`pairs.${i}.right`,p.right]));
 values.push(['study.aside',b.study?.aside],['study.label',b.study?.label]);b.study?.explanations?.forEach((e,i)=>values.push([`study.explanations.${i}`,e.note]));
 return values.filter((v):v is [string,string]=>typeof v[1]==='string'&&!!v[1]);
}
export function editorialMetrics(d:NotebookDocument){
 const entries:{location:string;text:string}[]=[],pages=pagesOf(d);
 for(const c of d.notebook.chapters){entries.push({location:c.id+'.title',text:c.title});for(const p of c.pages){for(const key of ['title','subtitle','summary'] as const)if(p[key])entries.push({location:p.id+'.'+key,text:p[key]!});for(const cue of p.cues||[])entries.push({location:cue.id,text:cue.text});for(const b of p.blocks)for(const [key,text] of readerFields(b))entries.push({location:b.id+'.'+key,text});}}
 const prose=entries.map(e=>({...e,text:e.text.replace(/```[\s\S]*?```|`[^`\n]+`|\$\$[\s\S]*?\$\$|\$[^$\n]+\$|https?:\/\/[^\s)]+/g,'')}));
 const all=prose.map(e=>e.text).join('\n'),characters=[...all].length;
 const frequency=['这','这个','这里','一个','可以','需要','并','同时','所以','因此','把','让','使'].map(phrase=>{const count=all.split(phrase).length-1;return {phrase,count,per10000:Math.round(count*10000/Math.max(1,characters)*10)/10};});
 const lengths=prose.flatMap(e=>e.text.split(/[。！？!?]+/).map(s=>[...s.trim()].length).filter(n=>n>0)),paragraphs=prose.flatMap(e=>e.text.split(/\n\s*\n/).map(s=>[...s.trim()].length).filter(n=>n>0)),sorted=[...paragraphs].sort((a,b)=>a-b);
 const seen=new Map<string,string[]>();for(const e of prose)for(const sentence of e.text.split(/[。！？!?]+/)){const key=sentence.replace(/\s/g,'');if(key.length>=18)seen.set(key,[...seen.get(key)||[],e.location]);}
 const repetitions=[...seen].filter(([,v])=>v.length>1).map(([text,locations])=>({text,locations}));
 const terminology=Array.isArray(d.extensions.terminology)?d.extensions.terminology as {term:string;aliases?:string[]}[]:[];
 const consistency={terminology:terminology.filter(t=>typeof t.term==='string').map(t=>({term:t.term,variants:[t.term,...(t.aliases||[]).filter(a=>typeof a==='string')].map(form=>({form,locations:prose.filter(e=>e.text.includes(form)).map(e=>e.location)}))})),chapterReferences:prose.flatMap(e=>[...e.text.matchAll(/第\s*(\d+)\s*章/g)].map(hit=>({location:e.location,phrase:hit[0],chapter:Number(hit[1]),inRange:Number(hit[1])>=1&&Number(hit[1])<=d.notebook.chapters.length})))};
 const cues=pages.flatMap(p=>p.cues||[]),figures=pages.flatMap(p=>p.blocks).filter(b=>['image','diagram','chart'].includes(b.type)).length;
 return {consistency,basis:'Observable signals for editorial review; zero matches is not editorial approval.',characters,frequency,
 sentences:{count:lengths.length,mean:Math.round(lengths.reduce((a,b)=>a+b,0)/Math.max(1,lengths.length)*10)/10,bins:{upTo15:lengths.filter(n=>n<=15).length,from16To30:lengths.filter(n=>n>15&&n<=30).length,from31To40:lengths.filter(n=>n>30&&n<=40).length,over40:lengths.filter(n=>n>40).length}},
 paragraphs:{count:paragraphs.length,mean:Math.round(paragraphs.reduce((a,b)=>a+b,0)/Math.max(1,paragraphs.length)*10)/10,median:sorted.length?(sorted[Math.floor((sorted.length-1)/2)]+sorted[Math.floor(sorted.length/2)])/2:0},repetitions,
 cues:{total:cues.length,questions:cues.filter(c=>/[？?]\s*$/.test(c.text)).length,unique:new Set(cues.map(c=>c.text.replace(/\s/g,''))).size,pagesWithout:pages.filter(p=>!p.cues?.length).map(p=>p.id)},
 figures:{total:figures,pages:pages.length,pagesPerFigure:figures?Math.round(pages.length/figures*10)/10:null},
 brief:d.notebook.brief?{termPolicy:d.notebook.brief.termPolicy||'',languageStyle:d.notebook.brief.languageStyle||'',scope:d.notebook.brief.scope||'',materialFidelity:d.notebook.brief.materialFidelity||''}:null,
 chapters:d.notebook.chapters.map(c=>({chapterId:c.id,pages:c.pages.length,characters:c.pages.reduce((n,p)=>n+p.blocks.reduce((s,b)=>s+textOf(b).length,0),0)}))};
}
