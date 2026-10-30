import {introNotebook} from './intro';
import {userState, type NotebookDocument} from './model/types';

// Subject previews share the authored lesson blocks and the production reader.
function lesson(name:string,title:string,pageIds:string[],goals:string[]):[string,NotebookDocument]{
 const doc=structuredClone(introNotebook);
 const pages=pageIds.map(id=>doc.notebook.chapters.flatMap(c=>c.pages).find(p=>p.id===id)!);
 doc.notebook={...doc.notebook,id:`showcase-${name}`,revision:1,title,goals,chapters:[{id:`${name}-chapter`,title,pages}]};
 doc.userState=userState(pages[0].id);doc.userState.updatedAt='2026-10-30T00:00:00.000Z';
 doc.extensions={readerProfile:{...introNotebook.extensions.readerProfile as object}};
 const usedAssets=new Set(pages.flatMap(p=>p.blocks).flatMap(b=>b.assetId?[b.assetId]:[]));
 doc.assets=doc.assets.filter(a=>usedAssets.has(a.id));
 return [name,doc];
}

const compound=lesson('compound-interest','复利 · 递推与增长',
 ['intro-capabilities','intro-principles','intro-features','intro-start'],introNotebook.notebook.goals);
compound[1].notebook.sources=compound[1].notebook.sources.filter(s=>s.id!=='source-spring');
const area=compound[1].notebook.chapters[0].pages[0].blocks.find(b=>b.id==='intro-area')!;
area.figure={...area.figure,annotations:[{kind:'circle',x:77,y:78,x2:86,y2:87,color:'#b1483d'},{kind:'arrow',x:94,y:72,x2:85,y2:82,color:'#b1483d'}]};
const recurrence=compound[1].notebook.chapters[0].pages[1].blocks.find(b=>b.id==='intro-native')!;
recurrence.study={...recurrence.study,marks:[...recurrence.study?.marks||[],{text:'本期的值 × (1 + r)',kind:'bold'},{text:'本期的值 × (1 + r)',kind:'red',color:'#285f9e'}]};

const literature=lesson('literature','《春望》 · 景物与语境',['subject-literature'],['结合原句解释景物与语境','区分引用与阅读判断']);
literature[1].notebook.sources=literature[1].notebook.sources.filter(s=>s.id==='source-spring');
const literatureMap=literature[1].notebook.chapters[0].pages[0].blocks.find(b=>b.id==='literature-map')!;
delete literatureMap.arrangement;
literatureMap.figure={...literatureMap.figure,annotations:[{kind:'circle',x:17,y:78,x2:83,y2:96,color:'#b1483d'}]};

const business=lesson('business','盈亏平衡 · 成本与销量',['subject-business'],['计算单位贡献与盈亏平衡销量','比较给定销量下的收入与成本']);
business[1].notebook.sources=[{id:'business-model',title:'盈亏平衡模型与教学核算',locator:'利润 = Q(p−v)−F；F=3000 元、p=80 元/件、v=50 元/件，盈亏平衡销量 100 件。'}];
const businessPage=business[1].notebook.chapters[0].pages[0];
const conditions=businessPage.blocks[0];
conditions.study={...conditions.study,marks:[...conditions.study?.marks||[],{text:'固定成本 3000 元',kind:'bold'},{text:'固定成本 3000 元',kind:'red',color:'#285f9e'}]};
businessPage.blocks.splice(2,0,{id:'business-breakeven-chart',type:'chart',title:'收入与总成本',chartType:'line',xLabel:'销量 / 件',yLabel:'金额 / 元',
 series:[{id:'business-revenue',label:'收入 80Q',points:[{x:0,y:0},{x:80,y:6400},{x:100,y:8000},{x:120,y:9600}]},{id:'business-cost',label:'总成本 3000+50Q',points:[{x:0,y:3000},{x:80,y:7000},{x:100,y:8000},{x:120,y:9000}]}],
 caption:'教学模型；两条线在销量 100 件、金额 8000 元处相交，此时利润为 0。',
 figure:{size:'wide',ratio:'auto',style:'sketch',annotations:[{kind:'circle',x:74,y:21,x2:83,y2:31,color:'#b1483d'},{kind:'text',x:34,y:17,text:'交点：收支相等',color:'#b1483d'},{kind:'arrow',x:63,y:19,x2:77,y2:25,color:'#b1483d'}]}});

const programming=lesson('programming','Python · 集合与去重',['subject-code'],['比较记录条数与不同编号数','理解 set 与 len 的作用']);
programming[1].notebook.sources=[{id:'python-sets',title:'Python 文档 · 集合',url:'https://docs.python.org/zh-cn/3/tutorial/datastructures.html#sets'}];
const codeMap=programming[1].notebook.chapters[0].pages[0].blocks.find(b=>b.id==='code-map')!;
delete codeMap.arrangement;
codeMap.figure={...codeMap.figure,annotations:[{kind:'circle',x:32,y:80,x2:68,y2:94,color:'#285f9e'}]};

export const showcaseNotebooks=[compound,literature,business,programming];
