"use client";

import React, { useState, useImperativeHandle, useEffect } from "react";
import styles from "./Terminal.module.css";
import { useFileSystem } from "@/context/FileSystem";

export const TerminalPanel = React.forwardRef(function TerminalPanel(
  { visible = true, editorRef }: { visible?: boolean; editorRef?: React.RefObject<any> },
  ref: React.Ref<any>
) {
  const { activeFile, getFileContent } = useFileSystem();
  const [open, setOpen] = useState<boolean>(visible);
  React.useEffect(() => {
    console.debug("TerminalPanel: visible prop changed ->", visible);
    setOpen(visible);
  }, [visible]);
  const [language, setLanguage] = useState<string | null>("javascript");
  const [detectedFriendly, setDetectedFriendly] = useState<string | null>(null);
  const [detectedKind, setDetectedKind] = useState<"supported" | "unsupported" | "no-compiler" | "unknown">("unknown");
  const [output, setOutput] = useState<string>("");
  const [stdin, setStdin] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const detectLanguageFromFilename = (filename?: string | null) => {
    if (!filename) return { lang: null, friendly: null, kind: "unknown" as const };
    const ext = filename.split(".").pop()?.toLowerCase() || "";
    const map: Record<string, { lang: string; friendly: string }> = {
      c: { lang: "c", friendly: "C" },
      cpp: { lang: "cpp", friendly: "C++" },
      cc: { lang: "cpp", friendly: "C++" },
      h: { lang: "c", friendly: "C Header" },
      py: { lang: "python", friendly: "Python" },
      js: { lang: "javascript", friendly: "JavaScript" },
      ts: { lang: "typescript", friendly: "TypeScript" },
      java: { lang: "java", friendly: "Java" },
      go: { lang: "go", friendly: "Go" },
      rs: { lang: "rust", friendly: "Rust" },
      rb: { lang: "ruby", friendly: "Ruby" },
      php: { lang: "php", friendly: "PHP" },
      swift: { lang: "swift", friendly: "Swift" },
      kt: { lang: "kotlin", friendly: "Kotlin" },
      scala: { lang: "scala", friendly: "Scala" },
      html: { lang: "html", friendly: "HTML" },
      htm: { lang: "html", friendly: "HTML" },
      gohtml: { lang: "html", friendly: "HTML" },
      sh: { lang: "bash", friendly: "Shell" },
      bash: { lang: "bash", friendly: "Shell" },
      txt: { lang: "text", friendly: "Text" },
      md: { lang: "markdown", friendly: "Markdown" },
    };

    const noCompiler = new Set(["md", "txt", "json", "yaml", "yml", "mdx"]);
    const unsupported = new Set(["r"]);

    if (noCompiler.has(ext)) {
      return { lang: null, friendly: ext === "md" ? "Markdown" : ext.toUpperCase(), kind: "no-compiler" as const };
    }

    if (unsupported.has(ext)) {
      return { lang: null, friendly: ext.toUpperCase(), kind: "unsupported" as const };
    }

    if (map[ext]) {
      return { lang: map[ext].lang, friendly: map[ext].friendly, kind: "supported" as const };
    }

    return { lang: null, friendly: ext ? ext.toUpperCase() : null, kind: "unknown" as const };
  };

  useEffect(() => {
    const filename = activeFile || null;
    const detected = detectLanguageFromFilename(filename || null);
    setLanguage(detected.lang);
    setDetectedFriendly(detected.friendly);
    setDetectedKind(detected.kind);
  }, [activeFile]);

  const run = async () => {
    setLoading(true);
    setOutput("");
    let code = "";
    let filename = "main";

    if (editorRef?.current) {
      code = editorRef.current.getValue?.() || "";
      if (activeFile) {
        filename = activeFile.split("/").pop() || "main";
      }
    } else if (activeFile) {
      code = getFileContent(activeFile);
      filename = activeFile.split("/").pop() || "main";
    }

    if (detectedKind === "unsupported") {
      setOutput(`${detectedFriendly || "This"} language is not supported.`);
      setLoading(false);
      setOpen(true);
      return;
    }
    if (detectedKind === "no-compiler") {
      setOutput(`${detectedFriendly || "This"} files do not require compilation.`);
      setLoading(false);
      setOpen(true);
      return;
    }
    if (!language) {
      setOutput(`Cannot determine language for this file type.`);
      setLoading(false);
      setOpen(true);
      return;
    }
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
  language,
  stdin,
  files: [{ name: filename, content: code }],
}),

      });
      const data = await res.json();
      if (data.run) {
        setOutput((data.run.stdout || "") + (data.run.stderr ? `\nERROR:\n${data.run.stderr}` : ""));
      } else if (data.output) {
        setOutput(data.output);
      } else if (data.stdout || data.stderr) {
        setOutput((data.stdout || "") + (data.stderr ? `\nERROR:\n${data.stderr}` : ""));
      } else {
        setOutput(JSON.stringify(data, null, 2));
      }
    } catch (err: any) {
      setOutput(String(err?.message || err));
    } finally {
      setLoading(false);
      setOpen(true);
    }
  };

  useImperativeHandle(ref, () => ({ run }));


  return (
  <div
    className={styles.container}
    style={{ display: open ? "flex" : "none", height: "100%" }}
  >
    <div className={styles.toolbar}>
      <div className={styles.controls}>
        <div style={{ color: "#cfcfcf", fontSize: 13 }}>
          Detected: {detectedFriendly || "Unknown"}{" "}
          {detectedKind === "unsupported"
            ? "(unsupported)"
            : detectedKind === "no-compiler"
            ? "(no compiler needed)"
            : ""}
        </div>
      </div>
      {/* optional: show loading / run status */}
      {loading && (
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#cccccc" }}>
          Running...
        </div>
      )}
    </div>

    {/* Output area */}
    <div className={styles.output}>
      <pre>{output}</pre>
    </div>

    {/* Stdin input area */}
    <div className={styles.inputBar}>
      <textarea
        className={styles.stdin}
        placeholder="Program input (stdin)…"
        value={stdin}
        onChange={(e) => setStdin(e.target.value)}
      />
      <button
        className={styles.runButton}
        onClick={run}
        disabled={loading}
      >
        Run
      </button>
    </div>
  </div>
);

});

export default TerminalPanel;
