/** Reproducible local comparison with the previous hot paths; not a device-independent claim. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {tsImport} from 'tsx/esm/api';
const {MarkHistory}=await tsImport('../src/reader/mark-history.ts',import.meta.url);
const {tableAlignments}=await tsImport('../src/ui/tables.ts',import.meta.url);
const original=JSON.parse(await readFile('examples/paper-notebook.json','utf8'));
const source=structuredClone(original);source.assets.push({id:'benchmark-image',mime:'image/jpeg',name:'Fixture',data:'data:image/jpeg;base64,'+'A'.repeat(3000000)});
source.userState.annotations=Array.from({length:200},(_,i)=>({id:'mark-'+i,pageId:'intro-capabilities',kind:'underline',color:'#567',width:2,seed:i,selectors:[{blockId:'intro-lead',start:0,end:4,exact:'复利增长',prefix:'',suffix:'条件'}]}));
const measure=fn=>{const samples=[];for(let i=0;i<5;i++){const start=performance.now();fn();samples.push(performance.now()-start);}return Number(samples.sort((a,b)=>a-b)[2].toFixed(3));};
const previousMarkMs=measure(()=>{const d=structuredClone(source),past=[];for(let i=0;i<20;i++){const before=structuredClone(d);d.userState.dismissedStudyMarks=[String(i)];if(JSON.stringify(before.userState)!==JSON.stringify(d.userState))past.push(before);}});
const currentMarkMs=measure(()=>{const d=structuredClone(source),history=new MarkHistory();for(let i=0;i<20;i++)history.change(d.userState,()=>d.userState.dismissedStudyMarks=[String(i)]);});
const table={id:'benchmark-table',type:'comparison',columns:['名称','数量','值','说明'],rows:Array.from({length:60},(_,i)=>['R'+i,String(i),String(i*1.5),'教学数据'])};
const doc=structuredClone(original);doc.notebook.chapters[0].pages[0].blocks.push(...Array.from({length:200},(_,i)=>({id:'benchmark-'+i,type:'prose',text:'说明'})),table);
const previousTableMs=measure(()=>{for(let repeat=0;repeat<10;repeat++)for(let col=0;col<4;col++)for(let row=0;row<61;row++){const b=doc.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id===table.id);const values=b.rows.map(r=>r[col]||'');values.length&&values.every(v=>/^[\s+−–—\d.,%￥$€×÷=()/^:：eE²³⁰¹⁻≤≥]+$/.test(v));}});
const currentTableMs=measure(()=>{for(let repeat=0;repeat<10;repeat++)tableAlignments(table);});
const report={date:new Date().toISOString(),node:process.version,scope:'Median of five local runs. Mark runs include one initial 3 MB document clone for both versions. Table timing isolates column alignment, excluding DOM/layout.',markHistory:{operations:20,previousMs:previousMarkMs,currentMs:currentMarkMs,previousSnapshotBytes:Buffer.byteLength(JSON.stringify(source)),currentSnapshotBytes:Buffer.byteLength(JSON.stringify({annotations:source.userState.annotations,dismissedStudyMarks:source.userState.dismissedStudyMarks}))},tableAlignment:{rows:60,columns:4,blocksBeforeTable:200,renders:10,previousMs:previousTableMs,currentMs:currentTableMs}};
await mkdir('docs/verification',{recursive:true});await writeFile('docs/verification/reader-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
