import React, { useState } from "react";
import type { ChangeEvent } from 'react';
import MarkdownEditor from "./MarkdownEditor";
import MarkdownPreview from "./MarkdownPreview";
import { saveAs } from "file-saver";
import { FiDownload } from "react-icons/fi";
import { LuImport } from "react-icons/lu";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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
  const [isHtmlPreview, setIsHtmlPreview] = useState(false);

  const handleMarkdownChange = (value: string) => {
    setMarkdown(value);
    if (onChange) onChange(value);
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

  // Function to count lines, words, and characters
  const countMarkdownStats = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim() !== ""); // Filter out empty lines
    const words = text.split(/\s+/).filter((word) => word.length > 0); // Filter out empty strings
    const characters = text.length; // Total character count

    return {
      lineCount: lines.length,
      wordCount: words.length,
      charCount: characters,
    };
  };

  const { lineCount, wordCount, charCount } = countMarkdownStats(markdown);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`${height} flex flex-col bg-white rounded-lg shadow-sm border border-gray-200`}>
        <div className={`flex flex-col flex-grow max-[1050px]:hidden`}>
          <header className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <input
                className="bg-transparent border border-gray-200 py-1.5 px-3 rounded-md focus:outline-none focus:ring-2 focus:ring-neutral-700 text-sm"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Document Name"
              />
              <button
                className="bg-neutral-700 hover:bg-neutral-950 text-white font-medium text-sm py-1.5 px-4 rounded-md transition-colors"
                onClick={handleSave}
                type="button"
              >
                Save
              </button>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => handleDownload("markdown")}
                className="flex items-center gap-1 border border-gray-200 text-neutral-700 font-medium text-sm py-1.5 px-3 rounded-md hover:bg-gray-50 transition-colors"
                type="button"
              >
                <FiDownload />
                Download
              </button>

              <input
                type="file"
                onChange={handleImport}
                className="hidden"
                id="md-file-upload"
                accept=".md,.txt"
              />
              <label
                htmlFor="md-file-upload"
                className="flex items-center gap-1 border border-gray-200 text-neutral-700 font-medium text-sm py-1.5 px-3 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <LuImport className="w-4 h-4" />
                Import
              </label>
            </div>
          </header>

          <div className="flex flex-grow overflow-hidden">
            <div className="w-full flex flex-col overflow-hidden">
              <div className="flex flex-grow p-2 overflow-hidden">
                <MarkdownEditor
                  markdown={markdown}
                  onMarkdownChange={handleMarkdownChange}
                />

                <MarkdownPreview
                  markdown={markdown}
                  isHtmlPreview={isHtmlPreview}
                  setIsHtmlPreview={setIsHtmlPreview}
                />
              </div>
              {/* Display stats at the bottom */}
              <div className="px-4 py-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500 bg-gray-50">
                <span className="border border-gray-200 bg-white rounded-md px-2 py-0.5">
                  Lines: {lineCount}
                </span>
                <span className="border border-gray-200 bg-white rounded-md px-2 py-0.5">
                  Words: {wordCount}
                </span>
                <span className="border border-gray-200 bg-white rounded-md px-2 py-0.5">
                  Characters: {charCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Warning */}
        <div className="min-[1050px]:hidden flex items-center justify-center p-8 text-center">
          <p className="text-gray-600 text-sm">
            The Markdown Editor is best viewed on a larger screen (desktop/laptop).
          </p>
        </div>
      </div>
    </DndProvider>
  );
}

export default MarkdownManager;
