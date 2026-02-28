// 快速测试脚本 - 验证 generateChart 工具
import { generateChart } from './lib/ai/tools/generate-chart';

// 测试 1: 简单的柱状图配置
const testBarChart = {
  rawOptionString: JSON.stringify({
    title: { text: '销量数据分析' },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['苹果', '香蕉', '橘子']
    },
    yAxis: { type: 'value' },
    series: [{
      name: '销量',
      type: 'bar',
      data: [100, 200, 150],
      itemStyle: {
        color: '#5470c6'
      }
    }]
  }),
  agentTrace: 'DataAnalyzer'
};

// 测试 2: 脏数据（带 markdown 标记）
const testDirtyData = {
  rawOptionString: `\`\`\`json
{
  "title": { "text": "温度变化" },
  "xAxis": { "type": "category", "data": ["周一", "周二", "周三"] },
  "yAxis": { "type": "value" },
  "series": [{
    "name": "温度",
    "type": "line",
    "data": [25, 28, 22]
  }]
}
\`\`\``,
  agentTrace: 'TrendAnalyzer'
};

async function runTests() {
  console.log('🧪 测试 1: 标准 JSON');
  const result1 = await generateChart.execute(testBarChart);
  console.log('✅ Result:', result1);

  console.log('\n🧪 测试 2: 脏数据（带 markdown）');
  const result2 = await generateChart.execute(testDirtyData);
  console.log('✅ Result:', result2);

  console.log('\n✅ 所有测试通过！');
}

runTests().catch(console.error);
