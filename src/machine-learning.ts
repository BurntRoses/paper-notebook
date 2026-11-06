import {userState,type NotebookDocument,type Page,type Block} from './model/types';
const prose=(id:string,text:string):Block=>({id,type:'prose',text});
const concept=(id:string,title:string,text:string):Block=>({id,type:'concept',title,text,study:{role:'definition'}});
const formula=(id:string,latex:string,text:string,parameters:Block['parameters']):Block=>({id,type:'formula',latex,text,parameters,keepTogether:true,study:{role:'derivation',visual:'blackboard'}});
const page=(id:string,title:string,blocks:Block[],cues:{title?:string;text:string;blockId:string;anchor?:string}[],layout:'cornell'|'reading'='cornell'):Page=>({id,title,layout,subject:'stem',blocks,cues:cues.map((c,i)=>({id:id+'-cue-'+i,...c}))});
const p1=page('ml-task','线性回归的学习任务',[
 prose('ml-opening','线性回归用直线描述输入与数值结果之间的关系，学习的核心是选择斜率与截距。已知一次函数、平均数和平方，就可以沿教学数据计算预测、建立损失函数，再手算一次更新；导数的意义会结合损失曲线展开。'),
 {id:'ml-process',type:'diagram',arrangement:'row',title:'参数拟合与新样本预测',nodes:[{id:'ml-data-node',label:'样本 + 学习目标'},{id:'ml-fit-node',label:'参数拟合'},{id:'ml-predict-node',label:'新输入 → 预测'}],edges:[{from:'ml-data-node',to:'ml-fit-node',label:'利用标签'},{from:'ml-fit-node',to:'ml-predict-node',label:'应用参数'}],caption:'已知标签参与参数拟合；新输入经过同一规则得到预测值。',study:{frame:'tape'}},
 concept('ml-learning','从数据中学习','给定一组输入及其已知结果，学习算法根据一个明确的目标选择模型参数。训练完成后，模型接收新的输入，输出预测。\n\n例如，用房屋面积预测价格时，斜率表示面积每增加一个单位时预测价格的增量，截距决定直线的位置。样本提供拟合依据；另取未参与选择的样本进行独立检验，可以估计模型对新房屋的预测效果。'),
], [{"title":"参数与特征","text":"房价模型中的面积随房屋改变；斜率与截距由样本共同确定，再用于新房屋的预测。","blockId":"ml-learning","anchor":"选择模型参数"}]);
const p2=page('ml-vocabulary','样本、特征与标签',[
 concept('ml-observation','一行记录对应一个样本','样本是一次观测，表格的一行保存一条输入与目标的对应关系。特征 x 是预测时可获得的输入；标签 y 是监督学习中的已知目标。房价预测可使用面积、楼龄等多个特征组成向量，标签则是按统一口径记录的成交价。定义、单位和采集时点必须稳定，才能在样本之间比较数值。'),
 {id:'ml-table',type:'comparison',title:'贯穿后文的教学数据',columns:['样本','输入 x','标签 y'],rows:[['A','1','2'],['B','2','4'],['C','3','5']],align:['center','center','center'],study:{frame:'pencil',role:'evidence'}},
 prose('ml-feature-boundary','表中给出三个无量纲教学样本，后文用它们计算预测和误差。真实任务中的特征由预测时点决定：预测明天用电量时，可使用今天以前的历史用电量和当时可获得的天气预报。若纳入明天的真实用电量，模型会提前获得目标信息，形成信息泄漏。'),
 {id:'ml-data-definition',type:'callout',title:'任务、模型与损失',text:'标签为样本提供数值目标。模型 ŷ=wx+b 将输入变成预测；后续的损失函数会逐条比较预测与标签，并将误差合成一个供参数选择使用的数值。',study:{frame:'plain'}},
], [{"title":"特征向量","text":"面积、楼龄同时作为输入时，x 由一个数扩展为一组数；每个分量对应一种已定义的特征。","blockId":"ml-observation","anchor":"多个特征组成向量"},{"title":"信息泄漏","text":"评估应模拟真实预测时点。把未来才产生的信息作为输入，会使评估分数高估实际预测能力。","blockId":"ml-feature-boundary","anchor":"信息泄漏"}]);
const p3=page('ml-map','回归、分类与聚类',[
 {id:'ml-task-types',type:'comparison',title:'从目标判断任务',columns:['任务','已知信息','输出及例子'],rows:[['回归','输入与数值标签','连续值，如下一小时耗电量'],['分类','输入与类别标签','类别或类别概率，如是否故障'],['聚类','输入与相似性标准','样本分组，如运行状态分群']],align:['center','left','left'],study:{frame:'double'}},
 prose('ml-task-explain','回归与分类都属于监督学习：训练样本同时提供输入和目标。聚类按样本间的相似性分组。例如设备的温度与振动幅度可以形成若干运行状态群；距离的定义与特征尺度会改变哪些设备彼此接近。'),
 concept('ml-model-choice','输出形式与模型选择','连续数值的预测可用回归模型，离散类别的预测可用分类模型。线性回归以加权求和描述输入与输出的关系，适合作为可解释的基线。模型选择还要考虑预测对象、可用特征、评价方式和误判代价；例如漏报故障的代价会影响分类阈值。'),
], [{"title":"输出与目标","text":"耗电量有连续的数值尺度；故障类别是离散结果。任务目标决定模型输出需要表达的量。","blockId":"ml-task-types","anchor":"连续值，如下一小时耗电量"},{"title":"误判代价","text":"漏报故障会延误检修，误报会增加检查成本。分类阈值的选择要结合这两类后果。","blockId":"ml-model-choice","anchor":"漏报故障的代价"}]);
const p4=page('ml-model','线性模型与预测值',[
 formula('ml-linear','\\hat y=wx+b','固定 w、b 后，输入 x 代入一次函数得到预测 ŷ。模型假定预测随 x 等速变化：x 每增加相同的量，ŷ 的增量也相同。观测中的波动由预测与标签之间的差异呈现。',[
  {symbol:'x',name:'输入',description:'预测时已知的特征值。本例取 x=2，表示样本 B 的输入；它随样本改变。'},
  {symbol:'\\hat y',name:'预测值',description:'模型算出的结果。w=1、b=1 时，输入 2 得到预测 3；真实标签 y=4 需另作比较。'},
  {symbol:'w',name:'斜率参数',description:'输入每增加 1，预测增加 w。w=2 时，输入从 1 变为 2，预测增加 2。'},
  {symbol:'b',name:'截距参数',description:'输入为 0 时的预测。只增大 b 会使整条直线向上平移，斜率保持原值。'},
 ]),
 {id:'ml-prediction-example',type:'example',title:'例题：代入参数获得预测',prompt:'沿用 A、B、C 三个教学样本。给定 w=1、b=1，计算各点预测。',steps:[{id:'ml-pred-a',text:'A 的 x=1，所以 ŷ=1×1+1=2。'},{id:'ml-pred-b',text:'B 的 x=2，所以 ŷ=1×2+1=3。'},{id:'ml-pred-c',text:'C 的 x=3，所以 ŷ=1×3+1=4。'}],result:'三次预测为 2、3、4；真实标签为 2、4、5。A 点完全吻合，B、C 各低估 1。'},
], [{"title":"斜率的含义","text":"若面积以平方米计、房价以万元计，w 表示每增加一平方米时预测价格增加的万元数。","blockId":"ml-linear","anchor":"输入每增加 1，预测增加 w"},{"title":"截距与取值范围","text":"b 是 x=0 时的预测；若零点远离已有样本，其数值主要用于确定直线位置。","blockId":"ml-linear","anchor":"输入为 0 时的预测"}],'reading');
const p4b=page('ml-parameters','斜率与截距',[
 {id:'ml-parameter-chart',type:'chart',chartType:'line',title:'每次只改变一个参数',xLabel:'输入 x',yLabel:'预测 ŷ',series:[
  {id:'ml-line-base',label:'基准：ŷ=x+1',points:[{x:0,y:1},{x:1,y:2},{x:2,y:3},{x:3,y:4}]},
  {id:'ml-line-slope',label:'改 w：ŷ=2x+1',points:[{x:0,y:1},{x:1,y:3},{x:2,y:5},{x:3,y:7}]},
  {id:'ml-line-intercept',label:'改 b：ŷ=x+2',points:[{x:0,y:2},{x:1,y:3},{x:2,y:4},{x:3,y:5}]},
 ],caption:'固定截距时，斜率从1增至2，直线仍经过(0,1)；固定斜率时，截距增加1，直线平行上移1。',study:{role:'intuition',frame:'plain'},keepTogether:true},
 {id:'ml-function-path',type:'diagram',title:'代入 x=2：乘以 w，再加 b',arrangement:'row',nodes:[{id:'ml-f-input',label:'输入 x=2'},{id:'ml-f-multiply',label:'乘以 w：1×2=2'},{id:'ml-f-output',label:'加上 b：2+1=3'}],edges:[{from:'ml-f-input',to:'ml-f-multiply',label:'乘法'},{from:'ml-f-multiply',to:'ml-f-output',label:'平移'}],caption:'这条计算路径与图中的基准直线对应，输出就是 x=2 时纵轴上的预测值 3。',study:{role:'example',frame:'plain'},keepTogether:true},
 prose('ml-parameter-boundary','固定另一个参数，可以单独观察斜率或截距的作用。对后文的三个样本，基准规则 ŷ=x+1 的 MSE 为2/3，ŷ=2x+1 的 MSE 为2，ŷ=x+2 的 MSE 为1/3。在这三个候选中，平行上移后的规则平均平方误差最小。'),
 {id:'ml-parameter-units',type:'callout',title:'参数的单位',text:'若特征和输出有单位，w 的单位为输出单位除以输入单位，b 与输出使用相同单位。',keepTogether:true,study:{frame:'plain'}},
], [{"title":"控制变量","text":"只改一个参数，可以把预测变化归因于该参数。图中改斜率与改截距分别形成转动和平移。","blockId":"ml-parameter-chart"},{"title":"输入与输出","text":"x=2 对应坐标图的横坐标；计算得到的 3 对应基准线在该处的纵坐标。","blockId":"ml-function-path"}],'reading');
const p5=page('ml-visual','散点、直线与残差',[
 {id:'ml-fit-chart',type:'chart',chartType:'line',title:'同一组数据与同一个预测规则',xLabel:'输入 x（教学标量）',yLabel:'标签 / 预测',series:[{id:'ml-observed',label:'真实标签 y',points:[{x:1,y:2},{x:2,y:4},{x:3,y:5}]},{id:'ml-predicted',label:'预测 ŷ=x+1',points:[{x:1,y:2},{x:2,y:3},{x:3,y:4}]}],caption:'三个样本的标签与预测在相同x处配对。纵向差分别为0、−1、−1；折线连接观测点供比较。',study:{frame:'pencil',role:'intuition'}},
 prose('ml-residual-explain','用预测减标签定义误差 e=ŷ−y。在 B 点，预测为3，标签为4，所以 e=−1；负号表示低估，绝对值1表示偏离幅度。C 点同样低估1，A点误差为0。\n\n误差保留方向，平方误差度量偏离的大小。若交换相减顺序，误差的符号反转，平方误差不受这一符号选择影响。'),
], [{"title":"误差方向","text":"采用 e=ŷ−y 时，负误差表示低估；换成 y−ŷ 后符号反转，偏离幅度和平方损失保持相同。","blockId":"ml-residual-explain","anchor":"误差保留方向"},{"title":"纵向距离","text":"固定同一个 x，比较模型输出与标签的纵坐标。图中向下的箭头表示预测比真实值低 1。","blockId":"ml-residual-detail"}],'reading');
const p6=page('ml-loss','均方误差与损失函数',[
 concept('ml-loss-definition','均方误差 MSE','均方误差先对每个误差平方，再取平均。平方使正负误差都贡献非负数，避免低估与高估相互抵消；平均使损失按每个样本计量。改变参数会改变全部预测，MSE 因而成为选择参数的目标函数。'),
 {id:'ml-loss-outliers',type:'callout',title:'平方误差与异常值',tone:'warning',text:'误差从1增至3，平方误差从1增至9。较大误差对目标函数贡献更大，参数更新受这些样本的影响更强。若较大误差来自标签录入错误等异常值，核查标签可改善数据质量；绝对误差损失则按偏离幅度线性计分。',keepTogether:true,study:{frame:'plain',tone:'gold',marks:[{text:'较大误差',kind:'bold'},{text:'异常值',kind:'red',color:'#b1483d'}]}},
 formula('ml-mse','J(w,b)=\\frac{1}{n}\\sum_{i=1}^{n}(wx_i+b-y_i)^2','各项依次经历预测、求差、平方、求和与平均。若标签带单位，MSE 使用该单位的平方。',[
  {symbol:'J(w,b)',name:'训练损失',description:'当前参数在这批样本上的平均平方误差。更换 w 或 b，通常会改变这个分数。'},
  {symbol:'n',name:'样本数',description:'参与本次平均的记录数量。本例有 A、B、C 三条记录，所以 n=3。'},
  {symbol:'i',name:'样本下标',description:'从 1 到 n 依次取每条记录。求和符号 Σ 表示这些记录的平方误差相加。'},
  {symbol:'x_i',name:'第 i 个输入',description:'第 i 条样本的特征。本例样本 B 对应 x₂=2，代入后得到预测 wx₂+b。'},
  {symbol:'y_i',name:'第 i 个标签',description:'第 i 条样本的已知真实结果。样本 B 的 y₂=4，与预测值逐条配对求差。'},
  {symbol:'w,\\ b',name:'待选择的参数',description:'同一批样本共用的斜率与截距。训练时保持数据不变，调整这两个参数以减小 J。'},
 ]),
 {id:'ml-loss-example',type:'example',prompt:'教学例题：对上一页 w=1、b=1 的三次预测，求 MSE。',steps:[{id:'ml-square',text:'误差依次是 0、−1、−1，平方为 0、1、1。'},{id:'ml-average',text:'三个平方误差相加为 2，再除以样本数 3。'}],result:'J=2/3≈0.667，表示这三个教学样本的平均平方误差。'},
], [{"title":"平方惩罚","text":"误差幅度扩大到 3 倍，平方项扩大到 9 倍，因此少量大误差会显著影响拟合目标。","blockId":"ml-loss-definition","anchor":"平方使正负误差都贡献非负数"},{"title":"损失的尺度","text":"将所有标签与预测同时放大 k 倍，MSE 放大 k² 倍；跨数据比较损失时要核对量纲与尺度。","blockId":"ml-loss-example","anchor":"J=2/3≈0.667"},{"title":"异常值的影响","text":"录入错误造成的大偏差也会被平方放大。核查这些记录，有助于判断它们应如何参与拟合。","blockId":"ml-loss-outliers","anchor":"标签录入错误"}]);
const p7=page('ml-gradient','损失曲线与下降方向',[
 prose('ml-gradient-intuition','为单独分析参数更新，取两点 (1,2)、(2,4)，将截距固定为 0，只学习斜率 w。预测依次为 w 和2w，标签依次为2和4；w=2 能恰好穿过两点。展开这组数据的 MSE，就得到关于 w 的二次函数。'),
 formula('ml-simple-loss','J(w)=\\frac{(w-2)^2+(2w-4)^2}{2}=\\frac{5}{2}(w-2)^2','两项分别来自样本 (1,2)、(2,4)。由于 2w−4=2(w−2)，平方后第二项是第一项的 4 倍，取平均得到系数 5/2。',[
  {symbol:'w',name:'唯一待学参数',description:'这里固定 b=0，仅改变斜率。w=2 时，预测分别为 2 和 4，恰好对应两条标签。'},
  {symbol:'J(w)',name:'损失函数',description:'输入一个候选 w，输出一个非负损失。w=1 时 J=2.5；w=2 时 J=0。下图横轴是参数，纵轴是损失。'},
 ]),
 {id:'ml-loss-curve',type:'chart',chartType:'line',title:'参数 w 与训练损失',xLabel:'斜率 w',yLabel:'MSE',series:[{id:'ml-curve',label:'两样本教学数据',points:[{x:0,y:10},{x:.5,y:5.625},{x:1,y:2.5},{x:1.5,y:.625},{x:2,y:0},{x:2.5,y:.625},{x:3,y:2.5},{x:3.5,y:5.625},{x:4,y:10}]}],caption:'九个计算点取自 J(w)=2.5(w−2)²。最低点在w=2，两侧对称；w偏离2越远，损失越大。',study:{frame:'double'}},
], [{"title":"一维优化","text":"固定 b=0 后，只需在横轴上搜索 w；同时学习 w、b 时，损失定义在二维参数空间。","blockId":"ml-gradient-intuition","anchor":"只学习斜率 w"},{"title":"曲线的横轴","text":"这里每个横坐标代表一组候选参数，纵坐标汇总两条样本的误差；它与前面的输入—预测图含义不同。","blockId":"ml-loss-curve"}],'reading');
const p8=page('ml-update','手算一次梯度下降',[
 formula('ml-update-rule','\\frac{dJ}{dw}=5(w-2),\\qquad w_{new}=w-\\eta\\frac{dJ}{dw}','对 J(w)=2.5(w−2)² 求导，平方项的指数降为1并乘出系数2，得到5(w−2)。w<2时导数为负，更新使w增大；w>2时导数为正，更新使w减小。学习率过大时，参数到最优值的距离可能增大。',[
  {symbol:'w',name:'更新前参数',description:'更新前的斜率值。例题从 w=1 开始，对应损失曲线上的 J=2.5。'},
  {symbol:'\\frac{dJ}{dw}',name:'当前位置的导数',description:'描述损失随 w 变化的局部趋势。w=1 时值为 −5，说明适当增大 w 可降低损失。'},
  {symbol:'\\eta',name:'学习率',description:'大于 0 的步长系数。取 0.1 时，本次参数变化为 −0.1×(−5)=+0.5。'},
  {symbol:'w_{new}',name:'更新后参数',description:'旧参数减去学习率乘导数。本次得到 1.5，代回损失函数后 J=0.625。'},
 ]),
 {id:'ml-gradient-example',type:'example',title:'例题：w 从 1 更新到 1.5',prompt:'仍使用上一页两样本、b=0 的教学例子。初值 w=1，学习率 η=0.1。',steps:[{id:'ml-grad-1',text:'计算当前位置导数：5×(1−2)=−5。负号表示增大 w 可在局部降低损失。'},{id:'ml-grad-2',text:'更新参数：w_new=1−0.1×(−5)=1.5。'},{id:'ml-grad-3',text:'更新前 J=2.5；更新后 J=(5/2)×(1.5−2)²=0.625。'}],result:'参数到最优值2的距离由1缩小为0.5；二次损失随距离的平方变化，因此损失由2.5降为原来的四分之一，即0.625。'},
 {id:'ml-step-size',type:'callout',title:'步长与误差收缩',text:'更新式可整理为 w_new−2=(1−5η)(w−2)。η=0.1时，系数为0.5，所以到最优值的距离每次减半；η=0.5时，系数为−1.5，参数在2的两侧交替变化，到2的距离每次扩大为原来的1.5倍。对这个二次函数，0<η<0.4时距离逐次缩小。',study:{marks:[{text:'距离每次减半',kind:'underline'},{text:'0<η<0.4',kind:'red',color:'#b1483d'}]}},
], [{"title":"下降方向","text":"w=1 处导数为 −5，负梯度指向 w 增大的方向。更新到 1.5 后，损失从 2.5 降到 0.625。","blockId":"ml-gradient-example","anchor":"负号表示增大 w 可在局部降低损失"},{"title":"步长与收敛","text":"本例满足 w_new−2=(1−5η)(w−2)。η=0.1 使到最优值的距离每次减半；步长增大会改变这一收缩率。","blockId":"ml-update-rule","anchor":"学习率过大"}],'reading');
const p9=page('ml-validation','训练集、验证集与测试集',[
 {id:'ml-split-table',type:'comparison',title:'三种数据角色',columns:['数据部分','参与哪些决定','检查什么'],rows:[['训练集','拟合参数 w、b','参数是否按目标学到关系'],['验证集','选择模型、特征和超参数','候选方案对未见样本的表现'],['测试集','最终方案固定后才使用','最终方案的独立评估']],align:['center','left','left'],study:{frame:'tape'}},
 prose('ml-split-reason','比较许多候选方案时，验证分数同时受模型能力和该批样本的随机波动影响。选择验证分数最好的方案，也可能选中了对这批样本特别有利的组合。保留测试集，在方案固定后评估，可估计这一最终方案的新样本误差。\n\n反复按测试分数调整模型会使测试集参与选择，原先的独立评估作用会减弱。样本较少时，可在训练数据内用交叉验证轮流拟合与验证，比较候选方案。'),
 {id:'ml-split-boundary',type:'callout',title:'按对象和时间拆分',text:'预测新患者时，将同一患者的记录放入同一组，再按患者拆分；预测未来用电量时，以较早时段拟合，以较晚时段评估。这样得到的评估更接近部署时面对的新对象或新时间。',study:{role:'takeaway',frame:'plain'}},
], [{"title":"模型选择","text":"超参数控制模型结构或训练过程，例如正则化强度。它们可借助验证结果选择，再固定方案作最终评估。","blockId":"ml-split-table","anchor":"选择模型、特征和超参数"},{"title":"评估中的选择偏差","text":"在许多方案中挑最高分，也可能挑中了恰好适应该批样本波动的方案。独立测试用于评估选定方案。","blockId":"ml-split-reason","anchor":"验证分数同时受模型能力和该批样本的随机波动影响"}]);
const p10=page('ml-overfit','过拟合与泛化',[
 concept('ml-overfit-definition','过拟合与泛化','模型对训练样本中的偶然波动拟合得很细，却不能在相关的新样本上保持效果，这种现象称为过拟合。泛化关注规定数据分布和使用条件下的新样本表现。\n\n模型复杂度增加，训练误差通常更容易下降；独立验证误差可能先降后升。'),
 {id:'ml-complexity-chart',type:'chart',chartType:'line',title:'复杂度与误差：教学趋势示意',xLabel:'候选模型复杂度等级',yLabel:'误差（教学值）',series:[{id:'ml-training-error',label:'训练误差',points:[{x:1,y:8},{x:2,y:5},{x:3,y:3},{x:4,y:1.5},{x:5,y:.6}]},{id:'ml-validation-error',label:'验证误差',points:[{x:1,y:9},{x:2,y:6},{x:3,y:4},{x:4,y:5},{x:5,y:8}]}],caption:'教学设定的五组误差中，等级3的验证误差为4；继续增加复杂度时，训练误差下降而验证误差上升。',study:{frame:'pencil'}},
 prose('ml-overfit-actions','图中等级3至5的训练误差由3降至0.6，验证误差由4升至8，新增复杂度主要改善了对训练样本的贴合。较简单的模型减少可调自由度；正则化在目标函数中惩罚过大的参数，抑制对局部波动的追随。研究者结合独立验证和任务成本选择候选方案。'),
], [{"title":"复杂度与泛化","text":"等级 3 之后，训练误差继续下降，验证误差却上升；新增复杂度对训练样本的改善未能延续到新样本。","blockId":"ml-complexity-chart"}],'reading');
const p11=page('ml-recap','参数学习与多特征扩展',[
 {id:'ml-recap-map',type:'diagram',title:'从任务定义到独立评估',nodes:[{id:'ml-r1',label:'明确目标与可用输入'},{id:'ml-r2',label:'数据拆分与质量检查'},{id:'ml-r3',label:'模型 + 损失 → 训练参数'},{id:'ml-r4',label:'验证选择 → 测试评估'}],edges:[{from:'ml-r1',to:'ml-r2'},{from:'ml-r2',to:'ml-r3'},{from:'ml-r3',to:'ml-r4'}],caption:'任务定义决定输入、目标与评价指标；数据拆分决定哪些记录用于拟合、选择和最终评估。',study:{frame:'margin'}},
 prose('ml-recap-scope','一次梯度下降的计算依赖参数、预测和损失的关系：参数 w 决定预测，预测与标签决定损失，损失对 w 的导数决定更新方向。增加输入特征后，每个参数仍按这组关系参与计算。'),
 prose('ml-next-step','多特征线性模型用向量保存输入，以各特征的加权和产生预测；梯度也扩展为每个参数的偏导数组成的向量。向量与矩阵支持这一表示，多元微积分解释同时更新参数。真实项目可从任务定义与数据字典开始：记录预测对象、输入的可用时点、标签和评价指标，再拟合基线模型。'),
 {id:'ml-references',type:'callout',title:'延伸阅读',text:'Google Machine Learning Crash Course 的 Linear regression、Gradient descent；scikit-learn User Guide 的 Supervised learning、Cross-validation 与 Common pitfalls。来源侧栏提供对应章节的链接。',sourceRefs:[{sourceId:'ml-google'},{sourceId:'ml-sklearn-cv'},{sourceId:'ml-sklearn-pitfalls'}]},
], [{"title":"参数学习的联系","text":"预测规则把参数映射为输出，损失将输出误差汇总；优化沿损失的变化方向调整参数。","blockId":"ml-recap-scope","anchor":"一次梯度下降"},{"title":"多特征扩展","text":"每个特征对应一个权重。向量内积将各项贡献相加，梯度分别给出各权重的局部调整方向。","blockId":"ml-next-step","anchor":"向量与矩阵"}],'reading');
export const machineLearning:NotebookDocument={schemaVersion:'1.0.0',notebook:{id:'notebook-ml-foundations',revision:2,title:'机器学习入门：从样本到泛化',language:'zh-CN',goals:['区分样本、特征、标签、模型与损失','手算线性预测、均方误差及一次梯度下降','解释训练、验证、测试与泛化的关系'],sources:[{id:'ml-google',title:'Google · Machine Learning Crash Course',url:'https://developers.google.com/machine-learning/crash-course/linear-regression'},{id:'ml-sklearn-cv',title:'scikit-learn · Cross-validation',url:'https://scikit-learn.org/stable/modules/cross_validation.html'},{id:'ml-sklearn-pitfalls',title:'scikit-learn · Common pitfalls and recommended practices',url:'https://scikit-learn.org/stable/common_pitfalls.html'}],chapters:[{id:'ml-ch-data',title:'一 · 任务与数据',pages:[p1,p2,p3]},{id:'ml-ch-model',title:'二 · 模型与损失',pages:[p4,p4b,p5,p6]},{id:'ml-ch-train',title:'三 · 梯度下降与参数更新',pages:[p7,p8]},{id:'ml-ch-evaluate',title:'四 · 评估与泛化',pages:[p9,p10,p11]}]},userState:userState('ml-task'),assets:[],extensions:{baseRevision:1,readerProfile:{font:'hand',lineSpacing:2.05,layout:'single',theme:'paper-light'}}};

// Core concepts, mechanisms and conditions selected from the actual lesson.
const emphasis:Record<string,NonNullable<Block['study']>['marks']>={
 "ml-opening":[{"text":"线性回归","kind":"bold"},{"text":"线性回归","kind":"red","color":"#285f9e"},{"text":"选择斜率与截距","kind":"underline"}],
 "ml-learning":[{"text":"模型参数","kind":"bold"},{"text":"模型参数","kind":"red","color":"#285f9e"},{"text":"独立检验","kind":"underline"},{"text":"模型参数","kind":"circle"}],
 "ml-observation":[{"text":"特征 x","kind":"bold"},{"text":"特征 x","kind":"red","color":"#285f9e"},{"text":"标签 y","kind":"bold"},{"text":"标签 y","kind":"red","color":"#285f9e"},{"text":"定义、单位和采集时点必须稳定","kind":"bold"},{"text":"定义、单位和采集时点必须稳定","kind":"red","color":"#b1483d"},{"text":"特征 x","kind":"circle"}],
 "ml-feature-boundary":[{"text":"预测时点","kind":"bold"},{"text":"预测时点","kind":"red","color":"#b1483d"},{"text":"信息泄漏","kind":"bold"},{"text":"信息泄漏","kind":"red","color":"#285f9e"}],
 "ml-task-explain":[{"text":"监督学习","kind":"bold"},{"text":"监督学习","kind":"red","color":"#285f9e"},{"text":"距离的定义与特征尺度","kind":"underline"}],
 "ml-model-choice":[{"text":"误判代价","kind":"bold"},{"text":"误判代价","kind":"red","color":"#285f9e"}],
 "ml-linear":[{"text":"预测随 x 等速变化","kind":"bold"},{"text":"预测随 x 等速变化","kind":"red","color":"#285f9e"},{"text":"斜率参数","kind":"bold"},{"text":"斜率参数","kind":"red","color":"#285f9e"},{"text":"截距参数","kind":"bold"},{"text":"截距参数","kind":"red","color":"#285f9e"}],
 "ml-parameter-boundary":[{"text":"固定另一个参数","kind":"underline"},{"text":"平均平方误差最小","kind":"bold"},{"text":"平均平方误差最小","kind":"red","color":"#285f9e"}],
 "ml-residual-explain":[{"text":"e=ŷ−y","kind":"bold"},{"text":"e=ŷ−y","kind":"red","color":"#285f9e"},{"text":"负号表示低估","kind":"bold"},{"text":"负号表示低估","kind":"red","color":"#b1483d"},{"text":"平方误差不受这一符号选择影响","kind":"underline"}],
 "ml-loss-definition":[{"text":"均方误差","kind":"bold"},{"text":"均方误差","kind":"red","color":"#285f9e"},{"text":"先对每个误差平方，再取平均","kind":"underline"},{"text":"选择参数的目标函数","kind":"bold"},{"text":"选择参数的目标函数","kind":"red","color":"#285f9e"},{"text":"均方误差","kind":"circle"}],
 "ml-loss-outliers":[{"text":"较大误差对目标函数贡献更大","kind":"bold"},{"text":"较大误差对目标函数贡献更大","kind":"red","color":"#b1483d"}],
 "ml-loss-example":[{"text":"J=2/3≈0.667","kind":"check"}],
 "ml-gradient-intuition":[{"text":"将截距固定为 0","kind":"bold"},{"text":"将截距固定为 0","kind":"red","color":"#b1483d"},{"text":"只学习斜率 w","kind":"bold"},{"text":"只学习斜率 w","kind":"red","color":"#285f9e"}],
 "ml-simple-loss":[{"text":"唯一待学参数","kind":"bold"},{"text":"唯一待学参数","kind":"red","color":"#285f9e"},{"text":"损失函数","kind":"bold"},{"text":"损失函数","kind":"red","color":"#285f9e"}],
 "ml-update-rule":[{"text":"局部趋势","kind":"bold"},{"text":"局部趋势","kind":"red","color":"#285f9e"},{"text":"学习率","kind":"bold"},{"text":"学习率","kind":"red","color":"#285f9e"},{"text":"学习率过大","kind":"bold"},{"text":"学习率过大","kind":"red","color":"#b1483d"}],
 "ml-gradient-example":[{"text":"负号表示增大 w 可在局部降低损失","kind":"underline"},{"text":"w_new=1−0.1×(−5)=1.5","kind":"check"}],
 "ml-step-size":[{"text":"0<η<0.4","kind":"bold"},{"text":"0<η<0.4","kind":"red","color":"#b1483d"},{"text":"距离每次减半","kind":"underline"}],
 "ml-split-table":[{"text":"拟合参数 w、b","kind":"bold"},{"text":"拟合参数 w、b","kind":"red","color":"#285f9e"},{"text":"选择模型、特征和超参数","kind":"underline"},{"text":"最终方案固定后才使用","kind":"bold"},{"text":"最终方案固定后才使用","kind":"red","color":"#b1483d"}],
 "ml-split-reason":[{"text":"随机波动","kind":"bold"},{"text":"随机波动","kind":"red","color":"#285f9e"},{"text":"反复按测试分数调整模型","kind":"bold"},{"text":"反复按测试分数调整模型","kind":"red","color":"#b1483d"}],
 "ml-overfit-definition":[{"text":"过拟合","kind":"bold"},{"text":"过拟合","kind":"red","color":"#285f9e"},{"text":"新样本表现","kind":"bold"},{"text":"新样本表现","kind":"red","color":"#285f9e"},{"text":"过拟合","kind":"circle"}],
 "ml-overfit-actions":[{"text":"正则化","kind":"bold"},{"text":"正则化","kind":"red","color":"#285f9e"},{"text":"惩罚过大的参数","kind":"underline"}],
 "ml-next-step":[{"text":"向量与矩阵","kind":"bold"},{"text":"向量与矩阵","kind":"red","color":"#285f9e"},{"text":"任务定义与数据字典","kind":"underline"}]
};
for(const chapter of machineLearning.notebook.chapters)for(const page of chapter.pages)for(const block of page.blocks){
 if(emphasis[block.id])block.study={...block.study,marks:emphasis[block.id]};
}
machineLearning.notebook.revision=10;machineLearning.extensions.baseRevision=9;

machineLearning.userState.updatedAt='2026-11-01T00:00:00.000Z';

for(const chapter of machineLearning.notebook.chapters)for(const page of chapter.pages)for(const block of page.blocks){
 if(block.type==='chart')block.figure={size:'wide',ratio:'3:2',style:'sketch'};
 if(block.type==='diagram')block.figure={size:'wide',ratio:'auto',style:'sketch'};
}

const annotatedChart=machineLearning.notebook.chapters.flatMap(c=>c.pages).flatMap(p=>p.blocks).find(b=>b.id==='ml-parameter-chart')!;
annotatedChart.figure!.annotations=[{kind:'text',x:49,y:13,text:'同一截距，斜率更大',color:'#b1483d'},{kind:'arrow',x:65,y:17,x2:78,y2:26,color:'#b1483d'}];

// A magnified residual makes the sign and the measured direction visible.
const residualSvg='<svg xmlns="http://www.w3.org/2000/svg" width="800" height="420" viewBox="0 0 800 420"><rect width="800" height="420" fill="#f6f3e7"/><g fill="none" stroke="#6f8b86" stroke-width="2"><path d="M110 55V340H680"/><path d="M340 340V75" stroke-dasharray="7 7" opacity=".5"/><path d="M110 280L535 58" stroke="#426e85" stroke-width="3"/></g><g font-family="serif" font-size="23" fill="#345867"><text x="72" y="45">y</text><text x="695" y="348">x</text><text x="309" y="376">x = 2</text><text x="365" y="174" fill="#426e85">预测 ŷ = 3</text><text x="365" y="108" fill="#b1483d">真实 y = 4</text><text x="116" y="400" font-size="21">同一输入，只比较纵向差；残差 e = ŷ − y = −1。</text></g><circle cx="340" cy="160" r="7" fill="#426e85"/><circle cx="340" cy="100" r="7" fill="#b1483d"/><path d="M340 108V152m-8-12 8 12 8-12" fill="none" stroke="#b1483d" stroke-width="3"/></svg>';
machineLearning.assets.push({id:'ml-residual-detail-asset',name:'样本B的残差放大图',mime:'image/svg+xml',data:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(residualSvg),width:800,height:420,source:'由本册教学数据 (x=2,y=4) 与模型 ŷ=x+1 绘制',license:'MIT',verified:true});
p5.blocks.splice(1,0,{id:'ml-residual-detail',type:'image',title:'放大样本 B：误差沿纵向计算',assetId:'ml-residual-detail-asset',alt:'同一输入x等于2，真实标签为4，预测值为3；箭头从真实位置指向预测位置，残差为负1。',caption:'残差沿纵轴比较，符号由“预测减标签”的约定决定。图上的箭头向下，对应负残差。',figure:{size:'wide',ratio:'auto',style:'sketch',annotations:[{kind:'circle',x:38,y:20,x2:47,y2:42,color:'#b1483d'},{kind:'text',x:67,y:53,text:'向下：负残差',color:'#b1483d'},{kind:'arrow',x:66,y:50,x2:46,y2:33,color:'#b1483d'}]}});
const figureGuides:Record<string,NonNullable<Block['figure']>['annotations']>={
 'ml-loss-curve':[{kind:'circle',x:47,y:66,x2:56,y2:79,color:'#357344'},{kind:'text',x:58,y:53,text:'最低点 w=2',color:'#357344'},{kind:'arrow',x:61,y:57,x2:53,y2:70,color:'#357344'}],
 'ml-fit-chart':[{kind:'circle',x:60,y:22,x2:69,y2:41,color:'#b1483d'},{kind:'text',x:25,y:19,text:'同一 x，比较纵向差',color:'#b1483d'},{kind:'arrow',x:48,y:20,x2:63,y2:31,color:'#b1483d'}],
 'ml-complexity-chart':[{kind:'circle',x:55,y:42,x2:63,y2:55,color:'#357344'},{kind:'text',x:24,y:22,text:'按验证误差选择',color:'#357344'},{kind:'arrow',x:45,y:25,x2:58,y2:46,color:'#357344'}]
};
for(const chapter of machineLearning.notebook.chapters)for(const page of chapter.pages)for(const block of page.blocks){
 if(figureGuides[block.id])block.figure={...block.figure,annotations:figureGuides[block.id]};
}
