import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import type { SandpackTheme } from "@codesandbox/sandpack-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { newFilePath, starterContent } from "./newFilePath";
import { candidateFiles } from "../session/files";

type Files = Record<string, string>;

// VS Code 다크 계열. 미리보기는 응시자가 만드는 화면이라 흰 바탕 그대로 둔다.
const editorTheme: SandpackTheme = {
  colors: {
    surface1: "#1f1f1f",
    surface2: "#2b2b2b",
    surface3: "#2a2d2e",
    clickable: "#9d9d9d",
    base: "#d4d4d4",
    disabled: "#5a5a5a",
    hover: "#ffffff",
    accent: "#4fa3ff",
    error: "#f48771",
    errorSurface: "#3a1d1d",
  },
  syntax: {
    plain: "#d4d4d4",
    comment: { color: "#6a9955", fontStyle: "italic" },
    keyword: "#c586c0",
    tag: "#569cd6",
    punctuation: "#d4d4d4",
    definition: "#dcdcaa",
    property: "#9cdcfe",
    static: "#b5cea8",
    string: "#ce9178",
  },
  font: {
    body: '"Pretendard Variable", Pretendard, -apple-system, system-ui, sans-serif',
    mono: '"JetBrains Mono", "D2Coding", ui-monospace, SFMono-Regular, Menlo, monospace',
    size: "13.5px",
    lineHeight: "21px",
  },
};

function FilesBridge({ onFilesChange }: { onFilesChange: (files: Files) => void }) {
  const { sandpack } = useSandpack();
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const files: Files = {};
    for (const [path, f] of Object.entries(sandpack.files)) files[path] = f.code;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onFilesChange(candidateFiles(files)), 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [sandpack.files, onFilesChange]);
  return null;
}

/** 파일 탐색기 위의 "새 파일" 입력. Sandpack 탐색기는 파일 만들기를 지원하지 않아 따로 둔다. */
function NewFile() {
  const { sandpack } = useSandpack();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = () => {
    const r = newFilePath(name, Object.keys(sandpack.files));
    if ("error" in r) {
      setError(r.error);
      return;
    }
    sandpack.updateFile(r.path, starterContent(r.path));
    sandpack.openFile(r.path);
    setOpen(false);
    setName("");
    setError(null);
  };

  if (!open) {
    return (
      <button type="button" className="new-file-btn" onClick={() => setOpen(true)}>
        + 새 파일
      </button>
    );
  }
  return (
    <form
      className="new-file-form"
      onSubmit={(e) => {
        e.preventDefault();
        create();
      }}
    >
      <input
        autoFocus
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        placeholder="useDebounce.js"
        aria-label="새 파일 이름 (src 아래)"
      />
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

export function SandpackWorkbench({ files, visibleFiles, activeFile, onFilesChange, previewFooter }: { files: Files; visibleFiles: string[]; activeFile: string; onFilesChange: (files: Files) => void; previewFooter?: ReactNode }) {
  return (
    <SandpackProvider
      template="react"
      files={files}
      options={{ visibleFiles, activeFile, recompileMode: "delayed", recompileDelay: 600 }}
      theme={editorTheme}
      style={{ height: "100%" }}
    >
      <FilesBridge onFilesChange={onFilesChange} />
      <SandpackLayout style={{ height: "100%", border: 0, borderRadius: 0 }}>
        <div style={{ height: "100%", minWidth: 150, flex: "0 0 150px", display: "flex", flexDirection: "column", background: "#1f1f1f" }}>
          <NewFile />
          <SandpackFileExplorer autoHiddenFiles style={{ flex: 1, minHeight: 0 }} />
        </div>
        <SandpackCodeEditor showLineNumbers showTabs closableTabs={false} showInlineErrors style={{ height: "100%", flex: 1, minWidth: 0 }} />
        <div style={{ height: "100%", flex: "0 0 38%", minWidth: 320, display: "flex", flexDirection: "column" }}>
          <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton style={{ flex: 1, minHeight: 0 }} />
          {previewFooter}
        </div>
      </SandpackLayout>
    </SandpackProvider>
  );
}
