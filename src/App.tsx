import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Download, 
  FileText, 
  Loader2, 
  Moon, 
  Sun, 
  Type, 
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Plus,
  Zap,
  Edit3,
  Minus,
  RotateCcw,
  Code,
  Terminal,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mermaid from 'mermaid';
import { generateNotes, generateFlowchartSummary } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Resizable } from 're-resizable';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NoteBlock = { 
  id: string; 
  content: string; 
  type: 'text' | 'box' | 'manual'; 
  tag?: string; 
  isEditing?: boolean; 
  customColor?: string;
  width?: number; // percentage width
};

const boxColors = [
  { tag: 'YELLOW_BOX', class: 'box-yellow', hex: '#fffbeb' },
  { tag: 'GREEN_BOX', class: 'box-green', hex: '#ecfdf5' },
  { tag: 'BLUE_BOX', class: 'box-blue', hex: '#eff6ff' },
  { tag: 'RED_BOX', class: 'box-red', hex: '#fef2f2' },
  { tag: 'PURPLE_BOX', class: 'box-purple', hex: '#f5f3ff' },
  { tag: 'ORANGE_BOX', class: 'box-orange', hex: '#fff7ed' },
  { tag: 'TEAL_BOX', class: 'box-teal', hex: '#f0fdfa' },
];

const BoxWrapper = ({ tag, customColor, children }: { tag: string, customColor?: string, children: React.ReactNode }) => {
  const color = boxColors.find(b => b.tag === tag);
  
  // Helper to darken a hex color for the border
  const getBorderColor = (hex: string) => {
    if (!hex.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
  };

  return (
    <div 
      className={cn("note-box", !customColor && (color?.class || "box-yellow"))}
      style={customColor ? { 
        backgroundColor: customColor, 
        borderColor: getBorderColor(customColor),
        borderWidth: '2px',
        borderStyle: 'solid',
        color: 'inherit' // Keep text color consistent
      } : {}}
    >
      {children}
    </div>
  );
};

const ColorPicker = ({ value, onChange, onReset, usedColors = [] }: { 
  value: string, 
  onChange: (val: string) => void, 
  onReset: () => void,
  usedColors?: string[]
}) => {
  const pastels = ['#fffbeb', '#ecfdf5', '#eff6ff', '#fef2f2', '#f5f3ff', '#fff7ed', '#f0fdfa'];
  const highlighters = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fed7aa', '#ddd6fe', '#99f6e4'];
  
  const allPresets = [...pastels, ...highlighters];
  const uniqueUsedColors = usedColors.filter(c => !allPresets.includes(c.toLowerCase()));

  return (
    <div className="flex flex-col gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Soft Pastels</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pastels.map(color => (
              <button
                key={color}
                onClick={() => onChange(color)}
                className={cn(
                  "w-7 h-7 rounded-lg border border-black/10 dark:border-white/10 transition-all hover:scale-110 hover:rotate-3 shadow-sm",
                  value.toLowerCase() === color.toLowerCase() && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900 scale-110 rotate-0"
                )}
                style={{ backgroundColor: color }}
                title={`Pastel ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Highlighters</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {highlighters.map(color => (
              <button
                key={color}
                onClick={() => onChange(color)}
                className={cn(
                  "w-7 h-7 rounded-lg border border-black/10 dark:border-white/10 transition-all hover:scale-110 hover:-rotate-3 shadow-sm",
                  value.toLowerCase() === color.toLowerCase() && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-neutral-900 scale-110 rotate-0"
                )}
                style={{ backgroundColor: color }}
                title={`Highlighter ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="h-[1px] bg-black/5 dark:bg-white/5" />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 px-1">Custom</span>
            <div className="flex items-center gap-2 bg-white dark:bg-neutral-800 p-1 rounded-xl border border-black/5 dark:border-white/5 shadow-sm">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-black/10 dark:border-white/10">
                <input 
                  type="color" 
                  value={value || '#ffffff'}
                  onChange={(e) => onChange(e.target.value)}
                  className="absolute inset-[-50%] w-[200%] h-[200%] cursor-pointer bg-transparent border-none p-0"
                />
              </div>
              <span className="text-[10px] font-mono opacity-50 pr-2 uppercase">{value || '#FFFFFF'}</span>
            </div>
          </div>

          {uniqueUsedColors.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40 px-1">Recent</span>
              <div className="flex gap-1.5">
                {uniqueUsedColors.slice(0, 5).map(color => (
                  <button
                    key={color}
                    onClick={() => onChange(color)}
                    className={cn(
                      "w-6 h-6 rounded-md border border-black/10 dark:border-white/10 transition-all hover:scale-110",
                      value.toLowerCase() === color.toLowerCase() && "ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-neutral-900"
                    )}
                    style={{ backgroundColor: color }}
                    title={`Used ${color}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onReset}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2 bg-neutral-200 dark:bg-neutral-800 rounded-xl hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-all shadow-sm active:scale-95"
        >
          <RotateCcw size={12} />
          Default
        </button>
      </div>
    </div>
  );
};

const MermaidDiagram = ({ chart, previewTheme, baseFontSize }: { chart: string, previewTheme: string, baseFontSize?: number }) => {
  const [svg, setSvg] = useState<string>('');
  const [zoom, setZoom] = useState<number>(100);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: 'var(--font-hand)',
      flowchart: {
        curve: 'basis',
        padding: 20,
        useMaxWidth: false,
        htmlLabels: true,
      },
      themeVariables: {
        primaryColor: previewTheme === 'dark' ? '#1e293b' : '#f1f5f9',
        primaryTextColor: previewTheme === 'dark' ? '#f8fafc' : '#0f172a',
        primaryBorderColor: previewTheme === 'dark' ? '#ffffff' : '#000000',
        lineColor: previewTheme === 'dark' ? '#ffffff' : '#000000',
        secondaryColor: previewTheme === 'dark' ? '#334155' : '#e2e8f0',
        tertiaryColor: previewTheme === 'dark' ? '#1e293b' : '#f1f5f9',
        noteBkgColor: previewTheme === 'dark' ? '#1e293b' : '#fff9c4',
        noteTextColor: previewTheme === 'dark' ? '#f8fafc' : '#0f172a',
        noteBorderColor: previewTheme === 'dark' ? '#ffffff' : '#000000',
        fontSize: baseFontSize ? `${baseFontSize}px` : '18px',
        mainBkg: previewTheme === 'dark' ? '#0f172a' : '#ffffff',
        nodeBorder: previewTheme === 'dark' ? '#ffffff' : '#000000',
        clusterBkg: previewTheme === 'dark' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.05)',
        clusterBorder: previewTheme === 'dark' ? '#3b82f6' : '#3b82f6',
        defaultLinkColor: previewTheme === 'dark' ? '#ffffff' : '#000000',
        titleColor: previewTheme === 'dark' ? '#f8fafc' : '#0f172a',
        edgeLabelBackground: previewTheme === 'dark' ? '#0f172a' : '#ffffff',
        nodeTextColor: previewTheme === 'dark' ? '#f8fafc' : '#0f172a',
        arrowheadColor: previewTheme === 'dark' ? '#ffffff' : '#000000',
      }
    });
    
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        
        // Fix common mermaid syntax errors
        let fixedChart = chart.trim();
        
        // 1. Ensure it starts with a valid graph type if it's missing
        if (!fixedChart.startsWith('graph') && !fixedChart.startsWith('flowchart') && !fixedChart.startsWith('sequenceDiagram') && !fixedChart.startsWith('classDiagram') && !fixedChart.startsWith('stateDiagram') && !fixedChart.startsWith('erDiagram') && !fixedChart.startsWith('gantt') && !fixedChart.startsWith('pie') && !fixedChart.startsWith('gitGraph')) {
          fixedChart = `graph TD\n${fixedChart}`;
        }

        // 2. Fix unquoted labels, nested quotes, parentheses, and special chars in node shapes
        const sanitizeLabel = (label: string) => {
          let trimmed = label.trim();
          if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
            trimmed = trimmed.slice(1, -1);
          } else if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2) {
            trimmed = trimmed.slice(1, -1);
          }
          trimmed = trimmed.replace(/"/g, "'");
          return `"${trimmed.trim()}"`;
        };

        // First, handle double shapes to avoid partial matches
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\{\{\s*([\s\S]*?)\s*\}\}/g, (m, id, label) => `${id}{{${sanitizeLabel(label)}}}`);
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\(\(\s*([\s\S]*?)\s*\)\)/g, (m, id, label) => `${id}((${sanitizeLabel(label)}))`);
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\[\[\s*([\s\S]*?)\s*\]\]/g, (m, id, label) => `${id}[[${sanitizeLabel(label)}]]`);
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\(\[\s*([\s\S]*?)\s*\]\)/g, (m, id, label) => `${id}([${sanitizeLabel(label)}])`);
        
        // Then handle single shapes
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\[\s*((?:[^[\]]+|\[[^[\]]*\])*)\s*\]/g, (m, id, label) => `${id}[${sanitizeLabel(label)}]`);
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\(\s*((?:[^()]+|\([^()]*\))*)\s*\)/g, (m, id, label) => `${id}(${sanitizeLabel(label)})`);
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\{\s*([^}]+)\s*\}/g, (m, id, label) => `${id}{${sanitizeLabel(label)}}`);
        fixedChart = fixedChart.replace(/([a-zA-Z0-9_-]+)\>\s*([^\]]+)\s*\]/g, (m, id, label) => `${id}>${sanitizeLabel(label)}]`);

        const { svg } = await mermaid.render(id, fixedChart);
        setSvg(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    };

    renderDiagram();
  }, [chart, previewTheme]);

  return (
    <div className="relative group w-full flex flex-col items-center">
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm p-1 rounded-lg border border-black/5 dark:border-white/10 shadow-sm">
        <button
          onClick={() => setZoom(prev => Math.max(10, prev - 10))}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors text-neutral-500 hover:text-blue-500"
          title="Zoom Out"
        >
          <ZoomOut size={14} />
        </button>
        <span className="text-[10px] font-mono font-medium w-10 text-center text-neutral-400">
          {zoom}%
        </span>
        <button
          onClick={() => setZoom(prev => Math.min(400, prev + 10))}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors text-neutral-500 hover:text-blue-500"
          title="Zoom In"
        >
          <ZoomIn size={14} />
        </button>
        <div className="w-[1px] h-3 bg-black/10 dark:bg-white/10 mx-0.5" />
        <button
          onClick={() => setZoom(100)}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors text-neutral-500 hover:text-blue-500 flex items-center gap-1"
          title="Reset Zoom (100%)"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => {
            if (containerRef.current) {
              const svgElement = containerRef.current.querySelector('svg');
              if (svgElement) {
                const containerWidth = containerRef.current.offsetWidth - 32; // padding
                const svgWidth = svgElement.viewBox.baseVal.width || svgElement.getBBox().width;
                if (svgWidth > 0) {
                  const fitZoom = Math.floor((containerWidth / svgWidth) * 100);
                  setZoom(Math.min(fitZoom, 100));
                }
              }
            }
          }}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors text-neutral-500 hover:text-blue-500"
          title="Fit to Width"
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <div 
        className="w-full overflow-x-auto overflow-y-hidden p-4 bg-white/5 rounded-2xl border border-white/10 mermaid-container custom-scrollbar"
      >
        <div 
          ref={containerRef} 
          className="flex justify-center transition-transform duration-300 ease-out origin-top"
          style={{ 
            transform: `scale(${zoom / 100})`,
            width: `${zoom}%`,
            minWidth: '100%'
          }}
          dangerouslySetInnerHTML={{ __html: svg }} 
        />
      </div>
    </div>
  );
};

const ManualNote = ({ id, content, customColor, onChange, previewTheme }: { id: string, content: string, customColor?: string, onChange: (val: string) => void, previewTheme: string }) => {
  const getBorderColor = (hex: string) => {
    if (!hex.startsWith('#')) return hex;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.max(0, r - 40)}, ${Math.max(0, g - 40)}, ${Math.max(0, b - 40)})`;
  };

  return (
    <div className="my-6 group/manual relative">
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your own notes here..."
        className={cn(
          "w-full bg-transparent border-2 border-dashed rounded-2xl p-6 font-hand text-xl outline-none transition-all resize-none overflow-hidden",
          !customColor && (previewTheme === 'dark' 
            ? "border-white/10 focus:border-blue-500/50 text-white placeholder:text-white/20" 
            : "border-black/10 focus:border-blue-500/50 text-black placeholder:text-black/20")
        )}
        style={{ 
          height: 'auto', 
          minHeight: '120px',
          backgroundColor: customColor || 'transparent',
          borderColor: customColor ? getBorderColor(customColor) : undefined,
          color: customColor ? '#000' : undefined
        }}
        onInput={(e) => {
          const target = e.target as HTMLTextAreaElement;
          const start = target.selectionStart;
          const end = target.selectionEnd;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
          target.setSelectionRange(start, end);
        }}
      />
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover/manual:opacity-100 transition-opacity pointer-events-none">
        <div className="bg-blue-500 text-white p-1 rounded-full">
          <Plus size={12} />
        </div>
      </div>
    </div>
  );
};

const RemovablePart = ({ id, onEdit, onRemove, children }: { id: string, onEdit?: () => void, onRemove: (id: string) => void, children: React.ReactNode }) => (
  <motion.div 
    layout
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="relative group/part"
  >
    <div className="absolute -right-10 top-0 flex flex-col gap-2 opacity-0 group-hover/part:opacity-100 transition-all z-20">
      <button
        onClick={() => onRemove(id)}
        className="p-2 bg-red-500 text-white rounded-full shadow-xl hover:scale-110 no-print border-2 border-white dark:border-neutral-800"
        title="Remove this section"
      >
        <Trash2 size={14} />
      </button>
      {onEdit && (
        <button
          onClick={onEdit}
          className="p-2 bg-blue-500 text-white rounded-full shadow-xl hover:scale-110 no-print border-2 border-white dark:border-neutral-800"
          title="Edit this section"
        >
          <Edit3 size={14} />
        </button>
      )}
    </div>
    {children}
  </motion.div>
);

export default function App() {
  const [topic, setTopic] = useState('');
  const [details, setDetails] = useState('');
  const [brandingTag, setBrandingTag] = useState('@NoteGenie_AI');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [notes, setNotes] = useState<string | null>(null);
  const [noteBlocks, setNoteBlocks] = useState<NoteBlock[]>([]);
  
  const usedColors = useMemo(() => {
    const colors = new Set<string>();
    noteBlocks.forEach(block => {
      if (block.customColor) {
        colors.add(block.customColor.toLowerCase());
      } else if (block.type === 'box' && block.tag) {
        const bc = boxColors.find(c => c.tag === block.tag);
        if (bc) colors.add(bc.hex.toLowerCase());
      }
    });
    return Array.from(colors);
  }, [noteBlocks]);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  const [fontStyle, setFontStyle] = useState<'hand' | 'kalam' | 'sans' | 'serif' | 'mono'>('hand');
  const [fontSize, setFontSize] = useState(20);
  const [includeDiagrams, setIncludeDiagrams] = useState(true);
  const [fullCode, setFullCode] = useState(false);
  const [separateCode, setSeparateCode] = useState(true);
  const [isPrintFriendly, setIsPrintFriendly] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const downloadAbortRef = useRef<boolean>(false);
  const noteRef = useRef<HTMLDivElement>(null);

  const quickTopics = [
    { name: 'Photosynthesis', details: 'Light-dependent and light-independent reactions, chloroplast structure.', color: 'bg-emerald-500' },
    { name: 'Binary Search', details: 'Algorithm steps, time complexity, and implementation in Python.', color: 'bg-blue-500' },
    { name: 'French Revolution', details: 'Causes, key figures like Robespierre, and the Reign of Terror.', color: 'bg-orange-500' },
    { name: 'Quantum Entanglement', details: 'EPR paradox, Bell\'s theorem, and applications in computing.', color: 'bg-purple-500' }
  ];

  const fontStyles = [
    { id: 'hand', name: 'Handwritten', class: 'font-hand' },
    { id: 'kalam', name: 'Sketchy', class: 'font-kalam' },
    { id: 'sans', name: 'Modern', class: 'font-sans' },
    { id: 'serif', name: 'Classic', class: 'font-serif' },
    { id: 'mono', name: 'Technical', class: 'font-mono' },
  ];

  // Auto-detect theme based on time of day on mount
  useEffect(() => {
    const hour = new Date().getHours();
    const isNight = hour < 7 || hour >= 19; // 7 PM to 7 AM is night
    const initialTheme = isNight ? 'dark' : 'light';
    setTheme(initialTheme);
    setPreviewTheme(initialTheme);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleGenerate = async () => {
    if (!topic) return;
    setIsGenerating(true);
    setProgress(0);
    setNotes(null);
    setNoteBlocks([]);
    setError(null);
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      const result = await generateNotes(
        topic, 
        details, 
        includeDiagrams,
        fullCode,
        separateCode,
        (p) => setProgress(p), 
        undefined, // onChunk
        abortControllerRef.current.signal
      );
      if (abortControllerRef.current?.signal.aborted) return;
      setNotes(result);
      setNoteBlocks(parseNotesToBlocks(result));
      setShowPreview(true);
    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) return;
      console.error('Generation failed:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during generation.');
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const cancelGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress(0);
      setError('Generation cancelled by user.');
    }
  };

  const handleFlowchartSummary = async () => {
    if (!topic || noteBlocks.length === 0) return;
    setIsGenerating(true);
    setProgress(0);
    setError(null);
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();
    
    try {
      // Get all content to summarize
      const fullContent = noteBlocks.map(b => {
        if (b.type === 'box') return `[${b.tag}]${b.content}[/${b.tag}]`;
        return b.content;
      }).join('\n\n');

      const result = await generateFlowchartSummary(
        topic, 
        fullContent,
        (p) => setProgress(p), 
        abortControllerRef.current.signal
      );
      
      if (abortControllerRef.current?.signal.aborted) return;

      // Append the summary as a new block
      const newBlock: NoteBlock = {
        id: `summary-${Date.now()}`,
        type: 'text',
        content: `## 🗺️ Visual Topic Map: ${topic}\n\n> This flowchart provides a high-level overview of the core concepts and their relationships. Use it as a mental map for the entire topic.\n\n${result}`
      };
      
      setNoteBlocks(prev => [...prev, newBlock]);
      
      // Scroll to bottom
      setTimeout(() => {
        const container = document.querySelector('.preview-scroll-container');
        if (container) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      }, 100);

    } catch (err) {
      if (err instanceof Error && (err.name === 'AbortError' || err.message === 'AbortError')) return;
      console.error('Summary generation failed:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during summary generation.');
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const parseNotesToBlocks = (content: string) => {
    const boxRegex = /\[([A-Z]+_BOX)\]([\s\S]*?)\[\/\1\]/g;
    const blocks = [];
    let lastIndex = 0;
    let match;
    let idCounter = 0;

    while ((match = boxRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const text = content.substring(lastIndex, match.index).trim();
        if (text) {
          blocks.push({
            id: `block-${idCounter++}`,
            type: 'text' as const,
            content: text
          });
        }
      }
      blocks.push({
        id: `block-${idCounter++}`,
        type: 'box' as const,
        tag: match[1],
        content: match[2]
      });
      lastIndex = boxRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      const text = content.substring(lastIndex).trim();
      if (text) {
        blocks.push({
          id: `block-${idCounter++}`,
          type: 'text' as const,
          content: text
        });
      }
    }
    return blocks;
  };

  const removeBlock = useCallback((id: string) => {
    setNoteBlocks(prev => {
      const newBlocks = prev.filter(b => b.id !== id);
      // Reconstruct notes string to keep it in sync for copy/download
      const newNotes = newBlocks.map(b => {
        if (b.type === 'box') {
          return `[${b.tag}]${b.content}[/${b.tag}]`;
        }
        return b.content;
      }).join('\n\n');
      setNotes(newNotes);
      return newBlocks;
    });
  }, []);

  const updateBlockContent = useCallback((id: string, content: string) => {
    setNoteBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  }, []);

  const updateBlockWidth = useCallback((id: string, width: number) => {
    setNoteBlocks(prev => prev.map(b => b.id === id ? { ...b, width } : b));
  }, []);

  const updateBlockColor = useCallback((id: string, customColor: string) => {
    setNoteBlocks(prev => prev.map(b => b.id === id ? { ...b, customColor } : b));
  }, []);

  const toggleBlockEdit = useCallback((id: string) => {
    setNoteBlocks(prev => prev.map(b => b.id === id ? { ...b, isEditing: !b.isEditing } : b));
  }, []);

  const addManualBlock = () => {
    const newBlock = {
      id: Math.random().toString(36).substr(2, 9),
      content: '',
      type: 'manual' as const
    };
    setNoteBlocks(prev => [...prev, newBlock]);
    if (!showPreview) setShowPreview(true);
  };

  const downloadPDF = async (targetTheme: 'light' | 'dark' = 'light') => {
    if (!noteRef.current || !topic) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    downloadAbortRef.current = false;
    
    try {
      setDownloadProgress(10);
      if (downloadAbortRef.current) return;
      
      // Pre-calculate styles once
      const styles = Array.from(document.styleSheets)
        .map(sheet => {
          try {
            return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
          } catch (e) {
            return '';
          }
        })
        .join('\n');

      setDownloadProgress(30);
      if (downloadAbortRef.current) return;
      
      // Get the actual HTML content from the preview
      const contentElement = noteRef.current.querySelector('.notes-body-content');
      if (!contentElement) return;
      
      // Clone to handle textarea values (which aren't in innerHTML)
      const clone = contentElement.cloneNode(true) as HTMLElement;
      
      // Clean up theme classes from clone to prevent conflicts
      clone.classList.remove('preview-dark', 'preview-light');
      clone.querySelectorAll('.preview-dark, .preview-light').forEach(el => {
        el.classList.remove('preview-dark', 'preview-light');
      });

      // Theme-aware content processing
      if (targetTheme === 'light') {
        clone.classList.add('preview-light');
        clone.classList.remove('prose-invert');
        clone.querySelectorAll('.prose-invert').forEach(el => el.classList.remove('prose-invert'));
        clone.querySelectorAll('.text-white').forEach(el => {
          el.classList.remove('text-white');
          el.classList.add('text-black');
        });
      } else {
        clone.classList.add('preview-dark');
        clone.classList.add('prose-invert');
        clone.querySelectorAll('.prose').forEach(el => el.classList.add('prose-invert'));
        clone.querySelectorAll('.text-black').forEach(el => {
          el.classList.remove('text-black');
          el.classList.add('text-white');
        });
      }

      const originalTextareas = contentElement.querySelectorAll('textarea');
      const clonedTextareas = clone.querySelectorAll('textarea');
      
      clonedTextareas.forEach((ta, i) => {
        const val = (originalTextareas[i] as HTMLTextAreaElement).value;
        const div = document.createElement('div');
        // Copy classes but remove focus/border-dashed and force theme-aware text for print
        div.className = ta.className
          .replace('border-dashed', 'border-solid')
          .replace('focus:border-blue-500/50', '');
        
        if (targetTheme === 'light') {
          div.className = div.className
            .replace('text-white', 'text-black')
            .replace('border-white/10', 'border-black/10');
          div.style.color = '#000';
        } else {
          div.className = div.className
            .replace('text-black', 'text-white')
            .replace('border-black/10', 'border-white/10');
          div.style.color = '#fff';
        }
        
        div.style.whiteSpace = 'pre-wrap';
        div.style.minHeight = ta.style.height || '120px';
        div.style.backgroundColor = ta.style.backgroundColor;
        div.textContent = val;
        ta.parentNode?.replaceChild(div, ta);
      });

      // Explicitly handle Mermaid SVGs in the clone to force target theme
      clone.querySelectorAll('.mermaid svg').forEach(svg => {
        const isDark = targetTheme === 'dark';
        const strokeColor = isDark ? '#f8fafc' : '#000000';
        const fillColor = isDark ? '#1e293b' : '#ffffff';
        const textColor = isDark ? '#f8fafc' : '#000000';

        // Update all paths, rects, etc.
        svg.querySelectorAll('path, rect, circle, ellipse, polygon').forEach(el => {
          const element = el as SVGElement;
          const currentFill = element.getAttribute('fill')?.toLowerCase() || '';
          const currentStroke = element.getAttribute('stroke')?.toLowerCase() || '';
          
          // Only update if it's not a text element or label
          if (!element.closest('text') && !element.classList.contains('label')) {
            // Logic for boxes/shapes
            if (element.tagName.toLowerCase() !== 'path' || (element.getAttribute('fill') && element.getAttribute('fill') !== 'none')) {
              if (!isDark) {
                // In light theme, if it's black, dark gray, or the default dark theme color, change to white
                if (currentFill === '#000' || currentFill === '#000000' || currentFill === 'black' || 
                    currentFill === '#1e293b' || currentFill === '#334155' || currentFill === '#0f172a' ||
                    currentFill === '' || currentFill === 'inherit') {
                  element.setAttribute('fill', '#ffffff');
                }
                // If it's a "not coloured" box (default light theme color), also change to white
                else if (currentFill === '#f1f5f9' || currentFill === '#f8fafc' || currentFill === '#e2e8f0') {
                  element.setAttribute('fill', '#ffffff');
                }
                // Otherwise, it's likely a colored box (pink, green, red), so we keep it!
              } else {
                // In dark theme, we can be more aggressive about forcing the dark background
                element.setAttribute('fill', fillColor);
              }
              
              // Force black stroke for all shapes in light theme
              if (!isDark) {
                element.setAttribute('stroke', '#000000');
                element.style.stroke = '#000000';
                element.setAttribute('stroke-width', '1.5px');
              } else {
                element.setAttribute('stroke', strokeColor);
              }
            }
            
            // Logic for arrows/lines (paths with no fill)
            if (element.tagName.toLowerCase() === 'path' && (!element.getAttribute('fill') || element.getAttribute('fill') === 'none')) {
              element.setAttribute('stroke', strokeColor);
              element.style.stroke = strokeColor;
              // Make arrows "dark BLACK" in light theme
              if (!isDark) {
                element.setAttribute('stroke-width', '2px');
                element.style.strokeWidth = '2px';
                element.style.opacity = '1';
              }
            }
          }
        });

        // Update text elements
        svg.querySelectorAll('text, tspan').forEach(el => {
          const element = el as SVGElement;
          element.setAttribute('fill', textColor);
          element.style.fill = textColor;
          element.style.color = textColor;
          element.style.fontFamily = "'Arial', 'Helvetica', sans-serif";
          element.style.fontWeight = "500";
        });
      });

      const content = clone.innerHTML;
      
      if (!content || content.trim().length < 10) {
        throw new Error('No content found to download. Please generate notes first.');
      }
      
      setDownloadProgress(50);
      if (downloadAbortRef.current) return;

      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('Popup blocked! Please enable popups in your browser settings to download the PDF.');
      }
      
      setDownloadProgress(80);
      if (downloadAbortRef.current) {
        printWindow.close();
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <title>${topic} - Visual Notes</title>
            <style>
              ${styles}
              @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400..700&family=Kalam:wght@300;400;700&display=swap');
              
              body { 
                margin: 0; 
                padding: 0; 
                background: ${targetTheme === 'dark' ? '#0f172a' : '#fffdfa'} !important; 
                color: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                overflow: visible !important;
              }
              
              #printable-content { 
                width: 210mm; 
                margin: 0 auto; 
                background: ${targetTheme === 'dark' ? '#0f172a' : '#fffdfa'} !important; 
                display: block !important;
                padding-bottom: 20px !important;
                min-height: auto;
                overflow: visible !important;
              }
              
              .note-heading {
                break-inside: avoid;
                page-break-inside: avoid;
                display: inline-block !important;
              }
              
              .lined-paper { 
                box-shadow: none !important; 
                border: none !important; 
                padding-top: 0.4rem !important;
                padding-bottom: 0.4rem !important;
                background-color: ${targetTheme === 'dark' ? '#0f172a' : '#fffdfa'} !important;
                line-height: 1.6rem !important;
                background-size: 100% 1.6rem, 100% 100% !important;
                background-repeat: repeat !important;
                background-attachment: scroll !important;
              }

              /* Theme-aware text colors */
              .notes-body-content div, .prose, .prose h1, .prose h2, .prose h3, .prose h4, .prose p, .prose li {
                color: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
              }
              
              .note-box { 
                font-size: 0.8em !important; 
                line-height: 1.2 !important; 
                margin: 0.4rem 0 !important; 
                padding: 0.5rem 0.7rem !important;
                break-inside: avoid;
                page-break-inside: avoid;
                background: ${targetTheme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.5)'} !important;
                color: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
              }

              .note-box strong {
                background: ${targetTheme === 'dark' ? 'linear-gradient(120deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.4) 100%)' : 'linear-gradient(120deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.8) 100%)'} !important;
                background-size: 100% 0.4em !important;
                background-repeat: no-repeat !important;
                background-position: 0 80% !important;
              }

              .mermaid {
                break-inside: avoid;
                page-break-inside: avoid;
                margin: 1rem 0 !important;
                background: ${targetTheme === 'dark' ? '#0f172a' : '#fffdfa'} !important;
              }

              /* Force theme-aware Mermaid colors in PDF */
              .mermaid .node rect,
              .mermaid .node circle,
              .mermaid .node ellipse,
              .mermaid .node polygon,
              .mermaid .node path,
              .mermaid .node .mainBkg,
              .mermaid .cluster rect,
              .mermaid .labelBox,
              .mermaid .patch,
              .mermaid .node-bkg,
              .mermaid rect,
              .mermaid circle,
              .mermaid ellipse,
              .mermaid polygon {
                fill: ${targetTheme === 'dark' ? '#1e293b' : '#ffffff'} !important;
                stroke: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
                stroke-width: 1.5px !important;
              }

              .mermaid text,
              .mermaid text *,
              .mermaid .label,
              .mermaid .label *,
              .mermaid .edgeLabel,
              .mermaid .edgeLabel *,
              .mermaid .nodeLabel,
              .mermaid .nodeLabel *,
              .mermaid .labelText,
              .mermaid .labelText *,
              .mermaid span,
              .mermaid div,
              .mermaid p {
                color: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
                fill: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
                font-weight: 400 !important;
                font-family: 'Arial', 'Helvetica', sans-serif !important;
              }

              .mermaid .edgePaths path,
              .mermaid .edgePath path,
              .mermaid .flowchart-link,
              .mermaid .connection,
              .mermaid .edge-thickness-normal,
              .mermaid .edge-thickness-thick,
              .mermaid .edge-thickness-thin,
              .mermaid .link,
              .mermaid .link-base,
              .mermaid .transition,
              .mermaid .path,
              .mermaid .arrowheadPath,
              .mermaid .edgePath .path {
                stroke: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
                stroke-width: ${targetTheme === 'dark' ? '1.2px' : '2px'} !important;
                opacity: 1 !important;
                fill: none !important;
              }

              .mermaid .marker,
              .mermaid marker path,
              .mermaid [id^="mermaid-"] .arrowheadPath,
              .mermaid .arrowheadPath {
                fill: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
                stroke: ${targetTheme === 'dark' ? '#f8fafc' : '#000000'} !important;
                stroke-width: 1px !important;
                opacity: 1 !important;
              }

              .mermaid svg {
                max-width: 100% !important;
                width: auto !important;
                height: auto !important;
                max-height: 180mm !important;
                padding: 10px !important;
                object-fit: contain !important;
                display: block !important;
                margin: 0 auto !important;
                filter: none !important;
              }
              
              h1, h2, h3 { 
                margin-top: 0.5rem !important; 
                margin-bottom: 0.2rem !important; 
                break-after: avoid; 
                page-break-after: avoid;
              }

              .notes-body {
                width: 100%;
                break-before: auto;
                page-break-before: auto;
                break-after: auto;
                page-break-after: auto;
                break-inside: auto;
                page-break-inside: auto;
              }
              
              .lined-paper {
                background-repeat: repeat-y !important;
                background-attachment: scroll !important;
              }

              p {
                margin-bottom: 0.3rem !important;
              }
              
              @media print {
                @page { size: A4; margin: 10mm 8mm; }
                body { background: ${targetTheme === 'dark' ? '#0f172a' : '#fff'} !important; }
                #printable-content { 
                  width: 100%; 
                  min-height: auto !important;
                  background: ${targetTheme === 'dark' ? '#0f172a' : '#fff'} !important;
                }
                .lined-paper {
                  background-size: 100% 1.6rem, 100% 100% !important;
                  background-color: ${targetTheme === 'dark' ? '#0f172a' : '#fff'} !important;
                }
              }
            </style>
          </head>
          <body class="${targetTheme === 'dark' ? 'preview-dark' : 'preview-light'} paper-theme">
            <div id="printable-content" class="lined-paper font-hand text-base ${targetTheme === 'dark' ? 'preview-dark' : 'preview-light'}">
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 15px 10px; border-bottom: 2px dashed #ccc; margin-bottom: 10px;">
                <h1 class="note-heading" style="font-size: 28pt; margin-bottom: 2px; transform: none; text-decoration: none;">${topic}</h1>
                <p style="font-size: 12pt; opacity: 0.7; font-family: 'Kalam', cursive; margin: 0;">${brandingTag}</p>
              </div>
              
              <div class="notes-body">
                ${content}
              </div>
            </div>
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  // window.close();
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      
      setDownloadProgress(100);
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
      }, 500);
      
    } catch (error) {
      console.error('Download failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to prepare PDF.');
      setIsDownloading(false);
    }
  };

  const cancelDownload = () => {
    downloadAbortRef.current = true;
    setIsDownloading(false);
    setDownloadProgress(0);
  };

  const handleCopy = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickTopic = (t: { name: string, details: string }) => {
    setTopic(t.name);
    setDetails(t.details);
  };

  const components = useMemo(() => ({
    h1: ({ children }: any) => <h1 className={cn("text-5xl font-bold note-heading mb-6 transition-colors duration-500", previewTheme === 'dark' ? "text-white" : "text-black")} style={{ fontFamily: `var(--font-${fontStyle})` }}>{children}</h1>,
    h2: ({ children }: any) => <h2 className={cn("text-3xl font-bold note-heading mt-10 mb-4 transition-colors duration-500", previewTheme === 'dark' ? "text-white" : "text-black")} style={{ fontFamily: `var(--font-${fontStyle})` }}>{children}</h2>,
    h3: ({ children }: any) => <h3 className={cn("text-2xl font-bold note-heading mt-8 mb-3 transition-colors duration-500", previewTheme === 'dark' ? "text-white" : "text-black")} style={{ fontFamily: `var(--font-${fontStyle})` }}>{children}</h3>,
    p: ({ children }: any) => <div className="mb-4 leading-relaxed">{children}</div>,
    ul: ({ children }: any) => <ul className="space-y-2 mb-4">{children}</ul>,
    li: ({ children }: any) => (
      <li className="flex items-start gap-3 mb-2">
        <span className="checkmark mt-1">✓</span>
        <div className="flex-1">{children}</div>
      </li>
    ),
    blockquote: ({ children }: any) => (
      <BoxWrapper tag="YELLOW_BOX">
        {children}
      </BoxWrapper>
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      if (inline) {
        return (
          <code className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-mono text-sm" {...props}>
            {children}
          </code>
        );
      }
      if (match && match[1] === 'mermaid') {
        return <MermaidDiagram chart={String(children).replace(/\n$/, '')} previewTheme={previewTheme} baseFontSize={fontSize} />;
      }
      return (
        <BoxWrapper tag="BLUE_BOX">
          <div className="font-mono text-base overflow-x-auto">
            {children}
          </div>
        </BoxWrapper>
      );
    },
    hr: () => <hr className="my-12 border-neutral-200" />,
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-6">
        <table>{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead>{children}</thead>,
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => <tr>{children}</tr>,
    th: ({ children }: any) => <th>{children}</th>,
    td: ({ node, children }: any) => {
      return <td>{children}</td>;
    }
  }), [previewTheme, fontStyle]);

  const MarkdownRenderer = useCallback(({ content, blocks }: { content: string, blocks: NoteBlock[] }) => {
    if (isGenerating || blocks.length === 0) {
      const boxRegex = /\[([A-Z]+_BOX)\]([\s\S]*?)\[\/\1\]/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boxRegex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(
            <ReactMarkdown key={`text-${lastIndex}`} components={components} remarkPlugins={[remarkGfm]}>
              {content.substring(lastIndex, match.index)}
            </ReactMarkdown>
          );
        }
        const tag = match[1];
        const innerContent = match[2];
        parts.push(
          <BoxWrapper key={`box-${match.index}`} tag={tag}>
            <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>{innerContent}</ReactMarkdown>
          </BoxWrapper>
        );
        lastIndex = boxRegex.lastIndex;
      }

      if (lastIndex < content.length) {
        parts.push(
          <ReactMarkdown key={`text-${lastIndex}`} components={components} remarkPlugins={[remarkGfm]}>
            {content.substring(lastIndex)}
          </ReactMarkdown>
        );
      }

      return (
        <div className={cn(
          "markdown-content prose prose-neutral max-w-none prose-p:my-1 prose-headings:my-2",
          theme === 'dark' && "prose-invert"
        )}>
          {parts.length > 0 ? parts : <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>}
        </div>
      );
    }

    return (
      <div className={cn(
        "markdown-content prose prose-neutral max-w-none prose-p:my-1 prose-headings:my-2",
        previewTheme === 'dark' && "prose-invert"
      )}>
        <AnimatePresence mode="popLayout">
          {blocks.map((block) => (
            <RemovablePart 
              key={block.id} 
              id={block.id} 
              onRemove={removeBlock}
              onEdit={() => toggleBlockEdit(block.id)}
            >
              <div className="flex justify-center w-full group/block my-4">
                <Resizable
                  size={{
                    width: `${block.width || 100}%`,
                    height: 'auto',
                  }}
                  onResizeStop={(e, direction, ref, d) => {
                    const newWidth = Math.min(100, Math.max(20, (block.width || 100) + (d.width / (ref.parentElement?.clientWidth || 1) * 100)));
                    updateBlockWidth(block.id, newWidth);
                  }}
                  minWidth="20%"
                  maxWidth="100%"
                  enable={{
                    top: false,
                    right: true,
                    bottom: false,
                    left: true,
                    topRight: false,
                    bottomRight: false,
                    bottomLeft: false,
                    topLeft: false,
                  }}
                  handleStyles={{
                    right: { width: '10px', right: '-5px', cursor: 'ew-resize' },
                    left: { width: '10px', left: '-5px', cursor: 'ew-resize' },
                  }}
                  handleClasses={{
                    right: "opacity-0 group-hover/block:opacity-100 transition-opacity bg-blue-500/20 hover:bg-blue-500/40 rounded-full",
                    left: "opacity-0 group-hover/block:opacity-100 transition-opacity bg-blue-500/20 hover:bg-blue-500/40 rounded-full",
                  }}
                  className="flex justify-center items-center"
                >
                  <div className="w-full">
                    {block.isEditing ? (
                      <div className="my-6">
                        <textarea
                          value={block.content}
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className={cn(
                            "w-full bg-transparent border-2 border-blue-500/30 rounded-2xl p-6 font-mono text-sm outline-none transition-all resize-none overflow-hidden",
                            previewTheme === 'dark' ? "text-white" : "text-black"
                          )}
                          style={{ height: 'auto', minHeight: '120px' }}
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement;
                            const start = target.selectionStart;
                            const end = target.selectionEnd;
                            target.style.height = 'auto';
                            target.style.height = `${target.scrollHeight}px`;
                            target.setSelectionRange(start, end);
                          }}
                          autoFocus
                        />
                        <div className="flex flex-col gap-4 mt-6">
                          {(block.type === 'box' || block.type === 'manual') && (
                            <ColorPicker 
                              value={block.customColor || ''} 
                              onChange={(val) => updateBlockColor(block.id, val)}
                              onReset={() => updateBlockColor(block.id, '')}
                              usedColors={usedColors}
                            />
                          )}
                          <div className="flex justify-end">
                            <button 
                              onClick={() => toggleBlockEdit(block.id)}
                              className="text-xs font-bold uppercase tracking-widest px-6 py-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                            >
                              <CheckCircle2 size={16} />
                              Done Editing
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : block.type === 'box' ? (
                      <BoxWrapper tag={block.tag!} customColor={block.customColor}>
                        <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
                      </BoxWrapper>
                    ) : block.type === 'manual' ? (
                      <ManualNote 
                        id={block.id} 
                        content={block.content} 
                        customColor={block.customColor}
                        onChange={(val) => updateBlockContent(block.id, val)} 
                        previewTheme={previewTheme} 
                      />
                    ) : (
                      <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>{block.content}</ReactMarkdown>
                    )}
                  </div>
                </Resizable>
              </div>
            </RemovablePart>
          ))}
        </AnimatePresence>
      </div>
    );
  }, [isGenerating, components, theme, previewTheme, removeBlock, toggleBlockEdit, updateBlockContent]);

  return (
    <div className={cn(
      "min-h-screen transition-all duration-500 font-sans relative overflow-hidden",
      theme === 'dark' ? "bg-night-bg text-night-text" : "bg-day-bg text-day-text"
    )}>
      {/* Design Grid Background */}
      <div className={cn(
        "absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02]",
        "bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:40px_40px]"
      )} />

      {/* Colourful Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] left-[10%] w-[20%] h-[20%] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
      <AnimatePresence>
        {isDownloading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6 relative">
              <button 
                onClick={() => setIsDownloading(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-400"
              >
                <X size={24} />
              </button>
              <div className="relative w-24 h-24 mx-auto">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    className="text-neutral-100 dark:text-neutral-800"
                  />
                  <motion.circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    strokeDasharray="283"
                    animate={{ strokeDashoffset: 283 - (283 * downloadProgress) / 100 }}
                    className="text-blue-600"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                  {downloadProgress}%
                </div>
              </div>
              <div className="space-y-2 relative">
                <button 
                  onClick={cancelDownload}
                  className="absolute -top-12 -right-4 p-2 rounded-full bg-white dark:bg-neutral-800 shadow-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all group"
                  title="Cancel Download"
                >
                  <AlertCircle className="text-neutral-400 group-hover:text-red-500 rotate-45" size={20} />
                </button>
                <h3 className="text-xl font-bold">Preparing Your PDF</h3>
                <p className="text-neutral-500 text-sm">We're capturing your visual notes and formatting them for A4 printing. This may take a moment...</p>
              </div>
              <div className="flex items-center justify-center gap-2 text-blue-600 font-medium animate-pulse">
                <Loader2 className="animate-spin" size={18} />
                <span>Processing...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className={cn(
        "sticky top-0 z-50 backdrop-blur-xl border-b px-8 py-5 flex justify-between items-center transition-all duration-500 no-print",
        theme === 'dark' 
          ? "bg-[#121212]/70 border-white/5" 
          : "bg-[#F5F5F5]/70 border-black/5"
      )}>
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-xl group-hover:rotate-12",
            theme === 'dark' ? "bg-gradient-to-br from-blue-400 to-purple-500 text-white" : "bg-gradient-to-br from-blue-600 to-purple-700 text-white"
          )}>
            <FileText size={26} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            NoteGenie <span className={cn("transition-colors duration-500 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500")}>AI</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className={cn(
              "p-2 rounded-full transition-all duration-300",
              theme === 'dark' ? "bg-white text-black hover:bg-neutral-200" : "bg-black text-white hover:bg-neutral-800"
            )}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          {notes && (
            <div className="flex items-center gap-2">
              <button 
                onClick={handleCopy}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 border active:scale-95",
                  copied 
                    ? "bg-emerald-500 border-emerald-600 text-white" 
                    : theme === 'dark'
                      ? "bg-white text-black border-white hover:bg-neutral-200"
                      : "bg-black text-white border-black hover:bg-neutral-800"
                )}
              >
                {copied ? <CheckCircle2 size={18} /> : <RefreshCw size={18} className={cn(isGenerating && "animate-spin")} />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy Markdown"}</span>
              </button>
              <button 
                onClick={() => downloadPDF('light')}
                disabled={isDownloading}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg active:scale-95 disabled:opacity-50",
                  theme === 'dark'
                    ? "bg-white text-black hover:bg-neutral-200"
                    : "bg-black text-white hover:bg-neutral-800"
                )}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>{downloadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span className="hidden sm:inline">Download PDF</span>
                  </>
                )}
              </button>
              <button 
                onClick={() => downloadPDF('dark')}
                disabled={isDownloading}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg active:scale-95 disabled:opacity-50",
                  "bg-slate-800 text-white hover:bg-slate-700"
                )}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    <span>{downloadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Moon size={18} />
                    <span className="hidden sm:inline">Dark PDF</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-16 grid lg:grid-cols-2 gap-16 relative">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 blur-[120px] rounded-full pointer-events-none" />

        {/* Left Column: Input */}
        <div className="space-y-12 relative z-10 no-print">
          <section className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-5xl font-display font-bold tracking-tight lg:text-7xl leading-[0.95]">
                Visual <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-orange-500">Handwritten</span> <br />
                Notes.
              </h2>
            </motion.div>
            <p className="text-xl text-neutral-500 dark:text-neutral-400 max-w-md font-medium leading-relaxed">
              Transform complex topics into beautiful, structured study handouts in seconds.
            </p>
          </section>

          <div className={cn(
            "grid grid-cols-1 md:grid-cols-2 gap-4 p-2 rounded-[2.5rem] border transition-all duration-500",
            theme === 'dark'
              ? "bg-white/5 border-white/10"
              : "bg-black/5 border-black/10"
          )}>
            <div className={cn(
              "md:col-span-2 p-6 rounded-[2rem] transition-all duration-500",
              theme === 'dark' ? "bg-neutral-900" : "bg-white"
            )}>
              <div className="space-y-4">
                <label className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                  theme === 'dark' ? "text-neutral-500" : "text-neutral-400"
                )}>Quick Topics</label>
                <div className="flex flex-wrap gap-2">
                  {quickTopics.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => handleQuickTopic(t)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border",
                        topic === t.name 
                          ? `${t.color} text-white border-transparent shadow-lg scale-105`
                          : (theme === 'dark' ? "bg-neutral-800 border-white/5 text-neutral-400 hover:border-white/20" : "bg-white border-black/5 text-neutral-600 hover:border-black/20")
                      )}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn(
              "p-6 rounded-[2rem] transition-all duration-500",
              theme === 'dark' ? "bg-neutral-900" : "bg-white"
            )}>
              <div className="space-y-3">
                <label className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                  theme === 'dark' ? "text-neutral-500" : "text-neutral-400"
                )}>Topic Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Binary Search"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={cn(
                    "w-full bg-transparent border-b-2 focus:border-current transition-all outline-none py-2 text-xl font-display font-medium",
                    theme === 'dark' ? "border-white/10" : "border-black/10"
                  )}
                />
              </div>
            </div>

            <div className={cn(
              "p-6 rounded-[2rem] transition-all duration-500",
              theme === 'dark' ? "bg-neutral-900" : "bg-white"
            )}>
              <div className="space-y-3">
                <label className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                  theme === 'dark' ? "text-neutral-500" : "text-neutral-400"
                )}>Branding Tag</label>
                <input 
                  type="text" 
                  placeholder="@Handle"
                  value={brandingTag}
                  onChange={(e) => setBrandingTag(e.target.value)}
                  className={cn(
                    "w-full bg-transparent border-b-2 focus:border-current transition-all outline-none py-2 text-xl font-display font-medium",
                    theme === 'dark' ? "border-white/10" : "border-black/10"
                  )}
                />
              </div>
            </div>

            <div className={cn(
              "md:col-span-2 p-6 rounded-[2rem] transition-all duration-500",
              theme === 'dark' ? "bg-neutral-900" : "bg-white"
            )}>
              <div className="space-y-4">
                <label className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                  theme === 'dark' ? "text-neutral-500" : "text-neutral-400"
                )}>Font Style</label>
                <div className="flex flex-wrap gap-2">
                  {fontStyles.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontStyle(f.id as any)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 border",
                        fontStyle === f.id 
                          ? (theme === 'dark' ? "bg-white text-black border-white" : "bg-black text-white border-black")
                          : (theme === 'dark' ? "bg-neutral-800 border-white/5 text-neutral-400 hover:border-white/20" : "bg-white border-black/5 text-neutral-600 hover:border-black/20")
                      )}
                    >
                      <span className={f.class}>{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={cn(
              "md:col-span-2 p-6 rounded-[2rem] transition-all duration-500",
              theme === 'dark' ? "bg-neutral-900" : "bg-white"
            )}>
              <div className="flex items-center justify-between mb-4">
                <label className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                  theme === 'dark' ? "text-neutral-500" : "text-neutral-400"
                )}>Content Options</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setIncludeDiagrams(!includeDiagrams)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                      includeDiagrams 
                        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    <Zap size={12} className={includeDiagrams ? "fill-current" : ""} />
                    {includeDiagrams ? "Diagrams" : "No Diagrams"}
                  </button>
                  <button
                    onClick={() => setFullCode(!fullCode)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                      fullCode 
                        ? "bg-purple-500 text-white shadow-lg shadow-purple-500/20" 
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    <Code size={12} className={fullCode ? "fill-current" : ""} />
                    {fullCode ? "Full Code" : "Logic Only"}
                  </button>
                  <button
                    onClick={() => setSeparateCode(!separateCode)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                      separateCode 
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" 
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    <Terminal size={12} className={separateCode ? "fill-current" : ""} />
                    {separateCode ? "Separate Code" : "Mashup Code"}
                  </button>
                  <button
                    onClick={() => setIsPrintFriendly(!isPrintFriendly)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-300",
                      isPrintFriendly 
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                        : "bg-neutral-200 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    <Printer size={12} className={isPrintFriendly ? "fill-current" : ""} />
                    {isPrintFriendly ? "Print Friendly" : "Print Default"}
                  </button>
                </div>
              </div>
            </div>

            <div className={cn(
              "md:col-span-2 p-6 rounded-[2rem] transition-all duration-500",
              theme === 'dark' ? "bg-neutral-900" : "bg-white"
            )}>
              <div className="space-y-3">
                <label className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-300",
                  theme === 'dark' ? "text-neutral-500" : "text-neutral-400"
                )}>Additional Details</label>
                <textarea 
                  placeholder="Specific requirements..."
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  className={cn(
                    "w-full bg-transparent border-b-2 focus:border-current transition-all outline-none py-2 text-lg font-medium resize-none",
                    theme === 'dark' ? "border-white/10" : "border-black/10"
                  )}
                />
              </div>
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 p-2">
              <button 
                onClick={() => handleGenerate()}
                disabled={isGenerating || !topic}
                className={cn(
                  "flex-1 flex items-center justify-center gap-4 py-6 rounded-[1.5rem] font-display font-bold text-2xl transition-all duration-500 active:scale-[0.98] shadow-2xl overflow-hidden relative group",
                  isGenerating 
                    ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-500 cursor-not-allowed" 
                    : "bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 text-white hover:shadow-blue-500/40"
                )}
              >
                {isGenerating && (
                  <motion.div 
                    className="absolute inset-0 bg-blue-500/20"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin" size={28} />
                      <span>{progress}%</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={24} className="group-hover:rotate-180 transition-transform duration-700" />
                      <span>Create Handout</span>
                    </>
                  )}
                </span>
              </button>

              {isGenerating && (
                <button
                  onClick={cancelGeneration}
                  className="px-6 py-5 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold border-2 border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center justify-center gap-2"
                  title="Stop Generation"
                >
                  <X size={20} />
                  <span>Cancel</span>
                </button>
              )}

              {(topic || details) && !isGenerating && (
                <button
                  type="button"
                  onClick={() => {
                    setTopic('');
                    setDetails('');
                    setError(null);
                  }}
                  className="px-6 rounded-2xl border-2 border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center text-neutral-400 hover:text-red-500"
                  title="Clear All"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>

            {isGenerating && (
              <div className="space-y-3">
                <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-3 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                  />
                </div>
                <button 
                  onClick={cancelGeneration}
                  className="w-full text-sm font-bold text-red-500 hover:text-red-600 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  <AlertCircle className="rotate-45" size={16} />
                  Cancel Generation
                </button>
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium flex gap-3 items-start"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={18} />
                <div className="space-y-1">
                  <p className="font-bold">Something went wrong</p>
                  <p className="opacity-90">{error}</p>
                  <button 
                    onClick={() => handleGenerate()}
                    className="mt-2 text-xs font-bold underline hover:no-underline"
                  >
                    Try Again
                  </button>
                </div>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <CheckCircle2 className="text-blue-600 mb-3" size={24} />
              <h3 className="font-bold text-neutral-900 dark:text-white">Colorful Boxes</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">Vibrant, hand-drawn style boxes for key concepts.</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <Eye className="text-emerald-600 mb-3" size={24} />
              <h3 className="font-bold text-neutral-900 dark:text-white">A4 Ready</h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">Perfectly formatted for printing and digital sharing.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="relative lg:h-[900px]">
          <AnimatePresence mode="wait">
            {!notes && !isGenerating ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed rounded-[3rem] transition-all duration-500",
                  theme === 'dark' ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-black/[0.02]"
                )}
              >
                <div className={cn(
                  "w-24 h-24 rounded-[2rem] flex items-center justify-center mb-8 rotate-12 transition-all duration-500 shadow-2xl",
                  theme === 'dark' ? "bg-white text-black" : "bg-black text-white"
                )}>
                  <Type size={48} strokeWidth={2.5} />
                </div>
                <h3 className="text-3xl font-display font-bold mb-4">Preview Area</h3>
                <p className="text-neutral-500 max-w-xs text-lg font-medium leading-relaxed">Your generated notes will appear here in a beautiful educational handout format.</p>
              </motion.div>
            ) : (
              <motion.div 
                key="preview"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex justify-between items-center mb-6 px-4">
                  <h3 className="font-display font-bold flex items-center gap-3 text-xl">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      theme === 'dark' ? "bg-white/10 text-white" : "bg-black/10 text-black"
                    )}>
                      <Eye size={18} />
                    </div>
                    Handout Preview
                  </h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleFlowchartSummary}
                      disabled={isGenerating || noteBlocks.length === 0}
                      className={cn(
                        "p-2 rounded-xl border transition-all duration-300 flex items-center gap-2 text-xs font-bold no-print",
                        theme === 'dark' 
                          ? "bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20" 
                          : "bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100",
                        (isGenerating || noteBlocks.length === 0) && "opacity-50 cursor-not-allowed"
                      )}
                      title="Generate 1-Page Flowchart Summary"
                    >
                      <Zap size={14} className="fill-current" />
                      <span className="hidden sm:inline">Summary Flowchart</span>
                    </button>

                    <button
                      onClick={addManualBlock}
                      className={cn(
                        "p-2 rounded-xl border transition-all duration-300 flex items-center gap-2 text-xs font-bold no-print",
                        theme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-black/5 border-black/10 hover:bg-black/10"
                      )}
                      title="Add Manual Note Block"
                    >
                      <Plus size={14} />
                      <span className="hidden sm:inline">Add Note</span>
                    </button>

                    <button
                      onClick={() => {
                        setNotes(null);
                        setNoteBlocks([]);
                      }}
                      className={cn(
                        "p-2 rounded-xl border transition-all duration-300 flex items-center gap-2 text-xs font-bold text-red-500",
                        theme === 'dark' ? "bg-red-500/5 border-red-500/10 hover:bg-red-500/10" : "bg-red-50 border-red-100 hover:bg-red-100"
                      )}
                      title="Clear All Notes"
                    >
                      <Trash2 size={14} />
                    </button>

                    <button
                      onClick={() => setPreviewTheme(prev => prev === 'light' ? 'dark' : 'light')}
                      className={cn(
                        "p-2 rounded-xl border transition-all duration-300 flex items-center gap-2 text-xs font-bold",
                        theme === 'dark' ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-black/5 border-black/10 hover:bg-black/10"
                      )}
                      title="Toggle Preview Theme"
                    >
                      {previewTheme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                    </button>

                    <div className={cn(
                      "flex items-center gap-1 p-1 rounded-xl border transition-all duration-300",
                      theme === 'dark' ? "bg-white/5 border-white/10" : "bg-black/5 border-black/10"
                    )}>
                      <button
                        onClick={() => setFontSize(prev => Math.max(12, prev - 2))}
                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Decrease Font Size"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-[10px] font-bold w-6 text-center">{fontSize}</span>
                      <button
                        onClick={() => setFontSize(prev => Math.min(48, prev + 2))}
                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Increase Font Size"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => setFontSize(20)}
                        className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors text-blue-500"
                        title="Reset Font Size"
                      >
                        <RotateCcw size={14} />
                      </button>
                    </div>
                  </div>
                </div>

              <div className={cn(
                  "flex-1 overflow-auto rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] border custom-scrollbar transition-all duration-500 relative preview-scroll-container",
                  previewTheme === 'dark' 
                    ? "border-white/10 bg-neutral-900" 
                    : "border-black/10 bg-white"
                )}>
                  <div 
                    ref={noteRef}
                    className={cn(
                      "lined-paper min-h-full transition-all duration-500 py-16 px-10",
                      fontStyle === 'hand' && "font-hand",
                      fontStyle === 'kalam' && "font-kalam",
                      fontStyle === 'sans' && "font-sans",
                      fontStyle === 'serif' && "font-serif",
                      fontStyle === 'mono' && "font-mono",
                      previewTheme === 'light' ? "preview-light paper-theme" : "preview-dark dark"
                    )}
                    style={{ fontSize: `${fontSize}px` }}
                  >
                    <div className="max-w-2xl mx-auto">
                      <div className="text-center mb-16">
                        <h1 className={cn(
                          "text-6xl font-display font-bold note-heading inline-block mb-4 transition-colors duration-500",
                          previewTheme === 'dark' ? "text-white" : "text-black"
                        )}
                        style={{ 
                          textDecorationColor: previewTheme === 'dark' ? '#3b82f6' : '#2563eb',
                          fontFamily: fontStyle === 'hand' ? 'var(--font-hand)' : 
                                      fontStyle === 'kalam' ? 'var(--font-kalam)' : 
                                      fontStyle === 'sans' ? 'var(--font-sans)' : 
                                      fontStyle === 'serif' ? 'var(--font-serif)' : 
                                      'var(--font-mono)'
                        }}
                        >
                          {topic}
                        </h1>
                        <div className="flex items-center justify-center gap-4">
                          <div className={cn("h-[1px] w-8 bg-gradient-to-r from-transparent to-blue-500")} />
                          <p className="text-blue-500 font-kalam text-sm tracking-[0.3em] uppercase font-bold">{brandingTag}</p>
                          <div className={cn("h-[1px] w-8 bg-gradient-to-l from-transparent to-blue-500")} />
                        </div>
                      </div>

                      <div className={cn("notes-body-content", isPrintFriendly && "print-friendly")}>
                        <MarkdownRenderer content={notes || ''} blocks={noteBlocks} />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className={cn(
        "max-w-7xl mx-auto px-8 py-24 border-t text-center transition-all duration-500 relative z-10 no-print",
        theme === 'dark' ? "border-white/5 text-neutral-500" : "border-black/5 text-neutral-400"
      )}>
        <div className="flex flex-col items-center gap-6">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
            theme === 'dark' ? "bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400" : "bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600"
          )}>
            <FileText size={24} />
          </div>
          <div className="space-y-2">
            <p className="font-display font-bold tracking-[0.4em] uppercase text-[10px] bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-purple-500">NoteGenie AI Engine v1.2</p>
            <p className="text-sm opacity-60">Visual learning reimagined for the modern student.</p>
          </div>
          <p className="text-xs opacity-40 mt-8">© 2026 NoteGenie AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
