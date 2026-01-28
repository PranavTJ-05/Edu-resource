import React, { useState, useEffect, useRef } from "react";
import type { ChangeEvent } from 'react';
import { saveAs } from "file-saver";
import { FiDownload, FiBold, FiItalic, FiList, FiLink, FiImage } from "react-icons/fi";
import { LuImport, LuMaximize, LuMinimize, LuPenLine, LuClipboard, LuClipboardCheck, LuHeading1, LuHeading2, LuQuote, LuCode } from "react-icons/lu";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Link } from "react-router-dom";
import { atomOneLight } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Stackedit from 'stackedit-js';

interface MarkdownManagerProps {
  initialValue?: string;
  onSave?: (markdown: string, documentName: string) => void;
  onChange?: (markdown: string) => void;
  height?: string;
}

const MarkdownManager: React.FC<MarkdownManagerProps> = ({
  initialValue = "",
  onSave,
  onChange,
  height = "h-screen"
}) => {
  const [markdown, setMarkdown] = useState(initialValue);
  const [documentName, setDocumentName] = useState("Untitled.md");
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMarkdown(initialValue);
  }, [initialValue]);

  // Throttled Scroll Handler
  const scrollingRef = useRef(false);

  const handleScroll = (source: 'editor' | 'preview') => {
    if (viewMode !== 'split') return;
    if (scrollingRef.current) return;

    scrollingRef.current = true;
    requestAnimationFrame(() => {
      if (textareaRef.current && previewRef.current) {
        const editor = textareaRef.current;
        const preview = previewRef.current;

        if (source === 'editor') {
          const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
          preview.scrollTop = percentage * (preview.scrollHeight - preview.clientHeight);
        } else {
          // Optional: Sync preview -> editor
          // const percentage = preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
          // editor.scrollTop = percentage * (editor.scrollHeight - editor.clientHeight);
        }
      }
      scrollingRef.current = false;
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    });
  };

  const openStackEdit = () => {
    const stackedit = new Stackedit();

    stackedit.openFile({
      name: documentName,
      content: {
        text: markdown
      }
    });

    stackedit.on('fileChange', (file: any) => {
      const content = file.content.text;
      setMarkdown(content);
      if (onChange) onChange(content);
    });
  };

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selected + suffix + after;
    setMarkdown(newText);
    if (onChange) onChange(newText);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const handleDownload = (format: string) => {
    if (format === "markdown") {
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      saveAs(blob, documentName);
    }
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setMarkdown(content);
        if (onChange) onChange(content);
      };
      reader.readAsText(e.target.files[0]);
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(markdown, documentName);
    }
  };

  const countMarkdownStats = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim() !== "");
    const words = text.split(/\s+/).filter((word) => word.length > 0);
    const characters = text.length;

    return {
      lineCount: lines.length,
      wordCount: words.length,
      charCount: characters,
    };
  };

  const { lineCount, wordCount, charCount } = countMarkdownStats(markdown);

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div
      className={`flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out ${isFullScreen
        ? "fixed inset-0 z-50 rounded-none border-0"
        : height
        }`}
    >
      <div className={`flex flex-col h-full`}>
        {/* Main Toolbar - Dark Themed like StackEdit */}
        <header className="flex-none flex justify-between items-center px-4 py-2 border-b border-gray-200 bg-[#2c2c2c] text-gray-300 relative z-10">
          <div className="flex items-center gap-1">
            {/* Toolbar Actions */}
            <button onClick={() => insertMarkdown('**', '**')} title="Bold" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><FiBold className="w-4 h-4" /></button>
            <button onClick={() => insertMarkdown('*', '*')} title="Italic" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><FiItalic className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-gray-600 mx-1"></div>
            <button onClick={() => insertMarkdown('# ')} title="Heading 1" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><LuHeading1 className="w-4 h-4" /></button>
            <button onClick={() => insertMarkdown('## ')} title="Heading 2" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><LuHeading2 className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-gray-600 mx-1"></div>
            <button onClick={() => insertMarkdown('> ')} title="Quote" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><LuQuote className="w-4 h-4" /></button>
            <button onClick={() => insertMarkdown('`', '`')} title="Code" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><LuCode className="w-4 h-4" /></button>
            <button onClick={() => insertMarkdown('- ')} title="List" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><FiList className="w-4 h-4" /></button>
            <div className="h-4 w-px bg-gray-600 mx-1"></div>
            <button onClick={() => insertMarkdown('[', '](url)')} title="Link" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><FiLink className="w-4 h-4" /></button>
            <button onClick={() => insertMarkdown('![alt text](', ')')} title="Image" className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"><FiImage className="w-4 h-4" /></button>

            {/* Open StackEdit Button moved to toolbar for deeper editing */}
            <div className="h-4 w-px bg-gray-600 mx-2"></div>

          </div>

          <div className="flex items-center gap-4">
            {/* Document Name Input - Styled darker */}
            <input
              className="bg-[#3c3c3c] border border-[#555] py-1 px-3 rounded text-gray-200 focus:outline-none focus:border-blue-500 text-sm w-40 text-center placeholder-gray-500"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Document Name"
              title="Document Name"
            />

            <div className="flex items-center">
              <button
                onClick={toggleFullScreen}
                className="p-1.5 hover:bg-[#444] rounded text-gray-300 hover:text-white transition-colors"
                title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
              >
                {isFullScreen ? <LuMinimize className="w-4 h-4" /> : <LuMaximize className="w-4 h-4" />}
              </button>
            </div>

            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-1 px-4 rounded transition-colors shadow-sm"
              onClick={handleSave}
              type="button"
            >
              Save
            </button>
          </div>
        </header>

        {/* Sub-toolbar / Secondary Actions + View Toggles */}
        <div className="flex-none bg-[#f0f0f0] border-b border-gray-200 px-4 py-1.5 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium mr-1">View:</span>
            <button
              onClick={() => setViewMode('editor')}
              className={`px-2 py-0.5 rounded border transition-colors ${viewMode === 'editor' ? 'bg-white border-blue-400 text-blue-700 shadow-sm' : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-200'}`}
              title="Editor Only"
            >
              Editor
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`px-2 py-0.5 rounded border transition-colors ${viewMode === 'split' ? 'bg-white border-blue-400 text-blue-700 shadow-sm' : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-200'}`}
              title="Split View"
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-2 py-0.5 rounded border transition-colors ${viewMode === 'preview' ? 'bg-white border-blue-400 text-blue-700 shadow-sm' : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-200'}`}
              title="Preview Only"
            >
              Preview
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
              title="Copy Markdown"
            >
              {isCopied ? <LuClipboardCheck className="w-3.5 h-3.5 text-green-600" /> : <LuClipboard className="w-3.5 h-3.5" />}
              <span>Copy</span>
            </button>
            <div className="w-px bg-gray-300 h-4"></div>
            <button
              onClick={() => handleDownload("markdown")}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <div className="w-px bg-gray-300 h-4"></div>
            <label
              htmlFor="md-file-upload"
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <LuImport className="w-3.5 h-3.5" />
              <span>Import</span>
            </label>
            <input
              type="file"
              onChange={handleImport}
              className="hidden"
              id="md-file-upload"
              accept=".md,.txt"
            />
          </div>
        </div>

        {/* Main Content Area - Strict flex constraints */}
        <div className="flex-1 min-h-0 relative">
          <div className="flex w-full h-full">
            {/* Left Side: Editor (Textarea) */}
            <div
              className={`${viewMode === 'preview' ? 'hidden' : viewMode === 'editor' ? 'w-full' : 'w-1/2'} h-full border-r border-gray-200 flex flex-col relative bg-gray-50 transition-all duration-200`}
            >
              <textarea
                ref={textareaRef}
                className="w-full h-full resize-none p-6 focus:outline-none focus:ring-0 text-sm font-mono text-gray-800 leading-relaxed bg-white overflow-y-auto min-h-0"
                value={markdown}
                onChange={(e) => {
                  setMarkdown(e.target.value);
                  if (onChange) onChange(e.target.value);
                }}
                onScroll={() => handleScroll('editor')}
                placeholder="Type your markdown here..."
              />
            </div>

            {/* Right Side: Preview */}
            <div
              ref={previewRef}
              className={`${viewMode === 'editor' ? 'hidden' : viewMode === 'preview' ? 'w-full' : 'w-1/2'} h-full overflow-auto p-8 bg-white transition-all duration-200`}
              id="preview-content"
              onScroll={() => handleScroll('preview')}
            >
              {markdown ? (
                <div className="prose max-w-none prose-headings:font-semibold prose-a:text-blue-600 prose-img:rounded-md">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-[2em] text-[#24292e] font-semibold mt-[24px] mb-[16px] border-b pb-[.3rem] border-[#eaecef]">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-[1.5em] text-[#24292e] mt-[24px] mb-[16px] font-semibold pb-[.3rem] border-b border-[#eaecef]">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-[1.2em] mt-[24px] mb-[16px] text-[#24292e] font-semibold pb-[.3rem] border-b border-[#eaecef]">
                          {children}
                        </h3>
                      ),
                      h4: ({ children }) => (
                        <h4 className="text-[1em] text-[#24292e]  mt-[24px] mb-[16px] font-semibold pb-[.3rem] border-b border-[#eaecef]">
                          {children}
                        </h4>
                      ),
                      p: ({ children }) => <p className="mb-[16px] leading-7">{children}</p>,
                      a: ({ children, href }) => {
                        const getYoutubeId = (url: string | undefined) => {
                          if (!url) return null;
                          const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                          const match = url.match(regExp);
                          return (match && match[2].length === 11) ? match[2] : null;
                        };

                        const youtubeId = getYoutubeId(href);

                        if (youtubeId) {
                          return (
                            <div className="my-4 relative w-full pt-[56.25%] rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-black">
                              <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                title="YouTube video player"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              ></iframe>
                            </div>
                          );
                        }

                        return (
                          <a
                            href={href || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0366d6] hover:underline"
                            onClick={(e) => {
                              // If it's an internal link handled by router, we could use navigate, 
                              // but for now standard <a> is safer for generic Markdown links which form external or hashed links
                            }}
                          >
                            {children}
                          </a>
                        );
                      },
                      code({ inline, className, children, ...props }: any) {
                        const match = /language-(\w+)/.exec(className || "");
                        return !inline && match ? (
                          <div className="rounded-md overflow-hidden bg-gray-50 my-4 border border-gray-100">
                            <SyntaxHighlighter
                              style={atomOneLight}
                              language={match[1]}
                              PreTag="div"
                              customStyle={{ background: 'transparent', margin: 0, padding: '1rem' }}
                              {...props}
                            >
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code className="bg-gray-100 text-[#24292e] px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200">
                            {children}
                          </code>
                        );
                      },
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-4 text-gray-600 italic bg-gray-50 rounded-r">
                          {children}
                        </blockquote>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc ml-6 flex flex-col gap-[.25em] mb-4">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal ml-6 flex flex-col gap-[.25em] mb-4">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="text-[#24292e] leading-7">{children}</li>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4 border border-gray-200 rounded">
                          <table className="w-full border-collapse">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-gray-50 border-b border-gray-200">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => <tbody>{children}</tbody>,
                      tr: ({ children }) => (
                        <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">{children}</tr>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-3 text-gray-600">{children}</td>
                      ),
                      img: ({ src, alt }) => (
                        <img src={src} alt={alt} className="max-w-full h-auto rounded shadow-sm my-4 border border-gray-100" />
                      )
                    }}
                  >
                    {markdown}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <p>Preview will appear here...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Display stats at the bottom - Styled dark to match StackEdit footer usually */}
        <div className="px-4 py-1.5 border-t border-gray-200 bg-[#f7f7f7] flex items-center justify-between text-[11px] text-gray-500 font-mono">
          <div className="flex gap-4">
            <span>LINES: {lineCount}</span>
            <span>WORDS: {wordCount}</span>
            <span>CHARS: {charCount}</span>
          </div>
          <div>Markdown</div>
        </div>
      </div>
    </div>
  );
}

export default MarkdownManager;

