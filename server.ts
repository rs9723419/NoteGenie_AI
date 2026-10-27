import { generateOfflineNotes, generateOfflineFlowchartSummary } from './src/services/offlineGenerator';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing. Please configure your API key in Settings > Secrets.');
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function isQuotaOrRateLimitError(error: any): boolean {
  if (!error) return false;
  if (error.status === 429 || error.code === 429 || error.statusCode === 429) return true;
  let msg = typeof error === 'string' ? error : (error.message || '');
  if (error.error) {
    msg += ' ' + (typeof error.error === 'string' ? error.error : JSON.stringify(error.error));
  }
  try {
    msg += ' ' + JSON.stringify(error);
  } catch {}
  const lower = msg.toLowerCase();
  return (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('too many requests') || lower.includes('high demand') || lower.includes('spikes in demand') || lower.includes('overloaded') || lower.includes('503') || lower.includes('temporarily')
  );
}

function parseAndCleanErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  let msg = typeof error === 'string' ? error : (error.message || String(error));

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

  if (isQuotaOrRateLimitError(msg) || isQuotaOrRateLimitError(error)) {
    return 'Gemini API quota or rate limit exceeded (429 Too Many Requests). The system attempted a fallback model. Please wait a moment and try again, or check your rate limits at ai.google.dev.';
  }

  return msg;
}

// POST /api/gemini/generate-notes
app.post('/api/gemini/generate-notes', async (req, res) => {
  const { topic, details = '', includeDiagrams = false, fullCode = false, fromScratch = false } = req.body;

  if (!topic || typeof topic !== 'string') {
    return res.status(400).json({ error: 'Topic is required.' });
  }

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch (err: any) {
    return res.status(500).json({ error: parseAndCleanErrorMessage(err) });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  const promptText = `Create comprehensive, deeply researched, and visually appealing educational notes for the topic: "${topic}".
Additional Context/Details provided by user: "${details}"

RESEARCH INSTRUCTIONS:
- Use Google Search to find the most accurate, up-to-date, and detailed information about "${topic}".
- Deeply analyze the topic, including its history, core principles, advanced concepts, and real-world applications.
- If "${details}" contains specific sub-topics, ensure they are explored in depth.

Style Guidelines (CRITICAL):
- Style: Clean, modern educational handout style with a "hand-drawn" aesthetic.
- Tone: Informative, professional yet accessible, and visually oriented.

CODE & LOGIC INSTRUCTIONS:
${fullCode 
  ? "- Provide FULL, complete, and production-ready code implementations for all programming concepts. Ensure the code is well-commented and ready to run." 
  : "- CRITICAL: Do NOT provide full code blocks. Instead, focus on explaining the LOGIC, ARCHITECTURE, and CONCEPTS behind the code. Use pseudocode or very small snippets to illustrate points, but prioritize the 'how' and 'why' of the logic."}

${fromScratch ? `
FROM SCRATCH INSTRUCTIONS (CRITICAL):
- Provide a complete, standalone "from scratch" implementation.
- Include all necessary boilerplate, imports, and configuration.
- SEPARATE each module or topic into its own distinct code block.
- Use filenames or clear labels as titles for each code block (e.g., "File: main.py", "Module: database.js").
- Do NOT mash up all topics into a single code block; keep them modular and separate.
` : ''}

- Use bullet points with checkmarks (✓) for lists.
- Use "H1" for the main title (e.g., Chapter X: Topic).
- Use "H2" for major sections.
- Use "H3" for sub-sections.
- Use Blockquotes (> ) for "Important Definitions" or "Key Concepts".
- Use Code blocks (\` \`) for formulas, code snippets, or step-by-step procedures.
- IMPORTANT: Use colorful boxes extensively to highlight different types of information.
- Use the following syntax for boxes:
  - [YELLOW_BOX] **Definition/Concept:** ... [/YELLOW_BOX]
  - [GREEN_BOX] **Examples/Use Cases:** ... [/GREEN_BOX]
  - [BLUE_BOX] **Technical Details/Syntax:** ... [/BLUE_BOX]
  - [RED_BOX] **Critical Warning/Common Errors:** ... [/RED_BOX]
  - [PURPLE_BOX] **Summary/Key Takeaways:** ... [/PURPLE_BOX]
  - [ORANGE_BOX] **Pro-Tip/Memory Trick:** ... [/ORANGE_BOX]
  - [TEAL_BOX] **Related Topics/Resources:** ... [/TEAL_BOX]
- CRITICAL: NEVER leave a box empty. Every box MUST contain meaningful content.
- Minimize fluff text: Use short, punchy sentences, bold keywords, and clear spacing.
- Include a "Key Takeaways" section at the end.

${includeDiagrams ? `
DIAGRAM INSTRUCTIONS (STRICT MERMAID 11.13.0 RULES):
- You MUST include at least one visual diagram using Mermaid.js syntax.
- Use "graph TD" or "graph LR".
- THE 3 GOLDEN RULES FOR MERMAID:
  1. USE EXPLICIT IDs: Every node MUST have a short, alphanumeric ID (e.g., A, B, Step1). NEVER use the note text as the ID.
  2. SEPARATE IDs FROM LABELS: Always use the bracket format: ID["Label"].
     - CORRECT: Step1["Set Low=0, High=N-1"]
     - INCORRECT: "Set Low=0, High=N-1"
  3. ARROW SPACING: NEVER put a quote directly after an arrow. Always have an ID first.
     - CORRECT: Start --> Step1
     - INCORRECT: Start --> "Init"
- MANDATORY QUOTING: Every single node label MUST be wrapped in double quotes.
  - CORRECT: A["My Label"]
- NO NESTED QUOTES: NEVER use double quotes (") inside a label. If you need quotes, use single quotes (').
  - INCORRECT: A["User says "Hello""]
  - CORRECT: A["User says 'Hello'"]
- NO BRACKETS IN LABELS: Strictly forbid the use of [ or ] inside labels, even inside double quotes. They break the Mermaid parser. Replace them with ( ) or ' '.
  - INCORRECT: A["Array[i]"]
  - CORRECT: A["Array(i)"] or A["Array'i'"]
- SPECIAL CHARACTERS: Avoid using ( ) inside labels if possible, but if used, they MUST be inside double quotes.
- CLEAN START: Ensure there are no leading line breaks or spaces at the very beginning of the mermaid code block.
- REPAIR INSTRUCTION: Before outputting, mentally verify every line. If a line violates these rules, you MUST rewrite it. If you detect a syntax error in your own output, immediately re-output the corrected raw Mermaid block.

OPTIMIZATION GUIDELINES:
- **Hierarchical Structure:** Use a clear top-down or left-to-right flow.
- **Subgraphs:** Use subgraphs to group related concepts if the diagram is complex.
- **Diverse Node Shapes:** Use different shapes for different types of information (e.g., \`Main(("Core"))\`, \`Process["Step"]\`, \`Decision{"Check"}\`).
- **CRITICAL:** Do NOT put a space between the shape braces and the label quotes.
  - Example: Node{{"Label"}}
- **Edge Labels:** Use labels on arrows to explain the relationship between nodes.

Use the following format for diagrams:
  \`\`\`mermaid
  graph TD
    A["Start (Initial)"] -->|Step 1| B("Process [Step 1]")
    B -->|Check| C{"Decision {Check}"}
    C -->|Yes| D["Result 1 <b>Bold</b>"]
    C -->|No| E["Result 2"]
  \`\`\`
- Ensure the diagram is relevant to "${topic}" and helps explain complex relationships or flows.
- Keep diagrams simple, clear, and educational.
` : ''}

Structure the notes to look like a high-quality "cheat sheet" or "study guide".`;

  const primaryConfig = {
    model: 'gemini-3.8-flash',
    contents: { parts: [{ text: promptText }] },
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  };

  const fallbackConfig = {
    model: 'gemini-3.1-flash-lite',
    contents: { parts: [{ text: promptText }] },
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  };

  let fullText = '';
  let chunkCount = 0;
  const estimatedChunks = 100;

  try {
    let stream: any;
    let modelUsed = primaryConfig.model;

    try {
      stream = await ai.models.generateContentStream(primaryConfig);
    } catch (initErr: any) {
      if (isQuotaOrRateLimitError(initErr)) {
        console.warn(`Primary model ${primaryConfig.model} quota exceeded on init. Falling back to ${fallbackConfig.model}...`);
        await new Promise((r) => setTimeout(r, 1000));
        stream = await ai.models.generateContentStream(fallbackConfig);
        modelUsed = fallbackConfig.model;
      } else {
        throw initErr;
      }
    }

    try {
      for await (const chunk of stream) {
        if (aborted) break;
        const text = chunk.text;
        if (text) {
          fullText += text;
          chunkCount++;
          const progress = Math.min(Math.round((chunkCount / estimatedChunks) * 100), 99);
          res.write(`data: ${JSON.stringify({ type: 'chunk', text, fullText, progress, model: modelUsed })}\n\n`);
        }
      }
    } catch (streamErr: any) {
      if (chunkCount === 0 && isQuotaOrRateLimitError(streamErr) && modelUsed !== fallbackConfig.model) {
        console.warn(`Primary model ${modelUsed} stream hit quota limit on first chunk. Retrying with fallback ${fallbackConfig.model}...`);
        await new Promise((r) => setTimeout(r, 1200));
        const fallbackStream = await ai.models.generateContentStream(fallbackConfig);
        modelUsed = fallbackConfig.model;
        for await (const chunk of fallbackStream) {
          if (aborted) break;
          const text = chunk.text;
          if (text) {
            fullText += text;
            chunkCount++;
            const progress = Math.min(Math.round((chunkCount / estimatedChunks) * 100), 99);
            res.write(`data: ${JSON.stringify({ type: 'chunk', text, fullText, progress, model: modelUsed })}\n\n`);
          }
        }
      } else {
        throw streamErr;
      }
    }

    if (!aborted) {
      res.write(`data: ${JSON.stringify({ type: 'done', fullText, progress: 100, model: modelUsed })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    const cleanMsg = parseAndCleanErrorMessage(error);
    console.warn('Gemini generate-notes error (attempting offline fallback):', cleanMsg);
    if (isQuotaOrRateLimitError(error) || isQuotaOrRateLimitError(cleanMsg) || cleanMsg.includes("429") || cleanMsg.toLowerCase().includes("quota")) {
      try {
        console.log('Streaming offline structured notes due to quota exhaustion...');
        const offlineText = await generateOfflineNotes({
          topic,
          details,
          includeDiagrams,
          fullCode,
          fromScratch,
        });
        if (!aborted) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: offlineText, fullText: offlineText, progress: 95, isOffline: true })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'done', fullText: offlineText, progress: 100, isOffline: true })}\n\n`);
          res.end();
          return;
        }
      } catch (fallbackErr) {
        console.error('Server offline fallback error details:', fallbackErr && (fallbackErr.stack || fallbackErr.message || fallbackErr));
      }
    }
    if (!res.headersSent) {
      res.status(isQuotaOrRateLimitError(error) ? 429 : 500).json({ error: cleanMsg });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: cleanMsg })}\n\n`);
      res.end();
    }
  }
});

// POST /api/gemini/generate-flowchart
app.post('/api/gemini/generate-flowchart', async (req, res) => {
  const { topic, content } = req.body;

  if (!topic || !content) {
    return res.status(400).json({ error: 'Topic and content are required.' });
  }

  let ai: GoogleGenAI;
  try {
    ai = getGeminiClient();
  } catch (err: any) {
    return res.status(500).json({ error: parseAndCleanErrorMessage(err) });
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  let aborted = false;
  req.on('close', () => {
    aborted = true;
  });

  const promptText = `Create a comprehensive, highly structured 1-page summary flowchart for the topic: "${topic}".
Use the following content as reference: "${String(content).substring(0, 10000)}"

INSTRUCTIONS (STRICT MERMAID 11.13.0 RULES):
- You MUST output ONLY a single Mermaid.js flowchart.
- Use "graph TD" for the layout.
- THE 3 GOLDEN RULES FOR MERMAID:
  1. USE EXPLICIT IDs: Every node MUST have a short, alphanumeric ID (e.g., A, B, Step1). NEVER use the note text as the ID.
  2. SEPARATE IDs FROM LABELS: Always use the bracket format: ID["Label"].
     - CORRECT: Step1["Set Low=0, High=N-1"]
     - INCORRECT: "Set Low=0, High=N-1"
  3. ARROW SPACING: NEVER put a quote directly after an arrow. Always have an ID first.
     - CORRECT: Start --> Step1
     - INCORRECT: Start --> "Init"
- MANDATORY QUOTING: Every single node label MUST be wrapped in double quotes.
  - Example: A["Label with (parentheses)"]
- NO NESTED QUOTES: NEVER use double quotes (") inside a label. Use single quotes (') instead.
  - INCORRECT: A["Value is "42""]
  - CORRECT: A["Value is '42'"]
- NO BRACKETS IN LABELS: Strictly forbid the use of [ or ] inside labels, even inside double quotes. They break the Mermaid parser. Replace them with ( ) or ' '.
  - INCORRECT: A["Compare Arr[Mid]"]
  - CORRECT: A["Compare Arr(Mid)"]
- CLEAN START: Ensure there are no leading line breaks or spaces at the very beginning of the mermaid code block.
- REPAIR INSTRUCTION: Before outputting, mentally verify every line. If a line violates these rules, you MUST rewrite it.

OPTIMIZATION GUIDELINES:
- **Hierarchical Structure:** Start with the main topic at the top, branching into major pillars, then into specific details or applications.
- **Subgraphs:** Use subgraphs to logically group related concepts (e.g., "Core Principles", "Applications", "Historical Context").
- **Diverse Node Shapes:**
  - Use double-circle or rounded nodes for the main topic: \`Main(("Topic"))\`
  - Use rectangular nodes for major pillars: \`Pillar["Major Concept"]\`
  - Use diamond nodes for decisions or branches: \`Branch{"Condition?"}\`
  - Use hexagon nodes for key facts or definitions: \`Fact{{"Important Detail"}}\`
- **CRITICAL:** Do NOT put a space between the shape braces and the label quotes.
  - INCORRECT: Fact{{ "Label" }}
  - CORRECT: Fact{{"Label"}}
- **Styling:** Add a few style classes at the end of the mermaid block to highlight key sections (e.g., \`classDef highlight fill:#f9f,stroke:#333,stroke-width:4px\`).
- **Edge Labels:** Use descriptive labels on arrows to explain relationships (e.g., \`A -->|leads to| B\`).
- **Density:** Ensure the flowchart is dense with information but remains readable. It should serve as a complete visual "cheat sheet".

Format the output EXACTLY as:
\`\`\`mermaid
graph TD
  ...
\`\`\`
- Do not include any other text before or after the mermaid block.`;

  const primaryConfig = {
    model: 'gemini-3.8-flash',
    contents: { parts: [{ text: promptText }] },
  };

  const fallbackConfig = {
    model: 'gemini-3.1-flash-lite',
    contents: { parts: [{ text: promptText }] },
  };

  let fullText = '';
  let chunkCount = 0;
  const estimatedChunks = 50;

  try {
    let stream: any;
    let modelUsed = primaryConfig.model;

    try {
      stream = await ai.models.generateContentStream(primaryConfig);
    } catch (initErr: any) {
      if (isQuotaOrRateLimitError(initErr)) {
        console.warn(`Primary flowchart model ${primaryConfig.model} quota exceeded on init. Falling back to ${fallbackConfig.model}...`);
        await new Promise((r) => setTimeout(r, 1000));
        stream = await ai.models.generateContentStream(fallbackConfig);
        modelUsed = fallbackConfig.model;
      } else {
        throw initErr;
      }
    }

    try {
      for await (const chunk of stream) {
        if (aborted) break;
        const text = chunk.text;
        if (text) {
          fullText += text;
          chunkCount++;
          const progress = Math.min(Math.round((chunkCount / estimatedChunks) * 100), 99);
          res.write(`data: ${JSON.stringify({ type: 'chunk', text, fullText, progress, model: modelUsed })}\n\n`);
        }
      }
    } catch (streamErr: any) {
      if (chunkCount === 0 && isQuotaOrRateLimitError(streamErr) && modelUsed !== fallbackConfig.model) {
        console.warn(`Primary flowchart model ${modelUsed} stream hit quota limit on first chunk. Retrying with fallback ${fallbackConfig.model}...`);
        await new Promise((r) => setTimeout(r, 1200));
        const fallbackStream = await ai.models.generateContentStream(fallbackConfig);
        modelUsed = fallbackConfig.model;
        for await (const chunk of fallbackStream) {
          if (aborted) break;
          const text = chunk.text;
          if (text) {
            fullText += text;
            chunkCount++;
            const progress = Math.min(Math.round((chunkCount / estimatedChunks) * 100), 99);
            res.write(`data: ${JSON.stringify({ type: 'chunk', text, fullText, progress, model: modelUsed })}\n\n`);
          }
        }
      } else {
        throw streamErr;
      }
    }

    if (!aborted) {
      res.write(`data: ${JSON.stringify({ type: 'done', fullText, progress: 100, model: modelUsed })}\n\n`);
      res.end();
    }
  } catch (error: any) {
    const cleanMsg = parseAndCleanErrorMessage(error);
    console.warn('Gemini generate-flowchart error (attempting offline fallback):', cleanMsg);
    if (isQuotaOrRateLimitError(error)) {
      try {
        console.log('Streaming offline flowchart due to quota exhaustion...');
        const offlineFlowchart = await generateOfflineFlowchartSummary(topic, content);
        if (!aborted) {
          res.write(`data: ${JSON.stringify({ type: 'chunk', text: offlineFlowchart, fullText: offlineFlowchart, progress: 95, isOffline: true })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'done', fullText: offlineFlowchart, progress: 100, isOffline: true })}\n\n`);
          res.end();
          return;
        }
      } catch (fallbackErr) {
        console.error('Server offline flowchart fallback error:', fallbackErr);
      }
    }
    if (!res.headersSent) {
      res.status(isQuotaOrRateLimitError(error) ? 429 : 500).json({ error: cleanMsg });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: cleanMsg })}\n\n`);
      res.end();
    }
  }
});

// Server initialization & frontend handling
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
