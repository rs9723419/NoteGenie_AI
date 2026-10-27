import { generateOfflineNotes, generateOfflineFlowchartSummary } from './offlineGenerator';

let lastGenerationWasOffline = false;

export function getLastGenerationWasOffline(): boolean {
  return lastGenerationWasOffline;
}

export function setLastGenerationWasOffline(val: boolean): void {
  lastGenerationWasOffline = val;
}

function cleanErrorMessage(raw: any): string {
  if (!raw) return 'An unexpected error occurred.';
  let msg = typeof raw === 'string' ? raw : (raw.message || String(raw));
  
  for (let i = 0; i < 5; i++) {
    const trimmed = typeof msg === 'string' ? msg.trim() : '';
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('Error: {') && trimmed.endsWith('}'))) {
      try {
        const jsonStr = trimmed.startsWith('Error: ') ? trimmed.slice(7) : trimmed;
        const parsed = JSON.parse(jsonStr);
        if (parsed?.error?.message) {
          msg = parsed.error.message;
        } else if (parsed?.message) {
          msg = parsed.message;
        } else {
          break;
        }
      } catch {
        break;
      }
    } else {
      break;
    }
  }

  const lower = typeof msg === 'string' ? msg.toLowerCase() : '';
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429') || lower.includes('resource_exhausted')) {
    return 'Gemini API quota or rate limit exceeded (429). Please wait a moment before trying again.';
  }

  return msg;
}

export function isQuotaOrRateLimitError(err: any): boolean {
  if (!err) return false;
  if (err.status === 429 || err.code === 429) return true;
  const msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
  const lower = msg.toLowerCase();
  return (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('too many requests') || lower.includes('high demand') || lower.includes('spikes in demand') || lower.includes('overloaded') || lower.includes('503') || lower.includes('temporarily')
  );
}

export async function generateNotes(
  topic: string, 
  details: string, 
  includeDiagrams: boolean,
  fullCode: boolean,
  fromScratch: boolean,
  onProgress: (percent: number) => void, 
  onChunk?: (text: string) => void,
  signal?: AbortSignal,
  onOfflineFallback?: () => void
): Promise<string> {
  lastGenerationWasOffline = false;

  const runOfflineFallback = async (reason: string): Promise<string> => {
    console.warn(`[Gemini Service] Triggering offline note generation due to: ${reason}`);
    lastGenerationWasOffline = true;
    onOfflineFallback?.();
    return generateOfflineNotes({
      topic,
      details,
      includeDiagrams,
      fullCode,
      fromScratch,
      onProgress,
      onChunk
    });
  };

  try {
    const response = await fetch('/api/gemini/generate-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        details,
        includeDiagrams,
        fullCode,
        fromScratch,
      }),
      signal,
    });

    if (!response.ok) {
      let errorMsg = `Generation failed (${response.status})`;
      try {
        const errData = await response.json();
        if (errData.error) errorMsg = cleanErrorMessage(errData.error);
      } catch {
        // response body was not JSON
      }

      if (response.status === 429 || isQuotaOrRateLimitError(errorMsg)) {
        return await runOfflineFallback(errorMsg);
      }

      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream is not supported in this environment.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        throw new Error('AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        const data = JSON.parse(dataStr);

        if (data.isOffline) {
          lastGenerationWasOffline = true;
          onOfflineFallback?.();
        }

        if (data.type === 'chunk') {
          if (typeof data.progress === 'number') {
            onProgress(data.progress);
          }
          if (typeof data.fullText === 'string') {
            fullText = data.fullText;
            if (typeof onChunk === 'function') {
              onChunk(fullText);
            }
          }
        } else if (data.type === 'done') {
          if (typeof data.fullText === 'string') {
            fullText = data.fullText;
          }
          onProgress(100);
          if (typeof onChunk === 'function') {
            onChunk(fullText);
          }
        } else if (data.type === 'error') {
          const rawErr = data.error || 'Notes generation failed.';
          if (isQuotaOrRateLimitError(rawErr)) {
            return await runOfflineFallback(rawErr);
          }
          throw new Error(cleanErrorMessage(rawErr));
        }
      }
    }

    onProgress(100);
    return fullText;

  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new Error('AbortError');
    }
    if (isQuotaOrRateLimitError(error)) {
      return await runOfflineFallback(error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
}

export async function generateFlowchartSummary(
  topic: string,
  content: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
  onOfflineFallback?: () => void
): Promise<string> {
  const runOfflineSummaryFallback = async (reason: string): Promise<string> => {
    console.warn(`[Gemini Service] Triggering offline flowchart summary due to: ${reason}`);
    onOfflineFallback?.();
    return generateOfflineFlowchartSummary(topic, content, onProgress);
  };

  try {
    const response = await fetch('/api/gemini/generate-flowchart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        content,
      }),
      signal,
    });

    if (!response.ok) {
      let errorMsg = `Summary generation failed (${response.status})`;
      try {
        const errData = await response.json();
        if (errData.error) errorMsg = cleanErrorMessage(errData.error);
      } catch {
        // response body was not JSON
      }

      if (response.status === 429 || isQuotaOrRateLimitError(errorMsg)) {
        return await runOfflineSummaryFallback(errorMsg);
      }

      throw new Error(errorMsg);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ReadableStream is not supported in this environment.');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        throw new Error('AbortError');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (!dataStr) continue;

        const data = JSON.parse(dataStr);

        if (data.type === 'chunk') {
          if (typeof data.progress === 'number') {
            onProgress(data.progress);
          }
          if (typeof data.fullText === 'string') {
            fullText = data.fullText;
          }
        } else if (data.type === 'done') {
          if (typeof data.fullText === 'string') {
            fullText = data.fullText;
          }
          onProgress(100);
        } else if (data.type === 'error') {
          const rawErr = data.error || 'Flowchart summary generation failed.';
          if (isQuotaOrRateLimitError(rawErr)) {
            return await runOfflineSummaryFallback(rawErr);
          }
          throw new Error(cleanErrorMessage(rawErr));
        }
      }
    }

    onProgress(100);
    return fullText;

  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) {
      throw new Error('AbortError');
    }
    if (isQuotaOrRateLimitError(error)) {
      return await runOfflineSummaryFallback(error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
}
