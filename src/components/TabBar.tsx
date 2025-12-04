"use client";

import { useFileSystem } from "@/context/FileSystem";
import styles from "./TabBar.module.css";
import { useRoom } from "@liveblocks/react/suspense";
import { useEffect, useRef } from "react";

export function TabBar({ editorRef }: { editorRef?: React.RefObject<any> }) {
  const {
    files,
    openFiles,
    activeFile,
    setActiveFile,
    closeTab,
  } = useFileSystem();

  const getName = (path: string) =>
    files.find((f) => f.path === path)?.name ?? path;

  const handleRun = async () => {
    try {
      const fn = (window as any).__fincord_run_active_file__;
      if (typeof fn === "function") {
        await fn();
      }
    } catch (e) {
      console.error("Run failed", e);
    }
  };

  return (
    <div className={styles.tabbar}>
      <div className={styles.tabs}>
        {openFiles.map((path) => {
          const isActive = path === activeFile;
          return (
            <div
              key={path}
              className={`${styles.tab} ${isActive ? styles.active : ""}`}
              onClick={() => setActiveFile(path)}
            >
              <span className={styles.tabIcon}>📄</span>
              <span className={styles.tabName}>{getName(path)}</span>
              <button
                className={styles.tabClose}
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(path);
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <div className={styles.controls}>
        <button className={styles.controlBtn} onClick={handleRun} title="Run (Ctrl+Enter)">▶</button>
        <div className={styles.separator} />
        <button
          className={styles.controlBtn}
          onClick={() => editorRef?.current?.trigger("", "undo", null)}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          className={styles.controlBtn}
          onClick={() => editorRef?.current?.trigger("", "redo", null)}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>
    </div>
  );
}
