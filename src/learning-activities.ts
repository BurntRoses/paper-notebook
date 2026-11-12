import type { Block, Expression } from './model/types';
const op=(op:Extract<Expression,object>['op'],...args:Expression[]):Expression=>({op,args});
const add=(...v:Expression[])=>op('add',...v),mul=(...v:Expression[])=>op('mul',...v),sub=(a:Expression,b:Expression)=>op('sub',a,b),div=(a:Expression,b:Expression)=>op('div',a,b),pow=(a:Expression,b:Expression)=>op('pow',a,b);
const growth=(n:Expression)=>mul('principal',pow(add(1,div('rate',100)),n));
export const growthActivity:Block={id:'growth-exploration',type:'exploration',title:'增长率与累计金额',exploration:{kind:'plot',parameters:[{id:'principal',label:'初始本金',min:100,max:1000,step:100,value:100,unit:'元'},{id:'rate',label:'每期增长率',min:0,max:15,step:0.5,value:10,unit:'%'}],domain:{min:0,max:20,label:'期数'},yLabel:'金额（元）',series:[{label:'复利',expression:growth('x')},{label:'单利',expression:mul('principal',add(1,mul(div('rate',100),'x')))}],outputs:[{label:'第 2 期末',expression:growth(2),unit:'元'},{label:'第 20 期末',expression:growth(20),unit:'元'},{label:'20 期累计利息',expression:sub(growth(20),'principal'),unit:'元'}]}};
const contribution=sub('price','variable');
export const businessActivity:Block={id:'business-exploration',type:'exploration',title:'成本结构与平衡销量',exploration:{kind:'plot',parameters:[{id:'price',label:'单价',min:75,max:150,step:1,value:80,unit:'元/件'},{id:'variable',label:'单位变动成本',min:0,max:70,step:1,value:50,unit:'元/件'},{id:'fixed',label:'固定成本',min:500,max:10000,step:100,value:3000,unit:'元'}],domain:{min:0,max:250,label:'销量（件）'},yLabel:'金额（元）',series:[{label:'销售收入',expression:mul('price','x')},{label:'总成本',expression:add('fixed',mul('variable','x'))}],outputs:[{label:'单位贡献',expression:contribution,unit:'元/件'},{label:'平衡销量',expression:div('fixed',contribution),unit:'件',digits:1},{label:'销售 120 件的利润',expression:sub(mul(120,contribution),'fixed'),unit:'元'}]}};
export const readingActivity:Block={id:'literature-exploration',type:'exploration',title:'《春望》逐联赏析',study:{marks:[{text:'忧国之情融入眼前所见',kind:'bold'},{text:'忧国之情融入眼前所见',kind:'red',color:'#285f9e'}]},exploration:{kind:'reading',frames:[
 {id:'spring-first',label:'首联',quote:'国破山河在，城春草木深。',text:'“国破”交代长安沦陷的现实，“山河在”写自然依旧。城中本应繁盛的春景只见草木滋长，“深”字写出人烟稀少、荒草蔓生的景象。国与山河、城与草木形成映照，忧国之情融入眼前所见。',facts:[{label:'对偶',value:'“国破”与“城春”、“山河”与“草木”位置相对。'}]},
 {id:'spring-second',label:'颔联',quote:'感时花溅泪，恨别鸟惊心。',text:'花与鸟原是春日悦人的景物，诗人却因时局和离别而落泪、惊心。“感时”“恨别”直接点出情感来源。赏析时可从触景生情与移情于物两种读法展开：诗人见花闻鸟而动情，或花鸟也仿佛因乱世与离别而悲伤。',facts:[{label:'情景关系',value:'春日花鸟承载忧时伤别的感受。'}]},
 {id:'spring-third',label:'颈联',quote:'烽火连三月，家书抵万金。',text:'战火持续，交通阻隔，家人的音讯变得极难获得。“连”写战乱延续，“抵万金”以夸张写家书的珍贵。诗的视线从城中景物转向家人，忧国与思家在同一场战乱中相连。'},
 {id:'spring-last',label:'尾联',quote:'白头搔更短，浑欲不胜簪。',text:'“搔”将忧思写成动作，“更短”写白发稀疏的程度不断加重，几乎难以承住发簪。诗人以衰老的身体细节收束全诗，前面的国事、离别与家书之忧都凝聚在这一动作中。',facts:[{label:'章法',value:'由城中所望写到自身形象，情感逐层集中。'}]}
]}};
const traceVariables=(seen:string[],customer?:string,count?:number)=>[
 {name:'records',value:['A','A','B']},
 {name:'seen',value:seen,display:'set' as const},
 ...(customer===undefined?[]:[{name:'customer',value:customer}]),
 ...(count===undefined?[]:[{name:'count',value:count}])
];
export const sequenceActivity:Block={id:'code-exploration',type:'exploration',title:'集合去重的执行过程',study:{marks:[{text:'集合已经包含 A',kind:'bold'},{text:'集合已经包含 A',kind:'red',color:'#285f9e'}]},exploration:{kind:'sequence',trace:{language:'Python',code:['records = ["A", "A", "B"]','seen = set()','for customer in records:','    seen.add(customer)','count = len(seen)'],input:'records'},frames:[
 {id:'set-empty',label:'初始化',line:2,text:'输入列表保留三条记录。集合 seen 为空，尚未进入循环。',variables:traceVariables([])},
 {id:'set-select-first',label:'取第一条记录',line:3,cursor:0,text:'循环从列表取出第一个 A，变量 customer 的值为 "A"。',variables:traceVariables([],'A')},
 {id:'set-first',label:'加入 A',line:4,cursor:0,text:'seen.add(customer) 将 A 加入集合，集合中有一个元素。',variables:traceVariables(['A'],'A')},
 {id:'set-select-repeat',label:'取第二条记录',line:3,cursor:1,text:'第二条记录仍为 A。输入位置前进，customer 的值保持不变。',variables:traceVariables(['A'],'A')},
 {id:'set-repeat',label:'再次加入 A',line:4,cursor:1,text:'集合已经包含 A。执行 add 后，集合中的元素保持不变。',variables:traceVariables(['A'],'A')},
 {id:'set-select-second',label:'取第三条记录',line:3,cursor:2,text:'循环取出 B，customer 从 "A" 变为 "B"。',variables:traceVariables(['A'],'B')},
 {id:'set-second',label:'加入 B',line:4,cursor:2,text:'B 加入 seen，集合现在包含 A、B 两个不同的编号。',variables:traceVariables(['A','B'],'B')},
 {id:'set-count',label:'计算去重数',line:5,cursor:2,text:'循环结束，len(seen) 返回 2。count 保存去重后的顾客人数。',variables:traceVariables(['A','B'],'B',2)}
]}};
const prediction=(x:Expression)=>add(mul('slope',x),'intercept');
export const regressionActivity:Block={id:'ml-exploration',type:'exploration',title:'斜率、截距与平方误差',exploration:{kind:'plot',regression:{slope:'slope',intercept:'intercept'},parameters:[{id:'slope',label:'斜率 w',min:0,max:3,step:0.001,value:1},{id:'intercept',label:'截距 b',min:-2,max:2,step:0.001,value:1}],domain:{min:0,max:4,label:'输入 x'},yLabel:'标签与预测值',observations:[{x:1,y:2,label:'A'},{x:2,y:4,label:'B'},{x:3,y:5,label:'C'}],series:[{label:'预测 ŷ = wx + b',expression:prediction('x')}],outputs:[{label:'样本 C 的预测值',expression:prediction(3)}]}};
