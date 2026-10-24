import {userState, type NotebookDocument, type Page} from './model/types';

// The product story is a normal notebook. The film only animates assets exported
// from this reader; headings, blackboards, diagrams and ink share its renderer.
const pages:Page[]=[
 {id:'product-pain',title:'把想学的，变成一本图文笔记。',subtitle:'01 / 从你的材料开始',subject:'general',layout:'reading',blocks:[
  {id:'pain-context',type:'prose',text:'把制作指令发给你常用的 AI。先上传材料，或回复没有文件，再选择主题、基础和学习目标。',study:{label:'用你常用的 AI，生成自己的笔记',marks:[{text:'先上传材料',kind:'underline'},{text:'学习目标',kind:'circle'}]}},
  {id:'pain-fragments',type:'code',language:'Markdown',text:'先提供：参考文件，或明确没有文件\n再选择：主题、基础和学习目标\n内容包括：概念、图解、推导和例题\n讲解要求：交代条件，说明每一步\n保存一本：可离线打开的笔记\n带上记录：圈画、疑问和练习答案',study:{label:'告诉 AI 学什么、怎么讲'}},
  {id:'pain-need',type:'quote',text:'AI 整理内容，你按自己的节奏读。',study:{visual:'extract',label:'从讲解到理解',marks:[{text:'整理内容',kind:'highlight'},{text:'自己的节奏',kind:'underline'}]}}
 ]},
 {id:'product-idea',title:'Paper Notebook',subtitle:'02 / 从长篇回答到学习笔记',subject:'general',layout:'reading',blocks:[
  {id:'idea-statement',type:'concept',title:'长篇 AI 回答，读着枯燥，重点难找。',text:'定义、公式和例题挤在一段回答里。Paper Notebook 按主题排成纸页，讲解有层次，重点随手标。',study:{label:'解决长篇讲解的阅读问题',marks:[{text:'按主题排成纸页',kind:'highlight'},{text:'重点随手标',kind:'circle'}]}},
  {id:'idea-map',type:'diagram',arrangement:'row',nodes:[{id:'organize',label:'AI 输出讲解'},{id:'read',label:'按主题排版'},{id:'review',label:'圈画与复习'}],edges:[{from:'organize',to:'read'},{from:'read',to:'review'}],study:{visual:'sketch',label:'内容分层，方便阅读与复习'}},
  {id:'idea-value',type:'quote',text:'重点摘录，点击查看原文。',study:{visual:'extract',marks:[{text:'查看原文',kind:'star'}]}}
 ]},
 {id:'product-structure',title:'读条件，跟推导，用例题验算。',subtitle:'03 / 同一主题，集中阅读',subject:'stem',layout:'cornell',cues:[{id:'structure-cue-1',text:'条件',blockId:'structure-condition'},{id:'structure-cue-2',text:'推导',blockId:'structure-formula'},{id:'structure-cue-3',text:'验算',blockId:'structure-example'}],summary:'条件、推导、验算依次展开；页边线索帮助回忆。',blocks:[
  {id:'structure-condition',type:'prose',text:'复利例子：每期增长率固定，利息计入本金，期间没有额外存取。',study:{label:'01 · 条件写明白',marks:[{text:'没有额外存取',kind:'underline'}]}},
  {id:'structure-formula',type:'formula',latex:'P_n=P_0(1+r)^n',text:'每期金额 = 上一期金额 × (1 + r)。',study:{visual:'blackboard',label:'02 · 敲黑板',marks:[{text:'上一期金额',kind:'box'}]}},
  {id:'structure-example',type:'example',prompt:'100 元，每期增长 10%，共两期。',steps:[{id:'structure-e1',text:'100 × 1.1 = 110'},{id:'structure-e2',text:'110 × 1.1 = 121'}],result:'期末 121 元，累计增长 21 元。',study:{label:'03 · 数值对照',marks:[{text:'期末 121 元',kind:'check'}]}}
 ]},
 {id:'product-marks',title:'圈画重点，集中复习。',subtitle:'04 / 选中文字即可标记',subject:'general',layout:'reading',blocks:[
  {id:'marks-select',type:'prose',text:'选中结论划荧光，关键词用圈注。标记自动收进重点列表，点击即可查看原文。',study:{label:'九种圈画，按需要用',marks:[{text:'结论',kind:'highlight'},{text:'关键词',kind:'circle'},{text:'重点列表',kind:'star'}]}},
  {id:'marks-examples',type:'prose',text:'条件、推导和关键概念，可以分别框选、划线、加着重点。',study:{label:'按内容选择标记',marks:[{text:'条件',kind:'box'},{text:'推导',kind:'wave'},{text:'关键概念',kind:'dots'},{text:'划线',kind:'check'}]}},
  {id:'marks-map',type:'diagram',arrangement:'row',nodes:[{id:'sentence',label:'选中文字'},{id:'mark',label:'圈出重点'},{id:'return',label:'重点列表定位原文'}],edges:[{from:'sentence',to:'mark'},{from:'mark',to:'return'}],study:{visual:'sketch'}},
  {id:'marks-return',type:'quote',text:'重点列表集中复习，旁注解释关键概念。',study:{visual:'extract',explanations:[{text:'旁注',note:'解释与对应文字一起显示。'}],marks:[{text:'集中复习',kind:'bracket'}]}}
 ]},
 {id:'product-subjects',title:'公式、原文和代码分别排版。',subtitle:'05 / 一套阅读方式，多种笔记表达',subject:'general',layout:'reading',blocks:[
  {id:'subjects-poem',type:'quote',text:'国破山河在，城春草木深。',attribution:'文学 · 杜甫《春望》首联',study:{visual:'extract',label:'读原句，理清语境',marks:[{text:'破',kind:'circle'},{text:'深',kind:'dots'}]}},
  {id:'subjects-business',type:'formula',latex:'Q_{BE}=\\frac{3000}{80-50}=100',text:'单价 80 元，单位变动成本 50 元，固定成本 3000 元。',study:{visual:'blackboard',label:'看变量，对照计算'}},
  {id:'subjects-code',type:'code',language:'Python',text:'ids = ["A", "A", "B"]\ncount = len(set(ids))  # 2',study:{label:'顺着代码，看输入与结果',explanations:[{text:'set',note:'同值去重。'},{text:'len',note:'计算集合长度。'}]}}
 ]},
 {id:'product-fit',title:'按基础、目标和材料生成。',subtitle:'06 / 用自己的材料生成笔记',subject:'general',layout:'reading',blocks:[
  {id:'fit-brief',type:'concept',title:'先交材料，再选学习目标。',text:'上传讲义、题库或已有笔记；没有文件也可以开始。随后选择已有基础、学习范围、难度和练习需求。',study:{label:'先材料，后需求',marks:[{text:'已有基础',kind:'underline'},{text:'学习范围',kind:'circle'}]}},
  {id:'fit-source',type:'quote',text:'按讲义学，照题库练。',study:{visual:'extract',label:'严格遵循材料时',marks:[{text:'按讲义学',kind:'highlight'},{text:'照题库练',kind:'box'}]}},
  {id:'fit-boundary',type:'prose',text:'有材料时保留原题和顺序；无材料时，AI 按可用能力检索资料、绘制图解。引用来源与补充解释分清楚。',study:{label:'原文保留，补充解释另列'}},
  {id:'fit-map',type:'diagram',arrangement:'row',nodes:[{id:'brief',label:'提供材料'},{id:'agent',label:'确认学习需求'},{id:'reader',label:'打开笔记阅读'}],edges:[{from:'brief',to:'agent'},{from:'agent',to:'reader'}],study:{visual:'sketch'}}
 ]},
 {id:'product-focus',title:'沉浸阅读，离线保存。',subtitle:'07 / 界面与保存',subject:'general',layout:'reading',blocks:[
  {id:'focus-read',type:'concept',title:'纸页随屏幕调整。',text:'横竖屏自动排版，夜间换成深色纸张。收起工具，以正文为主，给图解与推导留出空间。',study:{label:'界面设计',marks:[{text:'以正文为主',kind:'underline'}]}},
  {id:'focus-table',type:'comparison',columns:['阅读习惯','对应选择'],rows:[['读得舒服','日夜模式与字体选择'],['留一份纸本','导出 A4 横版或竖版 PDF'],['换个地方继续读','保存含学习记录的 HTML']],study:{label:'按习惯阅读'}},
  {id:'focus-offline',type:'quote',text:'下载一份 HTML，离线阅读。圈画和作答同时保存。',study:{visual:'extract',label:'阅读无需账号',marks:[{text:'离线阅读',kind:'highlight'},{text:'同时保存',kind:'star'}]}}
 ]},
 {id:'product-start',title:'Paper Notebook',subtitle:'08 / 打开一本，开始读',subject:'general',layout:'reading',blocks:[
  {id:'start-message',type:'concept',title:'让 AI 生成笔记，按自己的节奏学习。',text:'分主题阅读，圈画重点，按需复习。',study:{label:'AI 教程 · 纸页阅读器',marks:[{text:'分主题阅读',kind:'highlight'},{text:'按需复习',kind:'circle'}]}},
  {id:'start-actions',type:'steps',items:[{id:'start-a1',text:'打开示例，试读与圈画。'},{id:'start-a2',text:'下载笔记，离线继续读。'},{id:'start-a3',text:'复制制作指令，用自己的材料做下一本。'}],study:{label:'现在就能开始',marks:[{text:'打开示例',kind:'check'}]}},
  {id:'start-close',type:'quote',text:'AI 生成，纸页阅读，重点复习。',study:{visual:'extract',marks:[{text:'重点复习',kind:'star'}]}}
 ]}
];
export const productStory:NotebookDocument={schemaVersion:'1.0.0',notebook:{id:'paper-notebook-product-story',revision:3,title:'Paper Notebook · 产品笔记',author:'Paper Notebook',language:'zh-CN',goals:['了解纸页阅读与圈画如何服务学习','查看公式、原文、代码的笔记表达','按自己的目标与材料生成学习内容'],sources:[{id:'product-source',title:'Paper Notebook 阅读器',locator:'本册展示图文阅读、标记与离线保存功能。'},{id:'product-spring',title:'杜甫《春望》首联',locator:'公共领域原诗；用于文学笔记展示。'},{id:'product-math',title:'数值核验',locator:'100 × 1.1² = 121；3000 ÷ (80 − 50) = 100。'}],chapters:[{id:'product-story',title:'Paper Notebook 产品介绍',pages}]},userState:userState(pages[0].id),assets:[],extensions:{baseRevision:2,readerProfile:{layout:'single',direction:'horizontal',sidebar:'collapsed',pageShape:'auto',transition:'cover',theme:'paper-light',motion:'full'}}};
productStory.userState.preferences.fontSize=26;
productStory.userState.updatedAt='2026-10-24T18:00:00.000Z';

export const productFilm={title:'Paper Notebook — 用 AI 生成学习笔记',duration:64,fps:30,bpm:120,music:'Original score: Paper / Pulse',scenes:[
 {id:'pain',pageId:'product-pain',start:0,end:8,headline:'把想学的，变成一本图文笔记。',purpose:'先提供材料，再确认学习需求，交付可离线阅读的图文笔记',visual:'原生标题与入口说明从首帧出现；真实生成指令分三段踩点进入，构建文件和复制导入两种路径明确呈现。',sound:'短马林巴开场动机，电钢琴与轻鼓逐层进入，生成指令出现时点入高音木琴'},
 {id:'idea',pageId:'product-idea',start:8,end:16,headline:'长篇 AI 讲解，整理成学习笔记。',purpose:'呈现长篇回答枯燥难读的痛点与结构化阅读方式',visual:'品牌落在真实纸面；页面展开，三步关系图逐段出现，荧光划过核心句。',sound:'鼓组与低音进入，电钢琴琶音连接主旋律，图示出现时短笛高音回应'},
 {id:'structure',pageId:'product-structure',start:16,end:24,headline:'读条件，跟推导，用例题验算。',purpose:'展示知识组织和页面设计',visual:'康奈尔页边线索与正文分层展开；推进黑板公式，移向数值例子和勾记。',sound:'拨弦切分，黑板出现时短钟琴高音，计算结果配马林巴轻点'},
 {id:'marks',pageId:'product-marks',start:24,end:32,headline:'圈画重点，集中复习。',purpose:'展示圈画、引线旁注和复习回到原文',visual:'荧光、圈注、星标、方框按节拍逐笔出现；镜头从原句移向回顾线索。',sound:'主旋律变奏，荧光配木琴，圈注和星标分别点入钟琴高音，保留铅笔划线声'},
 {id:'subjects',pageId:'product-subjects',start:32,end:40,headline:'公式、原文和代码分别排版。',purpose:'以真实文学、商学和代码内容表现差异',visual:'原句摘录、黑板与代码切成三段纸片，依次推进；完整学科纸页踩点接力。',sound:'鼓组增加踩镲，文学短笛、公式钟琴、代码马林巴分别回应'},
 {id:'fit',pageId:'product-fit',start:40,end:48,headline:'按基础、目标和材料生成。',purpose:'先材料后需求，区分参考原文与补充讲解',visual:'目标、基础和材料所在的真实段落展开；关系图连通，圈出严格材料要求。',sound:'减鼓留白，电钢琴单句与短笛交替，生成流程出现时马林巴轻点'},
 {id:'focus',pageId:'product-focus',start:48,end:56,headline:'沉浸阅读，离线保存。',purpose:'沉浸、横竖适配和离线价值',visual:'横版纸与竖版纸交错展开，推近沉浸阅读；离线句和星标落笔。',sound:'完整节拍回归，横竖纸页配短笛上行，保存句配钟琴，保留翻页声'},
 {id:'start',pageId:'product-start',start:56,end:64,headline:'AI 生成，纸页阅读，重点复习。',purpose:'品牌记忆与明确行动入口',visual:'笔记页面收拢，品牌与试读入口留在纸上；最后四秒稳定停留，星标画完。',sound:'主旋律收束，末拍三音品牌动机与自然尾音'}
]};
