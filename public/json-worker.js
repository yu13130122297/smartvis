// Web Worker for cleaning and repairing JSON data from LLM responses
// This runs in a background thread to avoid blocking the main UI thread

// Helper function to remove functions from objects (they can't be cloned for postMessage)
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    const value = obj[key];

    // Skip functions - they can't be sent via postMessage
    if (typeof value === 'function') {
      console.log(`[Worker] Removing function at key: ${key}`);
      continue;
    }

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

self.onmessage = function (e) {
  const { rawData } = e.data;

  // Log the raw data for debugging
  console.log('[Worker] Received raw data length:', rawData?.length);

  try {
    // Step 1: Clean common markdown artifacts
    let cleanedString = rawData.trim();

    // Remove markdown code blocks
    cleanedString = cleanedString.replace(/```json\s*/gi, '');
    cleanedString = cleanedString.replace(/```\s*/g, '');

    // Remove leading/trailing whitespace and newlines
    cleanedString = cleanedString.trim();

    // Step 2: Fix common JSON issues
    // Fix single quotes to double quotes (but be careful with content)
    cleanedString = cleanedString.replace(/'/g, '"');

    // Fix trailing commas before closing braces/brackets
    cleanedString = cleanedString.replace(/,(\s*[}\]])/g, '$1');

    // Fix missing quotes around property names
    cleanedString = cleanedString.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

    // Step 3: Try to parse directly (will fail if there are functions)
    try {
      const directParsed = JSON.parse(cleanedString);
      console.log('[Worker] ✅ Direct parse successful!');
      const sanitized = sanitizeObject(directParsed);
      self.postMessage({ success: true, data: sanitized });
      return;
    } catch (directParseError) {
      console.log('[Worker] Direct parse failed (likely contains functions):', directParseError.message);
    }

    // Step 4: If JSON parse failed, it's probably because there are functions
    // Use Function constructor to evaluate, then sanitize
    try {
      console.log('[Worker] Attempting to parse with Function constructor (to handle functions)...');
      const parsedData = new Function('return ' + cleanedString)();

      if (typeof parsedData === 'object' && parsedData !== null) {
        console.log('[Worker] ✅ Function parse successful!');

        // Remove functions before sending (they can't be cloned)
        const sanitized = sanitizeObject(parsedData);
        console.log('[Worker] ✅ Sanitized object (functions removed)');

        self.postMessage({ success: true, data: sanitized });
        return;
      }
    } catch (evalError) {
      console.log('[Worker] ❌ Function parse failed:', evalError.message);
    }

    // Step 5: More aggressive repair - try to extract JSON object
    const jsonMatch = cleanedString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extractedJson = jsonMatch[0];
      try {
        const parsedData = JSON.parse(extractedJson);
        console.log('[Worker] ✅ Extraction parse successful!');
        const sanitized = sanitizeObject(parsedData);
        self.postMessage({ success: true, data: sanitized });
        return;
      } catch (extractError) {
        console.log('[Worker] ❌ Extraction parse failed:', extractError.message);
      }
    }

    // All methods failed
    console.error('[Worker] 💥 All parsing methods failed!');
    throw new Error('无法解析 JSON 数据');

  } catch (err) {
    console.error('[Worker] All repair methods failed:', err);
    self.postMessage({
      success: false,
      error: err.message || 'JSON 解析失败'
    });
  }
};

// Send ready signal
console.log('[Worker] Worker initialized and ready');
self.postMessage({ type: 'ready' });


