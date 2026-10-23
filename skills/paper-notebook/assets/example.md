# 复利：每一期的增长基础
## 恒定增长率
### 从一期到两期
期间无额外存取，每期增长率保持 10%。初始金额为 100 元。

```notebook-block
{"id":"growth-rule","type":"prose","text":"每期的期末金额，成为下一期的增长基础。","study":{"marks":[{"kind":"circle","text":"下一期的增长基础"}]}}
```

```notebook-block
{"id":"growth-formula","type":"formula","latex":"P_n=P_0(1+r)^n","text":"P₀ 是初始金额，r 是每期增长率，n 是期数。","study":{"visual":"blackboard"}}
```

```notebook-block
{"id":"growth-worked","type":"example","title":"两期后有多少？","prompt":"初始 100 元，每期增长 10%，计算两期期末金额。","steps":[{"id":"growth-step-1","text":"第一期期末：100 × 1.1 = 110 元。"},{"id":"growth-step-2","text":"第二期期末：110 × 1.1 = 121 元。"}],"result":"累计增长：121 − 100 = 21 元。"}
```

### 从金额看递推关系
```notebook-block
{"id":"growth-diagram","type":"diagram","nodes":[{"id":"g0","label":"100 元"},{"id":"g1","label":"110 元"},{"id":"g2","label":"121 元"}],"edges":[{"from":"g0","to":"g1","label":"× 1.1"},{"from":"g1","to":"g2","label":"× 1.1"}],"caption":"每一期都以前一期的期末金额为基础。"}
```
