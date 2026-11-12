import { growthActivity, readingActivity, sequenceActivity } from './learning-activities';
import {userState, type NotebookDocument, type Page} from './model/types';

// The product story is a normal notebook. The film only animates assets exported
// from this reader; headings, blackboards, diagrams and ink share its renderer.
const pages:Page[]=[
 {id:'product-pain',title:'使用 AI 制作图文学习笔记',subject:'general',layout:'reading',blocks:[
  {id:'pain-context',type:'prose',text:'向 AI 提供仓库地址和材料，说明主题、已有基础和学习目标。没有材料时，可按选定主题生成讲解。',study:{label:'制作流程',marks:[{text:'仓库地址和材料',kind:'underline'},{text:'学习目标',kind:'circle'},{text:'学习目标',kind:'bold'},{text:'学习目标',kind:'red',color:'#285f9e'}]}},
  {id:'pain-fragments',type:'code',language:'Text',text:'参考材料：讲义、书页、题目或代码\n学习要求：主题、基础、目标与范围\n内容形式：图解、推导、例题与赏析\n页边说明：定义、示例与图像解读\n批注方式：圈画、箭头、便条与书签\n保存格式：单文件离线 HTML',study:{label:'学习需求与文件格式'}},
  {id:'pain-need',type:'prose',text:'离线 HTML 内含讲解、图像和学习记录，浏览器打开后可阅读、调参计算与批注。',study:{visual:'extract',label:'离线文件',marks:[{text:'讲解、图像和学习记录',kind:'highlight'},{text:'调参计算与批注',kind:'underline'}]}}
 ]},
 {id:'product-idea',title:'Paper Notebook',subject:'general',layout:'reading',blocks:[
  {id:'idea-statement',type:'concept',title:'按主题组织讲解',text:'Paper Notebook 按主题排成纸页，分别呈现定义、公式、图解和例题。读者可选中文字，添加标记和批注。',study:{label:'内容组织',marks:[{text:'按主题排成纸页',kind:'highlight'},{text:'添加标记和批注',kind:'circle'},{text:'添加标记和批注',kind:'bold'},{text:'添加标记和批注',kind:'red',color:'#285f9e'}]}},
  {id:'idea-map',type:'diagram',arrangement:'row',nodes:[{id:'organize',label:'AI 输出讲解'},{id:'read',label:'按主题排版'},{id:'review',label:'圈画与复习'}],edges:[{from:'organize',to:'read'},{from:'read',to:'review'}],study:{visual:'sketch',label:'内容分层，方便阅读与复习'}},
  {id:'idea-value',type:'prose',text:'书签保存选中的原句，点击记录可查看原文。',study:{visual:'extract',marks:[{text:'查看原文',kind:'star'}]}}
 ]},
 {id:'product-structure',title:'调整参数，比较增长',subject:'stem',layout:'cornell',cues:[{id:'structure-cue-1',title:'复利条件',text:'固定增长率、利息计入本金且无额外存取时，每期金额都乘以同一增长因子。',blockId:'structure-condition',anchor:'每期增长率固定'},{id:'structure-cue-2',title:'递推关系',text:'连续两期使用相同增长因子，乘积为 (1+r)²；n 期对应 n 次相乘。',blockId:'structure-formula',anchor:'上一期金额'},{id:'structure-cue-3',title:'累计增长',text:'第二期的 10% 以 110 元为基数，新增 11 元，累计利息为 21 元。',blockId:'structure-example',anchor:'期末 121 元'}],blocks:[
  {id:'structure-condition',type:'prose',text:'复利例子：每期增长率固定，利息计入本金，期间没有额外存取。',study:{label:'模型条件',marks:[{text:'没有额外存取',kind:'underline'}]}},
  {id:'structure-formula',type:'formula',latex:'P_n=P_0(1+r)^n',text:'每期金额 = 上一期金额 × (1 + r)。',study:{visual:'blackboard',label:'递推公式',marks:[{text:'上一期金额',kind:'box'}]}},
  {id:'structure-example',type:'example',prompt:'100 元，每期增长 10%，共两期。',steps:[{id:'structure-e1',text:'100 × 1.1 = 110'},{id:'structure-e2',text:'110 × 1.1 = 121'}],result:'期末 121 元，累计增长 21 元。',study:{label:'数值计算',marks:[{text:'期末 121 元',kind:'check'}]}}
 ]},
 {id:'product-marks',title:'文字标记与书签',subject:'general',layout:'reading',blocks:[
  {id:'marks-select',type:'prose',text:'选中文字可加粗、变色或圈注。书签与疑问在右上角集中查看，点击可返回原文。',study:{label:'文字标记与收录',marks:[{text:'选中文字',kind:'highlight'},{text:'书签与疑问',kind:'circle'},{text:'书签与疑问',kind:'bold'},{text:'书签与疑问',kind:'red',color:'#285f9e'},{text:'返回原文',kind:'star'}]}},
  {id:'marks-examples',type:'prose',text:'条件、推导和关键概念，可以分别框选、划线、加着重点。',study:{label:'按内容选择标记',marks:[{text:'条件',kind:'box'},{text:'推导',kind:'wave'},{text:'关键概念',kind:'dots'},{text:'划线',kind:'check'}]}},
  {id:'marks-map',type:'diagram',arrangement:'row',nodes:[{id:'sentence',label:'选中文字'},{id:'mark',label:'添加文字标记'},{id:'return',label:'保存书签或疑问'}],edges:[{from:'sentence',to:'mark'},{from:'sentence',to:'return'}],study:{visual:'sketch'}},
  {id:'marks-return',type:'quote',text:'双击右栏或底栏空白处添加便条，圆形色块切换底色。',study:{visual:'extract',marks:[{text:'右栏或底栏',kind:'underline'}]}}
 ]},
 {id:'product-subjects',title:'原文批读与过程分步',subject:'general',layout:'reading',blocks:[
  {id:'subjects-poem',type:'quote',text:'国破山河在，城春草木深。',attribution:'文学 · 杜甫《春望》首联',study:{visual:'extract',label:'原文',marks:[{text:'破',kind:'circle'},{text:'破',kind:'bold'},{text:'破',kind:'red',color:'#285f9e'},{text:'深',kind:'dots'}]}},
  {id:'subjects-business',type:'formula',latex:'Q_{BE}=\\frac{3000}{80-50}=100',text:'单价 80 元，单位变动成本 50 元，固定成本 3000 元。',study:{visual:'blackboard',label:'盈亏平衡计算'}},
  {id:'subjects-code',type:'code',language:'Python',text:'ids = ["A", "A", "B"]\ncount = len(set(ids))  # 2',study:{label:'输入与输出',explanations:[{text:'set',note:'同值去重。'},{text:'len',note:'计算集合长度。'}]}}
 ]},
 {id:'product-fit',title:'学习基础、目标与材料',subject:'general',layout:'reading',blocks:[
  {id:'fit-brief',type:'concept',title:'参考材料与学习需求',text:'上传讲义、题库或已有笔记；没有文件也可以开始。随后选择已有基础、学习范围、难度和练习需求。',study:{label:'先材料，后需求',marks:[{text:'已有基础',kind:'underline'},{text:'学习范围',kind:'circle'},{text:'学习范围',kind:'bold'},{text:'学习范围',kind:'red',color:'#285f9e'}]}},
  {id:'fit-source',type:'prose',text:'严格材料模式保留原题、答案和顺序。',study:{visual:'extract',label:'严格遵循材料时',marks:[{text:'原题、答案和顺序',kind:'highlight'}]}},
  {id:'fit-boundary',type:'prose',text:'原文引用附页码或段落位置，来源条目记录资料名称与出处。',study:{label:'来源记录'}},
  {id:'fit-map',type:'diagram',arrangement:'row',nodes:[{id:'brief',label:'提供材料'},{id:'agent',label:'确认学习需求'},{id:'reader',label:'打开笔记阅读'}],edges:[{from:'brief',to:'agent'},{from:'agent',to:'reader'}],study:{visual:'sketch'}}
 ]},
 {id:'product-focus',title:'横竖版阅读与离线保存',subject:'general',layout:'reading',blocks:[
  {id:'focus-read',type:'concept',title:'横竖版与双页阅读',text:'横竖纸张独立切换，双页可左右或上下排列。右栏和底栏可分别开关，夜间模式使用深色纸张。',study:{label:'阅读设置',marks:[{text:'双页',kind:'underline'}]}},
  {id:'focus-table',type:'comparison',columns:['功能','操作'],rows:[['页边批注','双击右栏或底栏空白处'],['图像批注','添加圈注、箭头和文字说明'],['保存文件','下载含学习记录的离线 HTML']],study:{label:'批注与保存'}},
  {id:'focus-offline',type:'quote',text:'下载一份 HTML，离线阅读。批注、作答与交互记录同时保存。',study:{visual:'extract',label:'离线保存',marks:[{text:'离线阅读',kind:'highlight'},{text:'同时保存',kind:'star'}]}}
 ]},
 {id:'product-start',title:'Paper Notebook',subject:'general',layout:'reading',blocks:[
  {id:'start-message',type:'concept',title:'图文阅读、批注与复习',text:'阅读器支持参数计算、原文批读、过程分步、图文批注与离线保存。',study:{label:'图文笔记阅读器',marks:[{text:'参数计算',kind:'highlight'},{text:'图文批注',kind:'circle'},{text:'图文批注',kind:'bold'},{text:'图文批注',kind:'red',color:'#285f9e'}]}},
  {id:'start-actions',type:'steps',items:[{id:'start-a1',text:'在线试读与批注。'},{id:'start-a2',text:'下载离线 HTML。'},{id:'start-a3',text:'复制指令，使用自己的材料生成笔记。'}],study:{label:'试读与制作',marks:[{text:'在线试读',kind:'check'}]}},
  {id:'start-close',type:'prose',text:'修改正文或批注后，重新下载 HTML 可保存当前内容与记录。',study:{visual:'extract',marks:[{text:'当前内容与记录',kind:'star'}]}}
 ]}
];
pages.find(p=>p.id==='product-structure')!.blocks.push({...structuredClone(growthActivity),id:'product-growth-exploration'});
const subjects=pages.find(p=>p.id==='product-subjects')!;subjects.blocks.push({...structuredClone(readingActivity),id:'product-reading-exploration'},{...structuredClone(sequenceActivity),id:'product-sequence-exploration'});
export const productStory:NotebookDocument={schemaVersion:'1.0.0',notebook:{id:'paper-notebook-product-story',revision:8,title:'Paper Notebook 使用说明',author:'Paper Notebook',language:'zh-CN',goals:['了解纸页阅读与圈画如何服务学习','查看公式、原文、代码的笔记表达','按自己的目标与材料生成学习内容'],sources:[{id:'product-source',title:'Paper Notebook 阅读器',locator:'本册展示图文阅读、标记与离线保存功能。'},{id:'product-spring',title:'杜甫《春望》首联',locator:'公共领域原诗；用于文学笔记展示。'},{id:'product-math',title:'数值核验',locator:'100 × 1.1² = 121；3000 ÷ (80 − 50) = 100。'}],chapters:[{id:'product-story',title:'Paper Notebook 产品介绍',pages}]},userState:userState(pages[0].id),assets:[],extensions:{baseRevision:7,readerProfile:{layout:'single',direction:'horizontal',sidebar:'collapsed',pageShape:'auto',transition:'cover',theme:'paper-light',motion:'full'}}};
productStory.userState.preferences.fontSize=26;
productStory.userState.updatedAt='2026-11-12T12:00:00.000Z';

export const productFilm={title:'Paper Notebook — 用 AI 生成学习笔记',duration:64,fps:30,bpm:120,music:'Original score: Paper / Pulse',scenes:[
 {id:'pain',pageId:'product-pain',start:0,end:8,headline:'使用 AI 制作图文学习笔记',purpose:'先提供材料，再确认学习需求，交付可离线阅读的图文笔记',visual:'原生标题与入口说明从首帧出现；材料、讲解和保存要求分三组踩点进入。',sound:'短马林巴开场动机，电钢琴与轻鼓逐层进入，功能列表出现时点入高音木琴'},
 {id:'idea',pageId:'product-idea',start:8,end:16,headline:'图解、推导与例题按主题编排。',purpose:'展示主题组织与纸页阅读',visual:'品牌落在真实纸面；页面展开，三步关系图逐段出现，荧光划过核心句。',sound:'鼓组与低音进入，电钢琴琶音连接主旋律，图示出现时短笛高音回应'},
 {id:'structure',pageId:'product-structure',start:16,end:24,headline:'调整参数，比较增长。',purpose:'用真实参数计算展示单利与复利的变化',visual:'展示当前阅读器的复利计算组件；增长率从 0% 调至 10%，滑块、两条曲线和数值同步更新，最后停留核对结果。',sound:'拨弦切分，黑板出现时短钟琴高音，计算结果配马林巴轻点'},
 {id:'marks',pageId:'product-marks',start:24,end:32,headline:'圈画重点，集中复习。',purpose:'展示圈画、引线旁注和复习回到原文',visual:'荧光、圈注、星标、方框按节拍逐笔出现；镜头从原句移向回顾线索。',sound:'主旋律变奏，荧光配木琴，圈注和星标分别点入钟琴高音，保留铅笔划线声'},
 {id:'subjects',pageId:'product-subjects',start:32,end:40,headline:'原文逐联批读，过程逐步查看。',purpose:'展示文学赏析与代码状态两类原生交互',visual:'真实操作《春望》的首联、颔联，再切到集合去重的初始、重复值与新值状态；原文、解释和状态值随选择更新。',sound:'鼓组增加踩镲，文学短笛、公式钟琴、代码马林巴分别回应'},
 {id:'fit',pageId:'product-fit',start:40,end:48,headline:'按基础、目标和材料生成。',purpose:'先材料后需求，区分参考原文与补充讲解',visual:'目标、基础和材料所在的真实段落展开；关系图连通，圈出严格材料要求。',sound:'减鼓留白，电钢琴单句与短笛交替，生成流程出现时马林巴轻点'},
 {id:'focus',pageId:'product-focus',start:48,end:56,headline:'横竖版阅读与离线保存',purpose:'展示双页布局、页边便条、图像批注与离线保存',visual:'当前阅读器的横竖双页界面交错展开，显示右栏与底栏便条；切换到图像批注工具，随后呈现离线保存说明。',sound:'完整节拍回归，横竖纸页配短笛上行，保存句配钟琴，保留翻页声'},
 {id:'start',pageId:'product-start',start:56,end:64,headline:'AI 生成，纸页阅读，重点复习。',purpose:'品牌记忆与明确行动入口',visual:'笔记页面收拢，品牌与试读入口留在纸上；最后四秒稳定停留，星标画完。',sound:'主旋律收束，末拍三音品牌动机与自然尾音'}
]};
