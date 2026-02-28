'use client';

import React, { useEffect, useState, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export interface ChartRendererProps {
  rawOptionString: string;
  agentTrace: string;
}

export function ChartRenderer({ rawOptionString, agentTrace }: ChartRendererProps) {
  const [option, setOption] = useState<EChartsOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker for background JSON processing
    try {
      const worker = new Worker('/json-worker.js');

      worker.onmessage = (e) => {
        console.log('[ChartRenderer] Received message from worker:', e.data);

        // Handle ready signal
        if (e.data.type === 'ready') {
          console.log('[ChartRenderer] ✅ Worker initialized and ready');
          return;
        }

        if (e.data.success === true) {
          console.log('[ChartRenderer] ✅ Successfully parsed option');
          console.log('[ChartRenderer] Option data:', e.data.data);
          setOption(e.data.data);
          setError(null);
          setIsLoading(false);
        } else if (e.data.success === false) {
          console.error('[ChartRenderer] ❌ Worker parsing failed:', e.data.error);
          setError(`数据清洗失败: ${e.data.error}`);
          setIsLoading(false);
        }
      };

      worker.onerror = (err) => {
        console.error('[ChartRenderer] ❌ Web Worker error:', err);
        setError('Web Worker 初始化失败，尝试直接解析...');

        // Fallback: try direct parsing
        if (rawOptionString) {
          try {
            const cleanedString = rawOptionString.replace(/```json|```/g, '').trim();
            console.log('[ChartRenderer] Fallback parsing:', cleanedString.substring(0, 200));
            const parsedOption = JSON.parse(cleanedString);
            setOption(parsedOption);
            setError(null);
            setIsLoading(false);
          } catch (fallbackError) {
            console.error('[ChartRenderer] Fallback parse failed:', fallbackError);
            setError('JSON 解析失败，请检查数据格式');
            setIsLoading(false);
          }
        }
      };

      workerRef.current = worker;
    } catch (workerInitError) {
      console.error('[ChartRenderer] Failed to initialize worker:', workerInitError);
      setError('初始化失败');
      setIsLoading(false);
    }

    return () => {
      if (workerRef.current) {
        console.log('[ChartRenderer] Terminating worker');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [rawOptionString]);

  useEffect(() => {
    if (rawOptionString && workerRef.current) {
      setIsLoading(true);
      console.log('[ChartRenderer] Sending data to worker:', {
        length: rawOptionString.length,
        preview: rawOptionString.substring(0, 200) + '...'
      });
      // Send dirty data to background thread for cleaning
      workerRef.current.postMessage({ rawData: rawOptionString });
    }
  }, [rawOptionString]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-sm font-medium">
            {agentTrace ? `AI Agent [${agentTrace}] 正在处理数据...` : '正在清洗数据并渲染图表...'}
          </span>
        </div>
      </div>
    );
  }

  // Error Boundary fallback UI
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 mt-4">
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-medium text-sm">图表渲染失败</div>
            <div className="text-sm mt-1 opacity-90">{error}</div>
            <div className="text-xs mt-2 opacity-75">正在尝试让 AI 重新生成...</div>
          </div>
        </div>
      </div>
    );
  }

  // Success: render the chart
  if (!option) {
    return null;
  }

  return (
    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm mt-4 overflow-hidden">
      {agentTrace && (
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            Generated by AI Agent: <span className="font-medium text-gray-900 dark:text-gray-100">{agentTrace}</span>
          </span>
        </div>
      )}
      <div className="p-4">
        <ReactECharts
          option={option}
          style={{ height: '400px', width: '100%' }}
          opts={{ renderer: 'canvas' }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    </div>
  );
}
