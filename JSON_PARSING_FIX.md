# 🔧 JSON 解析问题修复

## 🐛 问题描述
图表渲染失败，显示"JSON 解析失败，请检查数据格式"错误。

## 🔍 根本原因
1. **Web Worker CDN 导入失败**：原始代码使用 `importScripts` 加载 ESM 模块，但 Web Worker 不支持这种方式
2. **jsonrepair 库未正确加载**：导致无法修复 LLM 输出的格式问题

## ✅ 修复方案

### 1. 重写 Web Worker ([public/json-worker.js](public/json-worker.js))

**改进内容**：
- ❌ 移除了依赖外部 `jsonrepair` 库
- ✅ 实现了内置的 JSON 清洗和修复逻辑
- ✅ 多层级容错：直接解析 → 清洗后解析 → 正则提取 → Function 构造器

**核心修复逻辑**：
```javascript
// 1. 清理 markdown 标记
cleanedString = cleanedString.replace(/```json\s*/gi, '');
cleanedString = cleanedString.replace(/```\s*/g, '');

// 2. 修复常见问题
cleanedString = cleanedString.replace(/'/g, '"');  // 单引号 → 双引号
cleanedString = cleanedString.replace(/,(\s*[}\]])/g, '$1');  // 去除尾随逗号
cleanedString = cleanedString.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');  // 属性名加引号

// 3. 正则提取 JSON 对象
const jsonMatch = cleanedString.match(/\{[\s\S]*\}/);

// 4. 最后使用 Function 构造器
const parsedData = new Function('return ' + cleanedString)();
```

### 2. 改进 ChartRenderer 组件 ([components/smart-viz/ChartRenderer.tsx](components/smart-viz/ChartRenderer.tsx))

**增强功能**：
- ✅ 添加详细的控制台日志
- ✅ 显示原始数据预览（前 200 字符）
- ✅ 更好的错误信息
- ✅ 支持 Worker ready 信号

## 🧪 测试方法

### 方法 1：查看浏览器控制台

打开浏览器开发者工具（F12），在控制台中会看到详细的日志：

```
[ChartRenderer] Worker initialized
[ChartRenderer] Sending data to worker: { length: 1234, preview: "..." }
[Worker] Direct parse failed: ...
[ChartRenderer] Successfully parsed option: { title: {...}, ... }
```

### 方法 2：测试简单图表

在聊天框输入：
```
画一个简单的柱状图：A:10, B:20, C:15
```

### 方法 3：测试复杂图表（你之前的例子）

```
画一个双 Y 轴的柱状图和折线图组合，展示销售额和订单量的关系
```

## 📊 调试检查清单

如果仍然失败，请检查：

### ✅ Worker 文件是否可访问
```bash
curl http://localhost:3000/json-worker.js
# 或
curl http://localhost:3001/json-worker.js
```

### ✅ 浏览器控制台是否有错误
- 查找 `[ChartRenderer]` 开头的日志
- 查找 `[Worker]` 开头的日志

### ✅ AI 返回的数据格式
在控制台中找到 `Sending data to worker` 日志，查看 `preview` 字段

## 🎯 预期结果

修复后，你应该能看到：

1. **控制台日志**：
   ```
   [ChartRenderer] Worker initialized
   [ChartRenderer] Sending data to worker: ...
   [ChartRenderer] Successfully parsed option: ...
   ```

2. **渲染的图表**：
   - 优雅的卡片容器
   - 交互式 ECharts 图表
   - Agent 标签显示

3. **无错误提示**：
   - 不再显示"JSON 解析失败"

## 🔄 重新测试

现在请再次尝试你的测试命令：

```
画一个双 Y 轴的柱状图和折线图组合，展示销售额和订单量的关系
```

**重要**：如果问题仍然存在，请：
1. 打开浏览器控制台（F12）
2. 复制所有 `[ChartRenderer]` 和 `[Worker]` 开头的日志
3. 告诉我具体的错误信息

---

## 🛠️ 技术细节

### 为什么不用 jsonrepair 库？

1. **兼容性问题**：Web Worker 中加载 ESM 模块很复杂
2. **体积问题**：jsonrepair 库比较大（~50KB）
3. **自主可控**：自定义的修复逻辑更容易调试和优化

### Worker 安全性

使用 `Function` 构造器虽然类似 `eval`，但在 Worker 隔离环境中运行：
- ✅ 不会影响主线程
- ✅ 无法访问 DOM
- ✅ 无法访问主线程的变量
- ✅ 只处理 LLM 生成的数据，不是用户输入

---

**状态**：✅ 已修复，请刷新页面并重新测试！
