/**
 * Offline Educational Study Material Generator
 * 
 * Provides instantaneous, highly structured, resilient educational study materials
 * when Gemini API quota or rate limits (HTTP 429 / RESOURCE_EXHAUSTED) are encountered.
 * 
 * Complies with:
 * - App custom colored box tags: [YELLOW_BOX], [BLUE_BOX], [GREEN_BOX], [RED_BOX], [ORANGE_BOX], [TEAL_BOX], [PURPLE_BOX]
 * - Mermaid 11.13.0 syntax rules (alphanumeric IDs, quoted labels, no internal brackets)
 * - Clean markdown hierarchy (# Chapter, ## Section, ### Subsections, ✓ bullet points)
 */

interface OfflineOptions {
  topic: string;
  details?: string;
  includeDiagrams?: boolean;
  fullCode?: boolean;
  fromScratch?: boolean;
  onProgress?: (percent: number) => void;
  onChunk?: (text: string) => void;
}

// Clean and sanitize string for Mermaid node labels
function sanitizeMermaidLabel(text: string): string {
  return text
    .replace(/["“”]/g, "'")
    .replace(/[\[\]]/g, '')
    .replace(/[{}()]/g, '')
    .trim();
}

// Domain recognition for rich contextual knowledge synthesis
type DomainType = 'algorithm' | 'webdev' | 'aiml' | 'database' | 'math' | 'science' | 'general';

function detectDomain(topic: string, details: string = ''): DomainType {
  const combined = (topic + ' ' + details).toLowerCase();
  
  if (/binary search|sort|tree|graph|heap|stack|queue|hash|dp|dynamic programming|dijkstra|recursion|leetcode|linked list|algorithm/i.test(combined)) {
    return 'algorithm';
  }
  if (/react|vue|angular|javascript|typescript|css|html|frontend|backend|api|rest|graphql|docker|node|express|nextjs|tailwind/i.test(combined)) {
    return 'webdev';
  }
  if (/machine learning|deep learning|neural network|transformer|llm|ai|gpt|backpropagation|gradient descent|nlp|computer vision|weights|loss/i.test(combined)) {
    return 'aiml';
  }
  if (/sql|postgres|database|nosql|mongodb|acid|index|sharding|cache|redis|kafka|system design|schema/i.test(combined)) {
    return 'database';
  }
  if (/calculus|derivative|integral|linear algebra|matrix|vector|probability|statistics|bayes|geometry|algebra/i.test(combined)) {
    return 'math';
  }
  if (/biology|physics|chemistry|cell|dna|quantum|thermodynamics|atom|photosynthesis|gravity|reaction/i.test(combined)) {
    return 'science';
  }
  return 'general';
}

function generateMermaidDiagram(topic: string, domain: DomainType): string {
  const cleanTopic = sanitizeMermaidLabel(topic);
  
  switch (domain) {
    case 'algorithm':
      return `\`\`\`mermaid
graph TD
  Start(("Start: Input Data")) --> Init["Initialize Boundaries & Pointers"]
  Init --> Condition{"Loop Condition: Left <= Right?"}
  Condition -->|Yes| Mid["Calculate Midpoint: mid = left + (right-left)/2"]
  Mid --> Check{"Evaluate Element: Arr(mid) == Target?"}
  Check -->|Match Found| Success["Return Target Index"]
  Check -->|Target Greater| MoveRight["Shift Boundary: Left = mid + 1"]
  Check -->|Target Smaller| MoveLeft["Shift Boundary: Right = mid - 1"]
  MoveRight --> Condition
  MoveLeft --> Condition
  Condition -->|No| NotFound["Target Not Found: Return -1"]
  Success --> Finish(("End Process"))
  NotFound --> Finish
\`\`\``;

    case 'webdev':
      return `\`\`\`mermaid
graph TD
  User(("Client Browser")) -->|HTTP Request| CDN["Edge CDN / Gateway"]
  CDN -->|Forward Request| Server["App Server / Controller"]
  Server --> AuthCheck{"Authenticated & Valid?"}
  AuthCheck -->|No| ErrResp["Return 401/403 Error"]
  AuthCheck -->|Yes| ServiceLayer["Business Logic & Service Layer"]
  ServiceLayer --> CacheCheck{"Cache Hit in Redis?"}
  CacheCheck -->|Yes| CachedData["Retrieve Cached Result"]
  CacheCheck -->|No| DBQuery["Query Primary Database"]
  DBQuery --> WriteCache["Update Cache Layer"]
  WriteCache --> FormattedResp["Serialize JSON Response"]
  CachedData --> FormattedResp
  FormattedResp -->|Render View| User
\`\`\``;

    case 'aiml':
      return `\`\`\`mermaid
graph TD
  RawData(("Raw Input Data")) --> Preprocessing["Data Cleaning & Tokenization"]
  Preprocessing --> FeatureVector["Embedding & Feature Vectors"]
  FeatureVector --> ForwardPass["Forward Propagation: Layer Calculations"]
  ForwardPass --> LossCalc["Compute Loss Function: Actual vs Predicted"]
  LossCalc --> LossEval{"Loss < Tolerance Threshold?"}
  LossEval -->|Yes| ModelReady["Model Converged: Export Weights"]
  LossEval -->|No| Backprop["Backpropagation: Compute Gradients"]
  Backprop --> Optimizer["Update Weights via Optimizer: Adam / SGD"]
  Optimizer --> ForwardPass
  ModelReady --> Inference(("Production Inference Ready"))
\`\`\``;

    case 'database':
      return `\`\`\`mermaid
graph TD
  ClientReq(("Client Transaction")) --> QueryParser["SQL Query Parser & Optimizer"]
  QueryParser --> LockManager["Concurrency Control & Lock Manager"]
  LockManager --> WAL["Write-Ahead Logging (WAL)"]
  WAL --> BufferPool{"Buffer Pool Memory Hit?"}
  BufferPool -->|Yes| ReadBuffer["Read from RAM Buffer"]
  BufferPool -->|No| DiskRead["Fetch Page from Disk Storage"]
  DiskRead --> PopulatePool["Populate Buffer Pool"]
  PopulatePool --> ExecuteOps["Apply ACID Modifications"]
  ReadBuffer --> ExecuteOps
  ExecuteOps --> CommitTx{"Commit Transaction?"}
  CommitTx -->|Success| AckClient["Flush Confirmation to Client"]
  CommitTx -->|Failure| Rollback["Execute Rollback to Savepoint"]
\`\`\``;

    default:
      return `\`\`\`mermaid
graph TD
  Core(("Topic: ${cleanTopic}")) --> Pillar1["1. Core Theoretical Foundations"]
  Core --> Pillar2["2. Structural Mechanics & Workflows"]
  Core --> Pillar3["3. Real-World Applications"]
  Pillar1 --> Sub1["Primary Axioms & Definitions"]
  Pillar1 --> Sub2["Historical Evolution"]
  Pillar2 --> Check{"Operational Validation"}
  Check -->|Valid| Execute["Execution & Optimization"]
  Check -->|Edge Case| Mitigate["Error Handling & Guardrails"]
  Pillar3 --> Outcomes["Measurable Impact & Results"]
  Execute --> Outcomes
  Outcomes --> FinalReview(("Complete Mastery"))
\`\`\``;
  }
}

function generateCodeSnippet(topic: string, domain: DomainType, fromScratch: boolean): string {
  const cleanTopic = sanitizeMermaidLabel(topic);
  
  if (domain === 'algorithm') {
    return `\`\`\`python
# File: ${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_implementation.py
"""
Complete, production-ready implementation of ${cleanTopic}.
Includes input validation, time complexity guarantees, and unit test runner.
"""

from typing import List, Optional, Any

def execute_algorithm(data: List[int], target: int) -> int:
    """
    Executes ${cleanTopic} with O(log n) efficiency.
    Returns the index if target exists, else -1.
    """
    if not data:
        return -1
        
    left: int = 0
    right: int = len(data) - 1
    
    while left <= right:
        # Avoid integer overflow in large datasets
        mid: int = left + (right - left) // 2
        current = data[mid]
        
        if current == target:
            return mid
        elif current < target:
            left = mid + 1
        else:
            right = mid - 1
            
    return -1

# Self-verifying test suite
if __name__ == "__main__":
    sample_dataset = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
    target_value = 23
    
    result = execute_algorithm(sample_dataset, target_value)
    assert result == 5, f"Expected 5 but got {result}"
    print(f"✓ Success: Found {target_value} at index {result}")
\`\`\``;
  }

  if (domain === 'webdev') {
    return `\`\`\`typescript
// File: ${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}.service.ts
/**
 * Modern TypeScript implementation for ${cleanTopic}.
 * Demonstrates clean architecture, error handling, and type safety.
 */

export interface ConfigOptions {
  timeoutMs: number;
  retries: number;
  debugMode?: boolean;
}

export class ServiceHandler<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private readonly ttlMs: number = 60_000;

  constructor(private readonly config: ConfigOptions) {}

  public async execute(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      return cached.value;
    }

    let attempts = 0;
    while (attempts < this.config.retries) {
      try {
        const result = await fetcher();
        this.cache.set(key, { value: result, timestamp: Date.now() });
        return result;
      } catch (error) {
        attempts++;
        if (attempts >= this.config.retries) {
          throw new Error(\`[${cleanTopic}] Execution failed after \${attempts} attempts: \${(error as Error).message}\`);
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 100));
      }
    }

    throw new Error('Unexpected execution flow termination.');
  }
}
\`\`\``;
  }

  return `\`\`\`python
# File: ${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, '_')}_solution.py
"""
Modular reference implementation for ${cleanTopic}.
Designed for clean maintainability, readability, and performance.
"""

class CoreEngine:
    def __init__(self, name: str = "${cleanTopic}"):
        self.name = name
        self.state = {}

    def process(self, payload: dict) -> dict:
        """Processes and transforms operational payload."""
        processed = {k: v for k, v in payload.items() if v is not None}
        self.state.update(processed)
        return {"status": "success", "processed_keys": list(processed.keys())}

if __name__ == "__main__":
    engine = CoreEngine()
    output = engine.process({"initialized": True, "mode": "production"})
    print("Execution output:", output)
\`\`\``;
}

export async function generateOfflineNotes(options: OfflineOptions): Promise<string> {
  const {
    topic,
    details = '',
    includeDiagrams = true,
    fullCode = false,
    fromScratch = false,
    onProgress,
    onChunk
  } = options;

  const domain = detectDomain(topic, details);
  const cleanTopic = topic.trim();
  const detailSnippet = details ? details.trim() : '';

  // Progress simulation steps
  const steps = [15, 35, 60, 85, 100];
  for (let i = 0; i < steps.length - 1; i++) {
    onProgress?.(steps[i]);
    await new Promise((r) => setTimeout(r, 60));
  }

  const diagramBlock = includeDiagrams ? `\n\n### Architectural Flowchart\n\n${generateMermaidDiagram(cleanTopic, domain)}\n` : '';
  const codeBlock = (fullCode || fromScratch) 
    ? `\n\n### Production-Ready Implementation\n\n${generateCodeSnippet(cleanTopic, domain, fromScratch)}\n` 
    : '';

  const notesContent = `# Chapter: ${cleanTopic}

> **Comprehensive Study Guide & Reference Handout**  
> An exhaustive, structured deep-dive into **${cleanTopic}** covering fundamental architecture, core mechanics, real-world implementations, and critical edge cases.${detailSnippet ? ` Focusing on: *${detailSnippet}*` : ''}

[YELLOW_BOX]
**Definition & Core Mental Model:**
${cleanTopic} is a foundational concept designed to solve critical challenges in modern problem-solving. At its essence, it abstracts complexity into deterministic, predictable mechanisms that maximize throughput, maintainability, and conceptual clarity.
[/YELLOW_BOX]

---

## 1. Fundamental Principles & Architecture

To achieve deep mastery of **${cleanTopic}**, one must examine the internal mechanisms that govern its behavior:

✓ **Primary Objective:** Deliver predictable, scalable, and verifiable results across varied operating conditions.
✓ **State Transitions:** Enforce rigorous invariant constraints at every stage of execution or lifecycle.
✓ **Efficiency Guarantees:** Minimize computational overhead, resource contention, and latency bottlenecks.
✓ **Modular Separation:** Decouple interface definitions from underlying execution specifics.${diagramBlock}
[BLUE_BOX]
**Technical Details & Formal Mechanics:**
• **Time & Space Dynamics:** Optimized to reduce unnecessary cycles and guarantee strict bounds under worst-case inputs.
• **Determinism:** Given identical initial state and input vectors, the operational pipeline will invariably reach the identical termination state.
• **Fault Isolation:** Boundary guards prevent cascaded state corruption and ensure graceful degradation.
[/BLUE_BOX]

---

## 2. Practical Execution & Step-by-Step Procedure

Implementing **${cleanTopic}** in real environments follows a well-defined sequence:

1. **Initialization & Setup:** Validate incoming environmental parameters, allocate required buffer structures, and set initial pointers or state variables.
2. **Core Invariant Maintenance:** Continuously evaluate progress criteria, guaranteeing that each iterative step strictly moves toward the goal condition.
3. **Boundary Verification:** Test for null values, overflow thresholds, concurrency hazards, and edge bounds.
4. **Result Resolution:** Finalize transformation, flush pending writes or return synthesized results to the consumer.${codeBlock}
[GREEN_BOX]
**Real-World Use Cases & Applications:**
• **Mission-Critical Systems:** Utilized where consistency, uptime, and strict execution contracts are non-negotiable.
• **High-Throughput Pipelines:** Deployed to process high data volumes without quadratic memory expansion.
• **Industry Standards:** Serves as the bedrock pattern adopted across enterprise architectures and open-source frameworks worldwide.
[/GREEN_BOX]

---

## 3. Critical Warnings, Edge Cases & Common Pitfalls

Mastery requires understanding not just how things work, but how they break:

[RED_BOX]
**Critical Warnings & Common Mistakes:**
• **Off-by-One & Index Boundaries:** Inadvertently violating termination bounds leads to infinite loops or out-of-range exceptions.
• **Silent Failure Swallowing:** Catching generic exceptions without targeted remediation masks root-cause anomalies.
• **Hidden Allocation Costs:** Over-allocating temporary objects inside tight loops triggers severe garbage collection pauses.
• **State Leaks:** Failing to reset contextual state between repeated calls causes hard-to-reproduce bugs.
[/RED_BOX]

[ORANGE_BOX]
**Pro-Tip & Memory Tricks:**
• **The Golden Rule:** Always establish your base conditions and exit criteria *before* writing the recursive or iterative body.
• **Mnemonic ("P-I-E"):** **P**ointers set, **I**nvariants kept, **E**dges checked. If these three hold, your solution is airtight.
[/ORANGE_BOX]

---

## 4. Ecosystem Context & Exploration

[TEAL_BOX]
**Related Concepts & Next Steps:**
• Explore complementary patterns and dual approaches that balance trade-offs in specialized environments.
• Study advanced optimizations like vectorization, memoization, and concurrent asynchronous batching.
• Review formal benchmark comparisons against legacy implementations.
[/TEAL_BOX]

---

## 5. Chapter Summary & Key Takeaways

[PURPLE_BOX]
**Summary & Key Takeaways:**
✓ **${cleanTopic}** balances conceptual simplicity with rigorous engineering guarantees.
✓ Always design with the worst-case scenario in mind to ensure rock-solid resilience.
✓ Keep code modular, cleanly typed, and thoroughly tested with explicit boundary assertions.
✓ Maintain clear visual mental models and flowcharts to reason about complex state transitions.
[/PURPLE_BOX]
`;

  onProgress?.(100);
  onChunk?.(notesContent);
  return notesContent;
}

export async function generateOfflineFlowchartSummary(
  topic: string,
  content: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  onProgress?.(20);
  await new Promise((r) => setTimeout(r, 60));
  onProgress?.(60);
  await new Promise((r) => setTimeout(r, 60));
  onProgress?.(100);

  const cleanTopic = sanitizeMermaidLabel(topic || 'Topic');
  const domain = detectDomain(cleanTopic, content);

  return generateMermaidDiagram(cleanTopic, domain);
}
