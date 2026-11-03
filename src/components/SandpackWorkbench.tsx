import {
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  useSandpack,
} from "@codesandbox/sandpack-react";
import { useEffect, useRef } from "react";

type Files = Record<string, string>;

function FilesBridge({ onFilesChange }: { onFilesChange: (files: Files) => void }) {
  const { sandpack } = useSandpack();
  const timer = useRef<number | null>(null);
  useEffect(() => {
    const files: Files = {};
    for (const [path, f] of Object.entries(sandpack.files)) files[path] = f.code;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onFilesChange(files), 800);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [sandpack.files, onFilesChange]);
  return null;
}

export function SandpackWorkbench({ files, visibleFiles, activeFile, onFilesChange }: { files: Files; visibleFiles: string[]; activeFile: string; onFilesChange: (files: Files) => void }) {
  return (
    <SandpackProvider
      template="react"
      files={files}
      options={{ visibleFiles, activeFile, recompileMode: "delayed", recompileDelay: 600 }}
      theme="light"
      style={{ height: "100%" }}
    >
      <FilesBridge onFilesChange={onFilesChange} />
      <SandpackLayout style={{ height: "100%", border: 0, borderRadius: 0 }}>
        <SandpackFileExplorer autoHiddenFiles style={{ height: "100%", minWidth: 150, flex: "0 0 150px" }} />
        <SandpackCodeEditor showLineNumbers showTabs closableTabs={false} showInlineErrors style={{ height: "100%", flex: 1, minWidth: 0 }} />
        <SandpackPreview showOpenInCodeSandbox={false} showRefreshButton style={{ height: "100%", flex: "0 0 38%", minWidth: 320 }} />
      </SandpackLayout>
    </SandpackProvider>
  );
}
