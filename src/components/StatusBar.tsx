"use client";

import React, { useEffect, useState } from "react";
import { useOthers, useStatus } from "@liveblocks/react/suspense";

type StatusBarProps = {
  editorRef?: React.RefObject<any>;
};

function mapLanguageId(id: string | undefined): string {
  if (!id) return "Plain Text";
  return id.charAt(0).toUpperCase() + id.slice(1);
}

const StatusBar: React.FC<StatusBarProps> = ({ editorRef }) => {
  const [line, setLine] = useState(1);
  const [col, setCol] = useState(1);
  const [spaces] = useState(2);
  const [encoding] = useState("UTF-8");
  const [eol, setEol] = useState<"LF" | "CRLF">("LF");
  const [language, setLanguage] = useState("Plain Text");

  // Liveblocks hooks
  const others = useOthers();
  const status = useStatus();

  const [ping, setPing] = useState<number | null>(null);

  useEffect(() => {
    const measurePing = async () => {
      const start = performance.now();
      try {
        await fetch('/api/ping');
        const end = performance.now();
        setPing(Math.round(end - start));
      } catch (e) {
        setPing(null);
      }
    };

    measurePing();
    const interval = setInterval(measurePing, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!editorRef) return;
    let editor: any = editorRef.current;
    let disposables: any[] = [];
    let poll: any = null;

    const connect = () => {
      editor = editorRef.current;
      if (!editor) return false;

      const readState = () => {
        const pos = editor.getPosition?.();
        const model = editor.getModel?.();

        if (pos) {
          setLine(pos.lineNumber);
          setCol(pos.column);
        }

        if (model) {
          const langId = model.getLanguageId?.();
          setLanguage(mapLanguageId(langId));
          setEol(model.getEOL?.() === "\r\n" ? "CRLF" : "LF");
        }
      };

      readState();

      disposables = [
        editor.onDidChangeCursorPosition?.(readState),
        editor.onDidChangeModel?.(readState),
        editor.onDidChangeModelContent?.(readState),
      ].filter(Boolean);

      return true;
    };

    if (!connect()) {
      poll = setInterval(() => {
        if (connect()) {
          clearInterval(poll);
          poll = null;
        }
      }, 100);
    }

    return () => {
      disposables.forEach((d) => d?.dispose?.());
      if (poll) clearInterval(poll);
    };
  }, [editorRef]);

  const statusColor = status === "connected" ? "#10b981" : status === "connecting" ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        fontSize: 12,
        height: "100%",
        padding: "0 12px",
      }}
    >
      {/* LEFT SIDE */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: statusColor }} />
          <span>{status === "connected" ? "Online" : status}</span>
          {status === "connected" && (
            <span
              title="Ping"
              style={{
                opacity: 0.7,
                marginLeft: 8,
                width: '40px',
                display: 'inline-block',
                cursor: 'help'
              }}
            >
              {ping !== null ? `${ping}ms` : ''}
            </span>
          )}
        </div>
        <span>{`Ln ${line}, Col ${col}`}</span>
        <span>{language}</span>
      </div>

      {/* RIGHT SIDE */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div title={others.map(o => o.info?.name).join(", ")} style={{ cursor: "help" }}>
          {others.length} user{others.length !== 1 ? "s" : ""} connected
        </div>
        <span>{`Spaces: ${spaces}`}</span>
        <span>{encoding}</span>
        <span>{eol}</span>
      </div>
    </div>
  );
};

export { StatusBar };
export default StatusBar;
