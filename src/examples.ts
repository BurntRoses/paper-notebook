import {customerOverlap,plantObservation} from './lesson-figures';
import { userState, type NotebookDocument, type Page, type StudyPresentation } from './model/types';
function make(id:string,title:string,pages:Page[],goals:string[]):NotebookDocument{
 return {schemaVersion:'1.0.0',notebook:{id,revision:1,title,author:'Paper Notebook',language:'zh-CN',goals,sources:[{id:'source-editorial',title:'本项目编写的教学示例',status:'illustrative'}],chapters:[{id:`${id}-chapter`,title,pages}]},userState:userState(pages[0].id),assets:[],extensions:{}};
}
export const conceptExample=make('notebook-observation','订单、顾客与统计口径',[
 {id:'observation-1',title:'订单数与顾客数',layout:'reading',blocks:[
  {id:'obs-opening',type:'prose',text:'书店的订单表记录每笔交易的订单号、顾客编号和金额。顾客编号连接同一人的多笔购买。同一位顾客可产生多笔订单，因此订单数与顾客数分别反映交易次数和购买人数。'},
  {id:'obs-concept',type:'concept',title:'统计粒度',text:'统计粒度是每条记录代表的对象，也是表格组织数据的基本单位。订单表以一笔交易为单位，同一顾客可占多行；顾客表以一位顾客为单位，同一编号占一行。从订单数转为顾客数，需要先按顾客编号去重。'},
  {id:'obs-table',type:'comparison',title:'三笔订单',columns:['订单','顾客','金额'],rows:[['01','小林','¥ 38'],['02','小林','¥ 62'],['03','小林','¥ 45']]},
  {id:'obs-customer-map',type:'diagram',title:'三笔订单指向同一顾客',nodes:[{id:'obs-order-01',label:'订单 01：38 元'},{id:'obs-order-02',label:'订单 02：62 元'},{id:'obs-order-03',label:'订单 03：45 元'},{id:'obs-customer-lin',label:'顾客：小林'}],edges:[{from:'obs-order-01',to:'obs-customer-lin'},{from:'obs-order-02',to:'obs-customer-lin'},{from:'obs-order-03',to:'obs-customer-lin'}],figure:{size:'wide',ratio:'auto',annotations:[{kind:'circle',x:39,y:67,x2:63,y2:94,color:'#285f9e'},{kind:'text',x:67,y:77,text:'按编号去重',color:'#285f9e'}]},caption:'三条交易记录共享一个顾客编号：交易计三次，顾客计一次。'},
  {id:'obs-key',type:'callout',tone:'note',text:'订单数是 3，顾客数是 1，总金额为145元。每单平均金额为145÷3≈48.33元；每位顾客累计购买145元。分母决定指标含义。'},
  {id:'obs-question',type:'prose',text:'月度活跃顾客可定义为当月至少有一笔已付款且未退款订单的顾客。本月120人、上月100人时，增长率为(120−100)÷100=20%。相同的时间跨度与筛选条件，使两个数值具有可比性。'}]},
 {id:'observation-2',title:'统计范围与筛选',layout:'cornell',blocks:[
  {id:'obs-path',type:'diagram',title:'同一批筛选记录的两种计数',nodes:[{id:'raw',label:'订单表'},{id:'define',label:'指定月份、已付款、未退款'},{id:'count',label:'按订单行计数'},{id:'judge',label:'顾客编号去重后计数'}],edges:[{from:'raw',to:'define',label:'先筛选'},{from:'define',to:'count',label:'交易次数'},{from:'define',to:'judge',label:'购买人数'}],figure:{size:'wide',ratio:'auto'}},
  {id:'obs-steps',type:'steps',items:[{id:'obs-step-1',text:'确定指标：本次统计已付款订单及对应的顾客人数。'},{id:'obs-step-2',text:'确定范围：只看本月、已付款、未退款的订单。'},{id:'obs-step-3',text:'按目标计数，再挑几行原始记录手工核对。'}]},
  {id:'obs-example',type:'example',title:'五笔订单，三位顾客',prompt:'顾客编号依次为 A、A、B、A、C。订单数和顾客数分别是多少？',steps:[{id:'obs-ex-1',text:'每行代表一笔订单，共 5 行。'},{id:'obs-ex-2',text:'按顾客去重，留下 A、B、C。'}],result:'订单数 5，顾客数 3。再增加一笔 A 的订单，订单数变成 6，顾客数仍然是 3。'},
  {id:'obs-boundary',type:'callout',title:'新增订单与新增顾客',text:'原有顾客再下单，交易数增加而去重人数保持不变；新顾客首次下单，两项指标同时增加。订单增长可结合顾客增长和购买频次进一步分解。',study:{marks:[{text:'购买频次',kind:'bold'},{text:'交易数增加而去重人数保持不变',kind:'red',color:'#285f9e'}]}}]},
 {id:'observation-3',title:'名单合并与去重',layout:'grid',blocks:[
  {id:'obs-overlap',type:'prose',text:'上海的顾客编号为 A、B、C、D，杭州为 C、D、E。两地分别有 4 人和 3 人，C、D 在两地都出现。合并的是名单，去重之后才是全体人数，本例共 5 人。'},
  {id:'obs-union-figure',type:'image',assetId:'customer-overlap',alt:'上海四位顾客A、B、C、D，杭州三位C、D、E，两位重复；合并去重后五人。',caption:'交集 C、D 在两份名单中各出现一次。相加后减去一次交集人数，得到 4+3−2=5。',figure:{size:'wide',ratio:'auto'}},
  {id:'obs-formula',type:'formula',latex:'|A \\cup B| = |A| + |B| - |A \\cap B|',text:'A 和 B 是两组顾客。交集表示两边都出现过的人；这些人需要减去一次。'},
  {"id":"obs-sql","type":"code","title":"统计十月已付款且未退款的订单","language":"sql","text":"SELECT COUNT(*) AS orders,\n       COUNT(DISTINCT customer_id) AS customers\nFROM orders\nWHERE paid_at >= '2026-10-01'\n  AND paid_at <  '2026-11-01'\n  AND status = 'paid'\n  AND refunded_at IS NULL;","study":{"explanations":[{"text":"COUNT(*)","note":"对筛选后的每行计数，得到订单数。"},{"text":"COUNT(DISTINCT customer_id)","note":"顾客编号去重后计数；NULL 不参与这一计数。"},{"text":"refunded_at IS NULL","note":"退款时间为空，表示该记录没有退款事件。"}]}},
  {id:'obs-sql-fields',type:'callout',title:'时间区间与缺失编号',text:'本例 orders 表包含付款时间 paid_at、付款状态 status、退款时间 refunded_at 和顾客编号 customer_id。时间条件包含十月一日零点，排除十一月一日零点；付款时间按同一业务时区解释。顾客编号为空的订单仍计入订单数，人数统计前应核查这些缺失记录。'},
  {id:'obs-checks',type:'checklist',title:'本次统计口径',items:[{id:'obs-check-1',text:'每行代表一笔已付款订单。'},{id:'obs-check-2',text:'跨城市顾客按统一编号合并去重。'},{id:'obs-check-3',text:'月度范围与退款筛选条件保持一致。'}]}]},
 {id:'observation-4',title:'检验统计口径',layout:'exam',blocks:[
  {id:'obs-quiz-1',type:'exercise',questionType:'single',question:'A、A、B、C、A 共五笔订单，涉及多少位顾客？',options:[{id:'obs-q1-a',text:'3 位'},{id:'obs-q1-b',text:'4 位'},{id:'obs-q1-c',text:'5 位'}],solution:['obs-q1-a'],explanation:'去重后的顾客编号为 A、B、C，共 3 位。',points:2},
  {id:'obs-quiz-2',type:'exercise',questionType:'multiple',question:'比较两个月的活跃顾客人数，需要保持哪些统计约定一致？',options:[{id:'obs-q2-a',text:'计数对象'},{id:'obs-q2-b',text:'时间范围'},{id:'obs-q2-c',text:'筛选条件'},{id:'obs-q2-d',text:'两个月的订单总数必须相同'}],solution:['obs-q2-a','obs-q2-b','obs-q2-c'],explanation:'计数对象、时间区间的定义和筛选条件须一致。两个月的订单总数可以变化，它本身就是待观察的结果。',points:3},
  {id:'obs-quiz-3',type:'exercise',questionType:'truefalse',question:'两地没有共同顾客时，总人数等于两地人数之和。',options:[{id:'obs-q3-t',text:'正确'},{id:'obs-q3-f',text:'错误'}],solution:['obs-q3-t'],explanation:'交集为空时，集合并集公式中的交集人数为 0，因此两地人数可以直接相加。',points:1}]}],['区分订单数与顾客数','识别分组之间的重复','在解释数字前写清统计口径']);
conceptExample.userState.annotations=[{id:'annotation-first',pageId:'observation-1',kind:'underline',selectors:[{blockId:'obs-opening',start:0,end:2,exact:'订单',prefix:'',suffix:''}],color:'#6c7355',width:2,seed:15}];
// Derive the sample selector from the actual text, rather than maintaining a stale offset.
const opening=conceptExample.notebook.chapters[0].pages[0].blocks[0].text!;
const exact='顾客编号连接同一人的多笔购买。',start=opening.indexOf(exact);
conceptExample.userState.annotations[0].selectors[0]={blockId:'obs-opening',start,end:start+exact.length,exact,prefix:opening.slice(Math.max(0,start-12),start),suffix:''};
export const formulaExample=make('notebook-growth','复利的递推关系',[
 {id:'growth-1',title:'复利的逐期累积',layout:'grid',blocks:[
  {id:'growth-intro',type:'prose',text:'账户初始有 100 元，每期增长 10%，不取出利息。第一期后是 110 元，第二期增长的基础变成了 110 元，因此增加 11 元。第三期再以121元为基础，增加12.1元；增长率相同，增长金额随基数扩大。'},
  {id:'growth-eq',type:'formula',latex:'P_{n+1}=P_n(1+r), \\qquad P_n=P_0(1+r)^n',text:'P₀ 是初始值，r 是每期增长率，n 是期数。每一期的增长率相同，但增加的绝对数值不同。'},
  {id:'growth-table',type:'comparison',columns:['期数 n','期初数值','期末数值'],rows:[['1','100','110'],['2','110','121'],['3','121','133.1']]},
  {id:'growth-chart',type:'chart',title:'每期利率相同，增加额逐期扩大',chartType:'line',xLabel:'期数',yLabel:'期末金额 / 元',series:[{id:'growth-balance',label:'复利余额',points:[{x:0,y:100},{x:1,y:110},{x:2,y:121},{x:3,y:133.1}]}],caption:'相邻两期分别增加 10、11、12.1 元，变化来自逐期扩大的计息基数。',figure:{size:'wide',ratio:'3:2'}},
  {id:'growth-steps',type:'example',prompt:'第三期末有多少？',steps:[{id:'growth-s1',text:'第二期末：100 × 1.1² = 121。'},{id:'growth-s2',text:'第三期末：121 × 1.1 = 133.1。'}],result:'三期一共增加 33.1 元，等于期末金额 133.1 元减去初始本金 100 元。'}]},
 {id:'growth-2',title:'不同增长率的逐期计算',layout:'reading',blocks:[
  {id:'growth-bound',type:'callout',text:'公式按每期增长率恒定、增长继续计入本金、期间没有额外存入或取出计算。若三期增长率分别为10%、5%、8%，终值按各期因子相乘：100 × 1.10 × 1.05 × 1.08 = 124.74。'},
  {id:'growth-path',type:'diagram',title:'三期增长率各异',nodes:[{id:'g0',label:'100'},{id:'g1',label:'110'},{id:'g2',label:'115.5'},{id:'g3',label:'124.74'}],edges:[{from:'g0',to:'g1',label:'× 1.10'},{from:'g1',to:'g2',label:'× 1.05'},{from:'g2',to:'g3',label:'× 1.08'}],figure:{size:'wide',ratio:'auto',style:'sketch',annotations:[{kind:'circle',x:43,y:37,x2:63,y2:61,color:'#285f9e'},{kind:'text',x:43,y:19,text:'每期基数更新',color:'#b1483d'}]}},
  {id:'growth-quiz',type:'exercise',questionType:'single',question:'初始值 200，每期增长 5%，两期后是多少？',options:[{id:'growth-a',text:'210'},{id:'growth-b',text:'220'},{id:'growth-c',text:'220.5'}],solution:['growth-c'],explanation:'200 × 1.05² = 220.5。',points:2}]}],['从递推关系推出指数形式','检查公式的前提条件']);
export const practiceExample=make('notebook-observe-plant','植物观察记录',[
 {id:'plant-1',title:'建立一次观察记录',layout:'cornell',blocks:[
  {id:'plant-intro',type:'prose',text:'一次植物观察记录包括叶片的位置、颜色变化、盆土干湿、最近一次浇水日期。用相同角度的照片和具体日期连续记录，可以对照变化的方向与速度。逐次记录同一叶片的位置与颜色，再结合环境与养护信息分析原因。'},
  {id:'plant-figure',type:'image',assetId:'plant-observation',alt:'固定角度的盆栽观察示意，圈出下部两片黄色叶片，标注叶片位置、颜色、浇水日期和盆土干湿记录。',caption:'先定位同一批叶片，再记录各次观察的颜色、数量和养护操作。圈注用于保持观察位置一致。',figure:{size:'wide',ratio:'auto',annotations:[{kind:'text',x:6,y:14,text:'连续观察同一位置',color:'#b1483d'}]}},
  {id:'plant-steps',type:'steps',items:[{id:'plant-s1',text:'拍一张固定角度的照片，记下日期。'},{id:'plant-s2',text:'标明叶片位置，记录颜色、数量以及是否下垂。'},{id:'plant-s3',text:'按该植物适合的方法检查盆土干湿，不只看表面颜色。'},{id:'plant-s4',text:'写下今天采取的操作，过几天在同一角度比较。'}]},
  {id:'plant-warn',type:'callout',tone:'warning',text:'植物种类及条件影响水分需求：叶片、根系和盆土共同影响吸水与失水。记录时加入植物名称、盆器排水和最近的浇水情况，再结合该种植物的养护资料分析变化。'},
  {id:'plant-log',type:'comparison',columns:['日期','观察到的现象','采取的操作'],rows:[['今天','下部两片叶子变黄','记录照片，核对养护条件'],['三天后','由你补充','由你补充']]}]},
 {id:'plant-2',title:'观察与原因解释',layout:'reading',blocks:[
  {id:'plant-concept',type:'concept',title:'叶片变化与原因判断',text:'“两片老叶变黄”记录可见变化。原因判断还需要植物种类、浇水和根系状态等证据：叶片位置反映变化范围，浇水记录提供时间线，根系与盆土状态帮助判断吸水条件。每项记录都应对应一项可以复查的现象。'},
  {id:'plant-match',type:'exercise',questionType:'matching',question:'每条记录属于哪种类别？',pairs:[{id:'plant-p1',left:'照片里有两片黄叶',right:'观察'},{id:'plant-p2',left:'可能是光照不足',right:'待核实的解释'},{id:'plant-p3',left:'明天核对养护资料',right:'后续行动'}],explanation:'分别记录观察现象、待核实原因和后续行动，复查时更容易判断。',points:3},
  {id:'plant-reflect',type:'exercise',questionType:'subjective',question:'为你身边的一盆植物写一条记录。',explanation:'参考要点：包含日期、具体观察、已知条件；将原因判断写成待核实的假设。',points:0}]}],['用可比较的方式记录观察','区分观察与原因解释']);
export const examples=[conceptExample,formulaExample,practiceExample];

conceptExample.notebook.chapters[0].pages[0].cues=[{"id": "obs-denominator-note", "title": "分母与指标", "text": "同一笔 145 元销售额，除以订单数得到每单金额，除以人数得到每位顾客的购买额。分母改变，指标回答的问题也随之改变。", "blockId": "obs-key", "anchor": "分母决定指标含义"}];
conceptExample.notebook.chapters[0].pages[1].cues=[{"id": "cue-grain", "title": "购买频次", "text": "订单数除以去重人数，得到每位顾客的平均订单数。五笔订单、三位顾客，对应约 1.67 笔/人。", "blockId": "obs-example", "anchor": "订单数 5，顾客数 3"}, {"id": "cue-range", "title": "筛选顺序", "text": "先筛选本月已付款、未退款的记录，再对其中的顾客编号去重，才能得到这组条件下的人数。", "blockId": "obs-steps", "anchor": "只看本月、已付款、未退款的订单"}];
conceptExample.notebook.chapters[0].pages[2].cues=[{"id": "obs-union-note", "title": "重复计数", "text": "同时在两座城市购买的顾客，在两份名单中各出现一次；相加后减去交集人数，就能使每人只计一次。", "blockId": "obs-formula", "anchor": "交集"}];
practiceExample.notebook.chapters[0].pages[0].cues=[{"id": "cue-observe", "title": "连续记录", "text": "同一角度保留可比较的位置与尺度，具体日期提供时间间隔，便于判断叶片变化的速度。", "blockId": "plant-intro", "anchor": "相同角度的照片和具体日期"}, {"id": "cue-condition", "title": "吸水与失水", "text": "叶片蒸腾、根系吸收与盆土含水共同影响植株水分状态。结合这些记录，才能解释同样的叶片下垂。", "blockId": "plant-warn", "anchor": "吸水与失水"}];
conceptExample.notebook.sources.push({id:'postgres-count',title:'PostgreSQL · Aggregate Functions',url:'https://www.postgresql.org/docs/current/functions-aggregate.html'});
conceptExample.notebook.chapters[0].pages[2].blocks.find(b=>b.id==='obs-sql')!.sourceRefs=[{sourceId:'postgres-count',locator:'count(*) 与 count(DISTINCT expression)'}];
for(const d of examples)d.extensions.readerProfile={layout:'auto',direction:'horizontal',sidebar:'collapsed',pageShape:'auto',transition:'cover',theme:'paper-light',motion:'full'};

const emphasis:Record<string,StudyPresentation['marks']>={
 'obs-concept':[{text:'统计粒度',kind:'circle'},{text:'统计粒度',kind:'bold'},{text:'统计粒度',kind:'red',color:'#285f9e'},{text:'每条记录代表的对象',kind:'underline'}],
 'obs-key':[{text:'分母决定指标含义',kind:'bold'},{text:'分母决定指标含义',kind:'red',color:'#285f9e'}],
 'obs-steps':[{text:'本月、已付款、未退款',kind:'bold'},{text:'本月、已付款、未退款',kind:'red',color:'#b1483d'}],
 'obs-overlap':[{text:'合并的是名单，去重之后才是全体人数',kind:'bold'},{text:'合并的是名单，去重之后才是全体人数',kind:'red',color:'#285f9e'}],
 'obs-formula':[{text:'减去一次',kind:'dots'},{text:'交集',kind:'bold'},{text:'交集',kind:'red',color:'#285f9e'}],
 'growth-intro':[{text:'增长的基础',kind:'circle'},{text:'增长的基础',kind:'bold'},{text:'增长的基础',kind:'red',color:'#285f9e'}],
 'growth-eq':[{text:'每一期的增长率相同',kind:'dots'}],
 'growth-steps':[{text:'三期一共增加 33.1',kind:'check'}],
 'growth-bound':[{text:'期间没有额外存入或取出',kind:'underline'},{text:'各期因子相乘',kind:'bold'},{text:'各期因子相乘',kind:'red',color:'#285f9e'}],
 'plant-intro':[{text:'同一叶片的位置与颜色',kind:'underline'},{text:'盆土干湿',kind:'bold'},{text:'最近一次浇水日期',kind:'red',color:'#285f9e'}],
 'plant-warn':[{text:'植物种类及条件',kind:'dots'}],
 'plant-concept':[{text:'原因判断',kind:'circle'},{text:'原因判断',kind:'bold'},{text:'原因判断',kind:'red',color:'#285f9e'},{text:'还需要植物种类、浇水和根系状态等证据',kind:'underline'}],
};
for(const document of examples){
 for(const chapter of document.notebook.chapters)for(const page of chapter.pages)for(const block of page.blocks){
  if(emphasis[block.id])block.study={...block.study,marks:emphasis[block.id]};
 }
 document.notebook.revision=7;document.extensions.baseRevision=6;
}

for(const example of examples)example.userState.updatedAt='2026-11-11T12:00:00.000Z';

conceptExample.notebook.revision=9;conceptExample.extensions.baseRevision=8;

conceptExample.assets.push({id:'customer-overlap',name:'两地顾客名单.svg',mime:'image/svg+xml',data:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(customerOverlap),width:860,height:390,source:'本例给定的两地顾客名单',license:'MIT',verified:true});
practiceExample.assets.push({id:'plant-observation',name:'植物观察位置.svg',mime:'image/svg+xml',data:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(plantObservation),width:850,height:430,source:'Paper Notebook 原创观察记录示意',license:'MIT',verified:true});
