import { userState, type NotebookDocument, type Page } from './model/types';
function make(id:string,title:string,subtitle:string,pages:Page[],goals:string[]):NotebookDocument{
 return {schemaVersion:'1.0.0',notebook:{id,revision:1,title,subtitle,author:'Paper Notebook',language:'zh-CN',goals,sources:[{id:'source-editorial',title:'本项目编写的教学示例',status:'illustrative'}],chapters:[{id:`${id}-chapter`,title:'从问题到理解',pages}]},userState:userState(pages[0].id),assets:[],extensions:{}};
}
export const conceptExample=make('notebook-observation','数字与证据','从一张订单表，理解统计粒度与集合。',[
 {id:'observation-1',title:'同一张表，为什么会有两个答案？',subtitle:'记录的对象决定统计结果。',layout:'reading',blocks:[
  {id:'obs-opening',type:'prose',text:'一个人，在书店下了三次单。订单表里有三行记录，但背后只有一位读者。问“卖出了几单”和问“有几位顾客”，答案自然不同。'},
  {id:'obs-concept',type:'concept',title:'先给数字一个对象',text:'统计粒度，是每一条记录所代表的对象。先明确对象，再计数。三笔订单，可能来自一位顾客，也可能来自三位顾客。'},
  {id:'obs-table',type:'comparison',title:'三笔订单',columns:['订单','顾客','金额'],rows:[['01','小林','¥ 38'],['02','小林','¥ 62'],['03','小林','¥ 45']]},
  {id:'obs-key',type:'callout',tone:'note',text:'订单数是 3，顾客数是 1。数字没有互相矛盾，它们回答了两个问题。'},
  {id:'obs-question',type:'prose',text:'下次见到“用户增长了 20%”，先问一句：用户指注册用户、活跃用户，还是付费用户？时间范围是什么？比较对象一致吗？'}]},
 {id:'observation-2',title:'从材料到判断',subtitle:'每一步都需要明确的输入和检查。',layout:'cornell',blocks:[
  {id:'obs-path',type:'diagram',title:'从材料到判断',nodes:[{id:'raw',label:'原始材料'},{id:'define',label:'确定对象与范围'},{id:'count',label:'计算与核对'},{id:'judge',label:'解释结果'}],edges:[{from:'raw',to:'define'},{from:'define',to:'count'},{from:'count',to:'judge'}]},
  {id:'obs-steps',type:'steps',items:[{id:'obs-step-1',text:'先写下问题：这次想数订单，还是数人？'},{id:'obs-step-2',text:'确定范围：只看本月、已付款、未退款的订单。'},{id:'obs-step-3',text:'按目标计数，再挑几行原始记录手工核对。'}]},
  {id:'obs-example',type:'example',title:'五笔订单，三位顾客',prompt:'顾客编号依次为 A、A、B、A、C。订单数和顾客数分别是多少？',steps:[{id:'obs-ex-1',text:'每行代表一笔订单，共 5 行。'},{id:'obs-ex-2',text:'按顾客去重，留下 A、B、C。'}],result:'订单数 5，顾客数 3。再增加一笔 A 的订单，订单数变成 6，顾客数仍然是 3。'},
  {id:'obs-boundary',type:'quote',text:'解释数字前，先写清统计口径。',attribution:'统计口径'}]},
 {id:'observation-3',title:'两组人数如何合并？',subtitle:'名单可能重叠，计数需要去重。',layout:'grid',blocks:[
  {id:'obs-overlap',type:'prose',text:'同一个人，可能在上海和杭州都下过单。两座城市的顾客人数直接相加，就会数他两次。合并的是名单，去重之后才是全体人数。'},
  {id:'obs-formula',type:'formula',latex:'|A \\cup B| = |A| + |B| - |A \\cap B|',text:'A 和 B 是两组顾客。交集表示两边都出现过的人；这些人需要减去一次。'},
  {id:'obs-sql',type:'code',language:'sql',text:'SELECT COUNT(*) AS orders,\n       COUNT(DISTINCT customer_id) AS customers\nFROM orders\nWHERE status = \'paid\';'},
  {id:'obs-checks',type:'checklist',title:'解释结果前，问自己',items:[{id:'obs-check-1',text:'我能说清每一行代表什么。'},{id:'obs-check-2',text:'不同分组之间，可能有重复的人。'},{id:'obs-check-3',text:'我核对过时间、对象与范围。'}]}]},
 {id:'observation-4',title:'检验统计口径',subtitle:'三道客观题，含解释与答案。',layout:'exam',blocks:[
  {id:'obs-quiz-1',type:'exercise',questionType:'single',question:'A、A、B、C、A 共五笔订单，涉及多少位顾客？',options:[{id:'obs-q1-a',text:'3 位'},{id:'obs-q1-b',text:'4 位'},{id:'obs-q1-c',text:'5 位'}],solution:['obs-q1-a'],explanation:'去重后的顾客编号为 A、B、C，共 3 位。',points:2},
  {id:'obs-quiz-2',type:'exercise',questionType:'multiple',question:'比较两个统计结果，至少需要核对哪些条件？',options:[{id:'obs-q2-a',text:'计数对象'},{id:'obs-q2-b',text:'时间范围'},{id:'obs-q2-c',text:'筛选条件'},{id:'obs-q2-d',text:'图表的背景颜色'}],solution:['obs-q2-a','obs-q2-b','obs-q2-c'],explanation:'对象、时间和筛选条件会改变结果。背景颜色不会改变统计口径。',points:3},
  {id:'obs-quiz-3',type:'exercise',questionType:'truefalse',question:'两个城市的顾客人数，可以始终直接相加得到总人数。',options:[{id:'obs-q3-t',text:'正确'},{id:'obs-q3-f',text:'错误'}],solution:['obs-q3-f'],explanation:'同一位顾客可能在两个城市都出现，需要在合并后去重。',points:1}]}],['区分订单数与顾客数','识别分组之间的重复','在解释数字前写清统计口径']);
conceptExample.userState.annotations=[{id:'annotation-first',pageId:'observation-1',kind:'underline',selectors:[{blockId:'obs-opening',start:48,end:64,exact:'答案自然不同。',prefix:'问“有几位顾客”，',suffix:''}],color:'#6c7355',width:2,seed:15}];
// Derive the sample selector from the actual text, rather than maintaining a stale offset.
const opening=conceptExample.notebook.chapters[0].pages[0].blocks[0].text!;
const exact='答案自然不同。',start=opening.indexOf(exact);
conceptExample.userState.annotations[0].selectors[0]={blockId:'obs-opening',start,end:start+exact.length,exact,prefix:opening.slice(Math.max(0,start-12),start),suffix:''};
export const formulaExample=make('notebook-growth','复利的递推关系','用一个具体数值，理解指数与复利。',[
 {id:'growth-1',title:'增长如何继续累积？',subtitle:'从逐期计算推导通式。',layout:'grid',blocks:[
  {id:'growth-intro',type:'prose',text:'一个假想账户初始有 100 元，每期增长 10%，不取出利息。第一期后是 110 元，第二期增长的基础变成了 110 元，因此增加 11 元。这里的 10% 只是教学假设，不代表实际收益。'},
  {id:'growth-eq',type:'formula',latex:'P_{n+1}=P_n(1+r), \\qquad P_n=P_0(1+r)^n',text:'P₀ 是初始值，r 是每期增长率，n 是期数。每一期的增长率相同，但增加的绝对数值不同。'},
  {id:'growth-table',type:'comparison',columns:['期数 n','期初数值','期末数值'],rows:[['1','100','110'],['2','110','121'],['3','121','133.1']]},
  {id:'growth-steps',type:'example',prompt:'第三期末有多少？',steps:[{id:'growth-s1',text:'第二期末：100 × 1.1² = 121。'},{id:'growth-s2',text:'第三期末：121 × 1.1 = 133.1。'}],result:'三期一共增加 33.1，而每期固定加 10 只会增加 30。'}]},
 {id:'growth-2',title:'通式的适用条件',subtitle:'增长率、存取与期数都属于模型条件。',layout:'reading',blocks:[
  {id:'growth-bound',type:'callout',text:'这个公式假设每期增长率恒定，增长继续计入本金，期间没有额外存入或取出。条件改变时，需要重新建立模型。'},
  {id:'growth-path',type:'diagram',nodes:[{id:'g0',label:'100'},{id:'g1',label:'110'},{id:'g2',label:'121'},{id:'g3',label:'133.1'}],edges:[{from:'g0',to:'g1',label:'× 1.1'},{from:'g1',to:'g2',label:'× 1.1'},{from:'g2',to:'g3',label:'× 1.1'}]},
  {id:'growth-quiz',type:'exercise',questionType:'single',question:'初始值 200，每期增长 5%，两期后是多少？',options:[{id:'growth-a',text:'210'},{id:'growth-b',text:'220'},{id:'growth-c',text:'220.5'}],solution:['growth-c'],explanation:'200 × 1.05² = 220.5。',points:2}]}],['从递推关系推出指数形式','检查公式的前提条件']);
export const practiceExample=make('notebook-observe-plant','给窗边的植物做一份记录','用具体现象与日期建立观察记录。',[
 {id:'plant-1',title:'建立一次观察记录',subtitle:'十分钟，记录现象、条件和操作。',layout:'cornell',blocks:[
  {id:'plant-intro',type:'prose',text:'“叶子看起来不太好”很难帮助下一次判断。换一种记录方式：叶片的位置、颜色变化、盆土干湿、最近一次浇水日期。先记录看见的东西，随后写可能的解释。'},
  {id:'plant-steps',type:'steps',items:[{id:'plant-s1',text:'拍一张固定角度的照片，记下日期。'},{id:'plant-s2',text:'观察叶片：下垂的是新叶、老叶，还是整株？'},{id:'plant-s3',text:'按该植物适合的方法检查盆土干湿，不只看表面颜色。'},{id:'plant-s4',text:'写下今天采取的操作，过几天在同一角度比较。'}]},
  {id:'plant-warn',type:'callout',tone:'warning',text:'不同植物需要不同的水分和光照。这套记录方法不提供通用浇水处方；养护操作需核对植物种类及条件。'},
  {id:'plant-log',type:'comparison',columns:['日期','观察到的现象','采取的操作'],rows:[['今天','下部两片叶子变黄','记录照片，核对养护条件'],['三天后','由你补充','由你补充']]}]},
 {id:'plant-2',title:'观察与原因解释',subtitle:'证据决定解释能走到哪一步。',layout:'reading',blocks:[
  {id:'plant-concept',type:'concept',title:'观察 ≠ 原因',text:'“两片老叶变黄”是观察。“缺水导致变黄”是原因判断，还需要植物种类、浇水和根系状态等证据。'},
  {id:'plant-match',type:'exercise',questionType:'matching',question:'每条记录属于哪种类别？',pairs:[{id:'plant-p1',left:'照片里有两片黄叶',right:'观察'},{id:'plant-p2',left:'可能是光照不足',right:'待核实的解释'},{id:'plant-p3',left:'明天核对养护资料',right:'后续行动'}],explanation:'分别记录观察现象、待核实原因和后续行动，复查时更容易判断。',points:3},
  {id:'plant-reflect',type:'exercise',questionType:'subjective',question:'为你身边的一盆植物写一条记录。',explanation:'参考要点：包含日期、具体观察、已知条件；将原因判断写成待核实的假设。',points:0}]}],['用可比较的方式记录观察','区分观察与原因解释']);
export const examples=[conceptExample,formulaExample,practiceExample];

conceptExample.notebook.chapters[0].pages[1].cues=[{id:'cue-grain',text:'一行代表什么？',blockId:'obs-steps'},{id:'cue-range',text:'范围如何限定？',blockId:'obs-path'},{id:'cue-count',text:'订单数与人数',blockId:'obs-example'}];
conceptExample.notebook.chapters[0].pages[1].summary='回看时先回答两个问题：每行记录代表什么？哪些记录属于统计范围？口径确定之后，计算与解释才有共同的依据。';
practiceExample.notebook.chapters[0].pages[0].cues=[{id:'cue-observe',text:'看见了什么？',blockId:'plant-intro'},{id:'cue-condition',text:'已知条件',blockId:'plant-steps'},{id:'cue-log',text:'日期与操作',blockId:'plant-log'}];
practiceExample.notebook.chapters[0].pages[0].summary='一条可复查的记录包含日期、具体观察、已知条件和采取的操作。原因推测单独记录，并列出需要补充的证据。';
conceptExample.notebook.sources.push({id:'postgres-count',title:'PostgreSQL · Aggregate Functions',url:'https://www.postgresql.org/docs/current/functions-aggregate.html'});
conceptExample.notebook.chapters[0].pages[2].blocks.find(b=>b.id==='obs-sql')!.sourceRefs=[{sourceId:'postgres-count',locator:'count(*) 与 count(DISTINCT expression)'}];
for(const d of examples)d.extensions.readerProfile={layout:'auto',direction:'horizontal',sidebar:'open',pageShape:'auto',transition:'turn',theme:'paper-light',motion:'full'};
