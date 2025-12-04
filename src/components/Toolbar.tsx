import styles from "./Toolbar.module.css";
import { editor } from "monaco-editor";

type Props = {
  editor: editor.IStandaloneCodeEditor;
};

export function Toolbar({ editor }: Props) {
  return (
    <div className={styles.toolbar}>
      <button
        className={styles.button}
        onClick={() => {
          try {
            const fn = (window as any).__fincord_run_active_file__;
            if (typeof fn === "function") {
              fn();
            } else {
              console.debug("Toolbar: run function not available");
            }
          } catch (e) {
            console.warn("Toolbar: run click failed", e);
          }
        }}
        title="Run File"
      >
        ▶
      </button>

      <button
        className={styles.button}
        onClick={() => editor.trigger("", "undo", null)}
        aria-label="undo"
        title="Undo (Ctrl+Z)"
      >
        ↶
      </button>
      <button
        className={styles.button}
        onClick={() => editor.trigger("", "redo", null)}
        aria-label="redo"
        title="Redo (Ctrl+Y)"
      >
        ↷
      </button>
      <div className={styles.separator}></div>
      
    </div>
  );
}
