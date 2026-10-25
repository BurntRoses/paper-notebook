import {userState,type NotebookDocument,type Page,type Block} from './model/types';
const prose=(id:string,text:string):Block=>({id,type:'prose',text});
const concept=(id:string,title:string,text:string):Block=>({id,type:'concept',title,text,study:{role:'definition'}});
const formula=(id:string,latex:string,text:string,parameters:Block['parameters']):Block=>({id,type:'formula',latex,text,parameters,keepTogether:true,study:{role:'derivation',visual:'blackboard'}});
const page=(id:string,title:string,blocks:Block[],summary:string,cues:{text:string;blockId:string}[],layout:'cornell'|'reading'='cornell'):Page=>({id,title,layout,subject:'stem',blocks,summary,cues:cues.map((c,i)=>({id:id+'-cue-'+i,...c}))});
const p1=page('ml-task','学习任务：从样本到预测',[
 prose('ml-opening','本册以线性回归串起样本、模型、损失、训练与评估。读完应能手算一次更新，并说明训练分数的边界。需熟悉一次函数、平均数与平方，导数在用到时解释。图中数值均为自拟教学数据。'),
 {id:'ml-process',type:'diagram',arrangement:'row',title:'训练与使用是两个阶段',nodes:[{id:'ml-data-node',label:'样本 + 学习目标'},{id:'ml-fit-node',label:'训练：选择参数'},{id:'ml-predict-node',label:'新输入 → 预测'}],edges:[{from:'ml-data-node',to:'ml-fit-node',label:'拟合'},{from:'ml-fit-node',to:'ml-predict-node',label:'固定参数'}],caption:'训练利用已知结果；实际预测时，新样本的真实结果往往尚未获得。',study:{frame:'tape'}},
 concept('ml-learning','什么叫“从数据中学习”','给定一组输入及其已知结果，学习算法根据一个明确的目标选择模型参数。训练完成后，模型接收新的输入，输出预测。训练数据中出现的关系能否延伸到新样本，需要独立检验；训练过程本身不会保证这一点。'),
], '学习算法按目标选择参数；预测能力需要用未参与选择的数据检验。',[{text:'训练在选择什么？',blockId:'ml-learning'}]);
const p2=page('ml-vocabulary','样本、特征与标签',[
 concept('ml-observation','一行记录对应一个样本','样本是一次观测。特征 x 是预测时可获得的输入；标签 y 是监督学习中的已知目标。多个特征可组成向量。标签的定义、单位和采集时点必须稳定，否则同一个数值可能代表不同含义。'),
 {id:'ml-table',type:'comparison',title:'贯穿后文的教学数据',columns:['样本','输入 x','标签 y'],rows:[['A','1','2'],['B','2','4'],['C','3','5']],align:['center','center','center'],study:{frame:'pencil',role:'evidence'}},
 prose('ml-feature-boundary','这里的 x、y 是没有物理单位的教学标量，用于说明计算。真实任务要补齐样本的来源、时间与单位。例如预测明天用电量时，只能使用明天预测时点之前可获得的信息；提前放入明天的真实耗电量会造成信息泄漏。'),
 {id:'ml-data-definition',type:'callout',title:'先定义目标，再整理数据',text:'“标签是什么”属于任务定义；“模型输出什么”属于模型设计；“误差怎样计分”属于损失设计。这三个问题彼此相连，但不能混为一谈。',study:{aside:'后面会逐项对应。'}},
], '特征在预测时可获得，标签定义预测目标；数据的单位、时间和来源也是模型条件。',[{text:'x 与 y 各是什么？',blockId:'ml-observation'},{text:'何时会发生泄漏？',blockId:'ml-feature-boundary'}]);
const p3=page('ml-map','监督、无监督与任务边界',[
 {id:'ml-task-types',type:'comparison',title:'从目标判断任务',columns:['任务','已知信息','输出及例子'],rows:[['回归','输入与数值标签','连续值，如下一小时耗电量'],['分类','输入与类别标签','类别或类别概率，如是否故障'],['聚类','输入与相似性标准','样本分组，如运行状态分群']],align:['center','left','left'],study:{frame:'double'}},
 prose('ml-task-explain','回归与分类都属于监督学习。聚类是无监督学习的一种：算法按选定的相似性标准分组，分组不自动等于真实业务类别。其他任务还包括表示学习、生成建模和强化学习，本册不展开。'),
 concept('ml-model-choice','任务与模型需要分别选择','线性回归是本册使用的模型；它不代表机器学习的全部。选择模型前，应先明确预测对象、可用特征、评价方式和误判代价。换一个更复杂的算法，不能修复含义不清或提前泄露答案的数据。'),
], '任务描述输出目标；模型描述输入到输出的规则。二者需要分别定义。',[{text:'分类与回归如何区分？',blockId:'ml-task-types'},{text:'本册模型覆盖什么？',blockId:'ml-model-choice'}]);
const p4=page('ml-model','一条直线如何做出预测',[
 formula('ml-linear','\\hat y=wx+b','固定 w、b 后，每个输入对应一个预测。直线描述当前模型的假设；真实数据允许偏离这条线。',[
  {symbol:'x',name:'输入',description:'预测时已知的特征值。本例取 x=2，表示样本 B 的输入；它随样本改变。'},
  {symbol:'\\hat y',name:'预测值',description:'模型算出的结果。w=1、b=1 时，输入 2 得到预测 3；真实标签 y=4 需另作比较。'},
  {symbol:'w',name:'斜率参数',description:'输入每增加 1，预测增加 w。w=2 时，输入从 1 变为 2，预测增加 2。'},
  {symbol:'b',name:'截距参数',description:'输入为 0 时的预测。只增大 b 会使整条直线向上平移，斜率保持原值。'},
 ]),
 {id:'ml-prediction-example',type:'example',title:'例题：代入参数获得预测',prompt:'沿用 A、B、C 三个教学样本。给定 w=1、b=1，计算各点预测。',steps:[{id:'ml-pred-a',text:'A 的 x=1，所以 ŷ=1×1+1=2。'},{id:'ml-pred-b',text:'B 的 x=2，所以 ŷ=1×2+1=3。'},{id:'ml-pred-c',text:'C 的 x=3，所以 ŷ=1×3+1=4。'}],result:'三次预测为 2、3、4；真实标签为 2、4、5。预测与标签的差异将在下一节量化。'},
], '参数确定预测规则；拟合的目标是在规定条件下选择合适的参数。',[{text:'参数与样本有什么不同？',blockId:'ml-linear'}],'reading');
const p4b=page('ml-parameters','看图理解：斜率与截距怎样改变直线',[
 {id:'ml-parameter-chart',type:'chart',chartType:'line',title:'每次只改变一个参数',xLabel:'输入 x',yLabel:'预测 ŷ',series:[
  {id:'ml-line-base',label:'基准：ŷ=x+1',points:[{x:0,y:1},{x:1,y:2},{x:2,y:3},{x:3,y:4}]},
  {id:'ml-line-slope',label:'改 w：ŷ=2x+1',points:[{x:0,y:1},{x:1,y:3},{x:2,y:5},{x:3,y:7}]},
  {id:'ml-line-intercept',label:'改 b：ŷ=x+2',points:[{x:0,y:2},{x:1,y:3},{x:2,y:4},{x:3,y:5}]},
 ],caption:'同一坐标系内，改 w 的直线仍经过 (0,1)，但变得更陡；改 b 的直线与基准平行，每个 x 处的预测都增加 1。图上各点按对应公式准确计算。',study:{role:'intuition',frame:'plain'},keepTogether:true},
 {id:'ml-function-path',type:'diagram',title:'沿着函数走一遍：输入 2，w=1，b=1',arrangement:'row',nodes:[{id:'ml-f-input',label:'输入 x=2'},{id:'ml-f-multiply',label:'乘以 w：1×2=2'},{id:'ml-f-output',label:'加上 b：2+1=3'}],edges:[{from:'ml-f-input',to:'ml-f-multiply',label:'乘法'},{from:'ml-f-multiply',to:'ml-f-output',label:'平移'}],caption:'这条计算路径与图中的基准直线对应，输出就是 x=2 时纵轴上的预测值 3。',study:{role:'example',frame:'plain'},keepTogether:true},
 prose('ml-parameter-boundary','比较参数影响时，应固定另一个参数。图中展示的是三个候选规则，尚未决定哪条直线更合适；下一步需要对照样本标签，用损失函数进行比较。若真实特征有单位，w 的单位为输出单位除以输入单位，b 与输出使用相同单位。'),
], '斜率决定输入变化引起的预测变化，截距决定整体上下平移；图像与代入计算描述同一规则。',[{text:'改 w 与改 b，图像怎样不同？',blockId:'ml-parameter-chart'},{text:'输入 2 怎样得到预测 3？',blockId:'ml-function-path'}],'reading');
const p5=page('ml-visual','散点、直线与残差',[
 {id:'ml-fit-chart',type:'chart',chartType:'line',title:'同一组数据与同一个预测规则',xLabel:'输入 x（教学标量）',yLabel:'标签 / 预测',series:[{id:'ml-observed',label:'真实标签 y',points:[{x:1,y:2},{x:2,y:4},{x:3,y:5}]},{id:'ml-predicted',label:'预测 ŷ=x+1',points:[{x:1,y:2},{x:2,y:3},{x:3,y:4}]}],caption:'点的纵向差是预测误差。真实标签之间的连线仅帮助对照三个样本，不表示中间位置已经观测到数据。',study:{frame:'pencil',role:'intuition'}},
 prose('ml-residual-explain','在 B 点，预测为 3，标签为 4，预测误差 e=ŷ−y=−1。C 点同样低估 1；A 点误差为 0。这里采用“预测减标签”的符号约定；有些资料采用标签减预测作为残差定义，阅读时需要核对约定。平方误差不受这一符号选择影响。'),
], '同一 x 处的纵向距离刻画误差；图中每个点都应能回到原始数据。',[{text:'B 点误差为何为 −1？',blockId:'ml-residual-explain'}],'reading');
const p6=page('ml-loss','损失：误差怎样成为选择标准',[
 concept('ml-loss-definition','均方误差 MSE','每个样本都有一个误差。均方误差先对每个误差平方，再取平均，使不同参数获得一个可比较的分数。平方会增加较大误差的权重；若标签存在异常值，需要结合任务判断这种惩罚是否合适。'),
 formula('ml-mse','J(w,b)=\\frac{1}{n}\\sum_{i=1}^{n}(wx_i+b-y_i)^2','各项依次经历预测、求差、平方、求和与平均。若标签带单位，MSE 使用该单位的平方。',[
  {symbol:'J(w,b)',name:'训练损失',description:'当前参数在这批样本上的平均平方误差。更换 w 或 b，通常会改变这个分数。'},
  {symbol:'n',name:'样本数',description:'参与本次平均的记录数量。本例有 A、B、C 三条记录，所以 n=3。'},
  {symbol:'i',name:'样本下标',description:'从 1 到 n 依次取每条记录。求和符号 Σ 表示这些记录的平方误差相加。'},
  {symbol:'x_i',name:'第 i 个输入',description:'第 i 条样本的特征。本例样本 B 对应 x₂=2，代入后得到预测 wx₂+b。'},
  {symbol:'y_i',name:'第 i 个标签',description:'第 i 条样本的已知真实结果。样本 B 的 y₂=4，与预测值逐条配对求差。'},
  {symbol:'w,\\ b',name:'待选择的参数',description:'同一批样本共用的斜率与截距。训练固定数据，寻找使 J 较小的参数。'},
 ]),
 {id:'ml-loss-example',type:'example',prompt:'教学例题：对上一页 w=1、b=1 的三次预测，求 MSE。',steps:[{id:'ml-square',text:'误差依次是 0、−1、−1，平方为 0、1、1。'},{id:'ml-average',text:'三个平方误差相加为 2，再除以样本数 3。'}],result:'J=2/3≈0.667。这只衡量当前数据上的拟合误差，还不能代表新样本的误差。'},
], 'MSE 是一个明确的参数选择标准；训练损失与未来预测误差仍需区分。',[{text:'为什么先平方再平均？',blockId:'ml-loss-definition'},{text:'0.667 在衡量什么？',blockId:'ml-loss-example'}]);
const p7=page('ml-gradient','梯度告诉参数怎样移动',[
 prose('ml-gradient-intuition','为了看清更新的方向，本节使用另一个明确标注的教学小例子：只有两点 (1,2)、(2,4)，并将截距固定为 0，只学习斜率 w。此时 w=2 能恰好穿过两点。比较相邻 w 的损失变化，就能判断应该增大还是减小 w。'),
 formula('ml-simple-loss','J(w)=\\frac{(w-2)^2+(2w-4)^2}{2}=\\frac{5}{2}(w-2)^2','两项分别来自样本 (1,2)、(2,4)。由于 2w−4=2(w−2)，平方后第二项是第一项的 4 倍，取平均得到系数 5/2。',[
  {symbol:'w',name:'唯一待学参数',description:'这里固定 b=0，仅改变斜率。w=2 时，预测分别为 2 和 4，恰好对应两条标签。'},
  {symbol:'J(w)',name:'损失函数',description:'输入一个候选 w，输出一个非负损失。w=1 时 J=2.5；w=2 时 J=0。下图横轴是参数，纵轴是损失。'},
 ]),
 {id:'ml-loss-curve',type:'chart',chartType:'line',title:'参数 w 与训练损失',xLabel:'斜率 w',yLabel:'MSE',series:[{id:'ml-curve',label:'两样本教学数据',points:[{x:0,y:10},{x:.5,y:5.625},{x:1,y:2.5},{x:1.5,y:.625},{x:2,y:0},{x:2.5,y:.625},{x:3,y:2.5},{x:3.5,y:5.625},{x:4,y:10}]}],caption:'图按九个准确计算值连线，展示损失谷地；连接线是离散示意，精确曲线由上面的二次函数给出。',study:{frame:'double'}},
], '本例的最小值位于 w=2；斜率描述当前损失随参数变化的局部趋势。',[{text:'本页为什么固定 b=0？',blockId:'ml-gradient-intuition'}],'reading');
const p8=page('ml-update','手算一次梯度下降',[
 formula('ml-update-rule','\\frac{dJ}{dw}=5(w-2),\\qquad w_{new}=w-\\eta\\frac{dJ}{dw}','导数表达式来自上一页的两样本损失。实际使用时，应检查更新后的损失；学习率过大可能越过低点并使损失上升。',[
  {symbol:'w',name:'更新前参数',description:'本次计算的出发点。例题从 w=1 开始，在损失曲线上对应高度 J=2.5。'},
  {symbol:'\\frac{dJ}{dw}',name:'当前位置的导数',description:'描述损失随 w 变化的局部趋势。w=1 时值为 −5，说明适当增大 w 可降低损失。'},
  {symbol:'\\eta',name:'学习率',description:'大于 0 的步长系数。取 0.1 时，本次参数变化为 −0.1×(−5)=+0.5。'},
  {symbol:'w_{new}',name:'更新后参数',description:'旧参数减去学习率乘导数。本次得到 1.5，代回损失函数后 J=0.625。'},
 ]),
 {id:'ml-gradient-example',type:'example',title:'例题：w 从 1 更新到 1.5',prompt:'仍使用上一页两样本、b=0 的教学例子。初值 w=1，学习率 η=0.1。',steps:[{id:'ml-grad-1',text:'计算当前位置导数：5×(1−2)=−5。负号表示增大 w 可在局部降低损失。'},{id:'ml-grad-2',text:'更新参数：w_new=1−0.1×(−5)=1.5。'},{id:'ml-grad-3',text:'更新前 J=2.5；更新后 J=(5/2)×(1.5−2)²=0.625。'}],result:'这一步降低了训练损失，但只完成一次迭代。实际训练还需停止条件、数值检查与独立评估。'},
], '梯度给方向，学习率定步幅；要用更新后的损失检验这一步的效果。',[{text:'负导数为何使 w 增大？',blockId:'ml-gradient-example'},{text:'η 控制什么？',blockId:'ml-update-rule'}],'reading');
const p9=page('ml-validation','训练、验证与测试分别负责什么',[
 {id:'ml-split-table',type:'comparison',title:'三种数据角色',columns:['数据部分','参与哪些决定','检查什么'],rows:[['训练集','拟合参数 w、b','参数是否按目标学到关系'],['验证集','选择模型、特征和超参数','候选方案对未见样本的表现'],['测试集','最终方案固定后才使用','最终方案的独立评估']],align:['center','left','left'],study:{frame:'tape'}},
 prose('ml-split-reason','如果反复查看测试分数，再据此修改模型，测试集就间接参与了选择，原先的独立评估作用会减弱。训练和验证之间也可能使用交叉验证。没有适用于所有任务的固定拆分比例；样本量、分组结构、时间顺序和部署目标都需要考虑。'),
 {id:'ml-split-boundary',type:'callout',text:'同一个人的多条记录、同一设备的重复采样或未来时间段的数据，通常不能随意当作独立样本随机拆开。拆分应模拟模型将来面对的新对象或新时间。',study:{role:'takeaway'}},
], '拟合参数、选择方案、最终评估需要区分；拆分方式应接近真实使用条件。',[{text:'验证集参与了哪些选择？',blockId:'ml-split-table'},{text:'为什么不能只记拆分比例？',blockId:'ml-split-reason'}]);
const p10=page('ml-overfit','拟合得更好，为什么未必更可靠',[
 concept('ml-overfit-definition','过拟合与泛化','模型对训练样本中的偶然波动拟合得很细，却不能在相关的新样本上保持效果，这种现象称为过拟合。泛化关注规定数据分布和使用条件下的新样本表现。模型复杂度增加，训练误差通常更容易下降；独立验证误差可能先降后升。'),
 {id:'ml-complexity-chart',type:'chart',chartType:'line',title:'复杂度与误差：教学趋势示意',xLabel:'候选模型复杂度等级',yLabel:'误差（教学值）',series:[{id:'ml-training-error',label:'训练误差',points:[{x:1,y:8},{x:2,y:5},{x:3,y:3},{x:4,y:1.5},{x:5,y:.6}]},{id:'ml-validation-error',label:'验证误差',points:[{x:1,y:9},{x:2,y:6},{x:3,y:4},{x:4,y:5},{x:5,y:8}]}],caption:'这些值仅说明一种可能的趋势，不是实测结果，也不是所有任务的必然曲线。示意中等级 3 的验证误差最低。',study:{frame:'pencil'}},
 prose('ml-overfit-actions','面对验证误差上升，可检查泄漏与数据偏移，比较更简单的模型、正则化或更多有代表性的数据。选择应依据独立验证和任务成本，而不能只凭“算法更新”或训练分数更高。'),
], '验证表现与训练表现一起解释，才有助于判断模型复杂度是否合适。',[{text:'图中的数值是什么证据？',blockId:'ml-complexity-chart'}],'reading');
const p11=page('ml-recap','连接整条学习链',[
 {id:'ml-recap-map',type:'diagram',title:'从任务定义到独立评估',nodes:[{id:'ml-r1',label:'明确目标与可用输入'},{id:'ml-r2',label:'数据拆分与质量检查'},{id:'ml-r3',label:'模型 + 损失 → 训练参数'},{id:'ml-r4',label:'验证选择 → 测试评估'}],edges:[{from:'ml-r1',to:'ml-r2'},{from:'ml-r2',to:'ml-r3'},{from:'ml-r3',to:'ml-r4'}],caption:'先确定数据角色，再开始模型选择；最终测试不应反过来充当反复调参的依据。',study:{frame:'margin'}},
 prose('ml-recap-scope','本册已覆盖监督学习任务、样本与标签、线性模型、MSE、一次梯度下降、数据角色与过拟合。你可以用例题重新计算预测、误差和参数更新，也可以沿侧栏线索复述每一步的条件。本册没有系统推导多元微积分、概率模型、正则化、分类算法或神经网络。'),
 prose('ml-next-step','下一步先巩固向量与矩阵，再将单变量直线扩展到多特征线性模型；随后学习分类、概率输出和更完整的评估指标。准备真实项目时，应先写一页任务定义与数据字典，再选择基线模型。'),
 {id:'ml-references',type:'callout',title:'延伸阅读',text:'Google Machine Learning Crash Course 的 Linear regression、Gradient descent；scikit-learn User Guide 的 Supervised learning、Cross-validation 与 Common pitfalls。来源侧栏提供入口。教学计算由本册给定数据独立完成。',sourceRefs:[{sourceId:'ml-google'},{sourceId:'ml-sklearn-cv'},{sourceId:'ml-sklearn-pitfalls'}]},
], '任务、数据、模型、损失、训练与评估组成一条有条件的推理链；每个环节都需要清楚定义。',[{text:'本册已经讲清什么？',blockId:'ml-recap-scope'},{text:'下一步需要哪些先修？',blockId:'ml-next-step'}],'reading');
export const machineLearning:NotebookDocument={schemaVersion:'1.0.0',notebook:{id:'notebook-ml-foundations',revision:2,title:'机器学习入门：从样本到泛化',subtitle:'用图、表与一次手算串起学习流程',language:'zh-CN',goals:['区分样本、特征、标签、模型与损失','手算线性预测、均方误差及一次梯度下降','解释训练、验证、测试与泛化的关系'],sources:[{id:'ml-google',title:'Google · Machine Learning Crash Course',url:'https://developers.google.com/machine-learning/crash-course/linear-regression'},{id:'ml-sklearn-cv',title:'scikit-learn · Cross-validation',url:'https://scikit-learn.org/stable/modules/cross_validation.html'},{id:'ml-sklearn-pitfalls',title:'scikit-learn · Common pitfalls and recommended practices',url:'https://scikit-learn.org/stable/common_pitfalls.html'}],chapters:[{id:'ml-ch-data',title:'一 · 任务与数据',pages:[p1,p2,p3]},{id:'ml-ch-model',title:'二 · 模型与损失',pages:[p4,p4b,p5,p6]},{id:'ml-ch-train',title:'三 · 参数怎样学出来',pages:[p7,p8]},{id:'ml-ch-evaluate',title:'四 · 评估、边界与联系',pages:[p9,p10,p11]}]},userState:userState('ml-task'),assets:[],extensions:{baseRevision:1,readerProfile:{font:'hand',lineSpacing:1.85,layout:'single',theme:'paper-light'}}};
