# 智能数据可视化功能 - 使用说明

## 🎯 功能概述

我们成功为 vercel/ai-chatbot 添加了**智能数据可视化**功能！这是一个完整的 LUI (Language User Interface) 集成，包含：

- ✅ **后端工具**：`generateChart` AI 工具，让大模型能够生成图表
- ✅ **双重容错管线**：Web Worker + Error Boundary 确保稳定性
- ✅ **LUI 融合**：在聊天界面中无缝渲染 ECharts 图表

---

## 📁 项目结构

```
smart-viz/
├── app/(chat)/api/chat/route.ts          # ✅ 后端路由（新增 generateChart 工具）
├── lib/
│   ├── ai/
│   │   └── tools/
│   │       └── generate-chart.ts         # ✅ 新增：图表生成工具
│   └── types.ts                          # ✅ 更新：添加 generateChart 类型
├── components/
│   ├── smart-viz/
│   │   ├── ChartRenderer.tsx             # ✅ 新增：容错图表渲染组件
│   │   └── index.ts                      # ✅ 新增：导出文件
│   └── message.tsx                       # ✅ 更新：集成图表渲染
└── public/
    └── json-worker.js                    # ✅ 新增：Web Worker 清洗脏数据
```

---

## 🚀 快速测试

### 1. 确保服务器运行

```bash
pnpm dev
```

### 2. 在聊天框中输入以下测试命令

#### 测试 1：简单柱状图
```
帮我画一个柱状图，展示苹果、香蕉、橘子的销量（随便编造点数据）
```

#### 测试 2：折线图（趋势分析）
```
绘制一个折线图，显示 2024 年 1-6 月的用户增长趋势，数据可以随机生成
```

#### 测试 3：饼图
```
可视化这些数据：iOS 45%, Android 35%, Web 20%，用饼图展示
```

#### 测试 4：多系列图表
```
画一个双 Y 轴的柱状图和折线图组合，展示销售额和订单量的关系
```

---

## 🧪 预期效果

当你输入上述命令后，你会看到：

1. **流式 Agent 提示**
   ```
   🔄 AI Agent [ChartRenderer] 正在分析数据...
   ```

2. **图表渲染**
   - 背景：白色/深色主题自适应
   - 边框：优雅的圆角边框
   - 标题：显示 AI Agent 名称
   - 图表：完整的 ECharts 交互式图表

3. **容错处理**（如果 JSON 格式错误）
   ```
   ❌ 图表渲染失败：数据清洗失败
   正在尝试让 AI 重新生成...
   ```

---

## 🔧 核心技术亮点

### 1. **Web Worker 容错管线**
   - 在后台线程中清洗大模型输出的脏数据
   - 支持修复 Markdown 代码块、缺失括号等常见错误
   - 不阻塞主线程，保持 UI 流畅

### 2. **Error Boundary**
   - 多层级容错：Worker 失败 → 降级到主线程解析
   - 优雅的错误提示，不会导致页面崩溃

### 3. **类型安全**
   - 完整的 TypeScript 类型定义
   - 与 Vercel AI SDK 深度集成

---

## 📝 自定义与扩展

### 扩展 1：接入真实后端
编辑 [lib/ai/tools/generate-chart.ts](lib/ai/tools/generate-chart.ts:34-46)，将 `execute` 函数改为调用你的 Python/Java 多智能体接口：

```typescript
execute: async ({ rawOptionString, agentTrace }) => {
  // 调用你的后端 API
  const response = await fetch('https://your-backend.com/analyze', {
    method: 'POST',
    body: JSON.stringify({ rawOptionString, agentTrace }),
  });

  const result = await response.json();
  return result;
},
```

### 扩展 2：添加更多图表类型
在提示词中引导大模型生成不同类型的图表：
- `type: 'scatter'` - 散点图
- `type: 'radar'` - 雷达图
- `type: 'heatmap'` - 热力图
- `type: 'graph'` - 关系图

### 扩展 3：自定义样式
编辑 [components/smart-viz/ChartRenderer.tsx](components/smart-viz/ChartRenderer.tsx:102-113)，修改容器样式和主题。

---

## 🐛 故障排除

### 问题 1：图表不显示
**原因**：可能是大模型返回的 JSON 格式错误
**解决**：查看浏览器控制台，Worker 会打印错误信息

### 问题 2：Web Worker 报错
**原因**：CDN 加载失败或浏览器不支持 Worker
**解决**：组件会自动降级到主线程解析

### 问题 3：TypeScript 编译错误
**原因**：类型定义不完整
**解决**：确保 [lib/types.ts](lib/types.ts) 包含 `generateChart` 类型

---

## 🎨 设计理念

这个实现遵循以下设计原则：

1. **渐进增强**：基础功能（文本对话）不受影响，图表是额外增强
2. **容错优先**：多层级容错，确保即使 AI 输出格式错误也不会崩溃
3. **性能优化**：Web Worker 避免阻塞主线程，保持 UI 响应
4. **用户体验**：流式加载状态 + 优雅的错误提示
5. **可扩展性**：架构设计支持接入任意后端多智能体系统

---

## 📊 示例 Prompt

以下是一些推荐的测试 prompt：

```markdown
1. 帮我分析这些数据并生成图表：北京 100, 上海 200, 深圳 150, 广州 120
2. 画一个折线图显示温度变化：周一 25°C, 周二 28°C, 周三 22°C, 周四 26°C
3. 用饼图展示市场份额：产品 A 40%, 产品 B 30%, 产品 C 20%, 其他 10%
4. 生成一个堆叠柱状图，展示各部门的预算分配情况
5. 绘制雷达图，对比我们产品和竞品在五个维度上的表现
```

---

## 🚀 下一步优化方向

1. **数据持久化**：保存用户生成的图表到数据库
2. **图表编辑**：允许用户对生成的图表进行微调
3. **导出功能**：支持导出为 PNG/SVG/PDF
4. **模板库**：预置常见图表模板
5. **多智能体编排**：接入真实的 Agent 系统（DataAnalyzer + ChartRenderer + InsightGenerator）

---

## 📚 相关文档

- [ECharts 配置项手册](https://echarts.apache.org/zh/option.html)
- [Vercel AI SDK - Tool Calling](https://sdk.vercel.ai/docs/ai-sdk-ui/chatbot)
- [Web Workers MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

---

## ✅ 完成清单

- [x] 安装依赖 (echarts, echarts-for-react, jsonrepair)
- [x] 创建 Web Worker 脚本
- [x] 创建容错图表渲染组件
- [x] 添加后端 generateChart 工具
- [x] 更新类型定义
- [x] 集成到消息渲染组件
- [ ] 生产环境测试
- [ ] 性能优化
- [ ] 用户文档

---

🎉 **恭喜！你的智能数据可视化功能已经完成！** 现在可以开始测试了！
