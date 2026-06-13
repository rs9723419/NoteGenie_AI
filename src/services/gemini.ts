import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export async function generateNotes(
  topic: string, 
  details: string, 
  includeDiagrams: boolean,
  fullCode: boolean,
  fromScratch: boolean,
  onProgress: (percent: number) => void, 
  onChunk?: (text: string) => void,
  signal?: AbortSignal
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const parts: any[] = [
      {
        text: `Create comprehensive, deeply researched, and visually appealing educational notes for the topic: "${topic}".
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
        
        Structure the notes to look like a high-quality "cheat sheet" or "study guide".`
      }
    ];

    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    let fullText = "";
    let chunkCount = 0;
    const estimatedChunks = 100; 

    for await (const chunk of response) {
      if (signal?.aborted) {
        throw new Error("AbortError");
      }
      const text = chunk.text;
      if (text) {
        fullText += text;
        chunkCount++;
        const progress = Math.min(Math.round((chunkCount / estimatedChunks) * 100), 99);
        onProgress(progress);
        if (typeof onChunk === 'function') onChunk(fullText);
      }
    }

    onProgress(100);
    return fullText;
  } catch (error) {
    if (error instanceof Error && error.message === "AbortError") {
      throw error;
    }
    console.error("Gemini API Error:", error);
    throw error;
  }
}

export async function generateFlowchartSummary(
  topic: string,
  content: string,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please check your environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const parts: any[] = [
      {
        text: `Create a comprehensive, highly structured 1-page summary flowchart for the topic: "${topic}".
        Use the following content as reference: "${content.substring(0, 10000)}"
        
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
        - Do not include any other text before or after the mermaid block.`
      }
    ];

    const response = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: { parts }
    });

    let fullText = "";
    for await (const chunk of response) {
      if (signal?.aborted) {
        throw new Error("AbortError");
      }
      const text = chunk.text;
      if (text) {
        fullText += text;
      }
    }

    onProgress(100);
    return fullText;
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    throw error;
  }
}
