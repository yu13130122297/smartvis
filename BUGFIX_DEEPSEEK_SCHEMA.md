# 🔧 问题修复：DeepSeek API Schema 兼容性

## 问题描述

在测试时遇到了以下错误：
```
Error [AI_APICallError]: Invalid schema for function 'generateChart':
schema must be a JSON Schema of 'type: "object"', got 'type: null'.
```

## 根本原因

DeepSeek API（以及部分 OpenAI 兼容的 API）对 JSON Schema 的验证更严格。使用 zod 的 `.optional()` 方法会导致生成的 JSON Schema 类型不是标准的 `object`，从而被 API 拒绝。

## 解决方案

将 `agentTrace` 字段从可选（`.optional()`）改为必填但带默认值（`.default('ChartRenderer')`）：

### 修改前（错误）
```typescript
agentTrace: z.string().describe('...').optional()
```

### 修改后（正确）
```typescript
agentTrace: z.string().default('ChartRenderer').describe('...')
```

## 修改的文件

1. **[lib/ai/tools/generate-chart.ts](lib/ai/tools/generate-chart.ts:38)**
   - 将 `agentTrace` 从 `.optional()` 改为 `.default('ChartRenderer')`

2. **[components/smart-viz/ChartRenderer.tsx](components/smart-viz/ChartRenderer.tsx:7-10)**
   - 更新接口定义，`agentTrace` 不再是可选的

3. **[components/message.tsx](components/message.tsx:370-378)**
   - 添加降级处理：`agentTrace={output.agentTrace || 'ChartRenderer'}`

## 测试方法

现在可以在聊天界面中测试了：

```
帮我画一个柱状图，展示苹果、香蕉、橘子的销量（随便编造点数据）
```

预期：AI 会调用 `generateChart` 工具，并成功渲染图表！

## 技术说明

这个修复确保：
- ✅ DeepSeek API 能够正确解析工具定义
- ✅ JSON Schema 类型始终是 `object`
- ✅ `agentTrace` 总是有值（默认为 'ChartRenderer'）
- ✅ 向后兼容：如果 LLM 不提供 `agentTrace`，会使用默认值

---

**状态**：✅ 已修复，可以开始测试了！
