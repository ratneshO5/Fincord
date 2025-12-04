"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";


type YjsProvider = {
  getYDoc: () => any; // Y.Doc
  awareness: any;
};

type FileType = "file" | "folder";

export type FileEntry = {
  path: string;              // e.g. "main.ts" or "src/index.ts"
  name: string;              // last segment of path, e.g. "main.ts"
  type: FileType;
  textName?: string;         // only for files -> key for yDoc.getText()
  language?: string;         // "typescript" | "javascript" | etc.
  parent?: string | null;    // folder path, null for root
};

type FileSystemContextValue = {
  files: FileEntry[];                // flat list; you can build tree in Explorer
  activeFile: string | null;         // path string
  openFiles: string[];               // paths in tab bar order
  setActiveFile: (path: string | null) => void;
  openInTab: (path: string) => void;
  closeTab: (path: string) => void;

  createFile: (path: string, opts?: { language?: string; content?: string }) => void;
  createFolder: (path: string) => void;
  deleteEntry: (path: string) => void;
  renameEntry: (oldPath: string, newPath: string) => void;
  getFileContent: (path: string) => string;
};

const FileSystemContext = createContext<FileSystemContextValue | null>(null);

function getNameFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

function getParentFromPath(path: string): string | null {
  const parts = path.split("/").filter(Boolean);
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join("/");
}

type ProviderProps = {
  provider: YjsProvider;
  children: React.ReactNode;
};

const DEFAULT_BOOTSTRAP: FileEntry[] = [

  {
    path: "README.md",
    name: "README.md",
    type: "file",
    language: "markdown",
  },
];

const FILES_MAP_KEY = "files";

const FileSystemProviderDefault: React.FC<ProviderProps> = ({
  provider,
  children,
}) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<string[]>([]);

  // --- Sync Yjs "files" map into React state ---
  useEffect(() => {
    if (!provider) return;

    const yDoc = provider.getYDoc();
    const filesMap = yDoc.getMap(FILES_MAP_KEY);

    // Bootstrap on first load if empty
    // Bootstrap: If the workspace is empty, create a welcome README.md
if (filesMap.size === 0) {
  const readme = DEFAULT_BOOTSTRAP[0]; // README.md

  const welcomeContent = `# 👋 Welcome to **FINCORD**

FINCORD is your collaborative, real-time, multi-user code editor — built to feel familiar like VS Code, but fully synced and online.

---

## 🚀 What can you do here?

- Create, edit, and delete files & folders  
- Work in multi-nested project structures  
- Collaborate live with others  
- Use the integrated terminal to run supported languages  
- Edit simultaneously using Yjs (CRDT)  
- Enjoy real-time updates with no conflicts  

---

## 📁 Getting started

You currently have **no files** in the workspace, so we created this \`README.md\` for you.

To begin:

### ➕ Create a new file  
Use **+ File** in the Explorer

### 📂 Create folders  
Use **+ Folder** to structure your project

### 📥 Import a folder or files  
Use **Import** to load a whole project

---

## 💡 Tips

- Click any file to open it in a new tab  
- Tabs support horizontal scrolling  
- Rename and delete files without popups  
- The terminal auto-detects file language and runs it  

---

## 🛠 About FINCORD

FINCORD is built with:

- Next.js  
- Monaco Editor  
- Yjs / Liveblocks  
- Custom virtual filesystem  
- Piston code executor  

Enjoy coding ✨  
`;

  const textName = `file:${readme.path}`;
  const yText = yDoc.getText(textName);

  // Reset content
  // @ts-ignore
  yText.delete(0, yText.length || 0);
  // @ts-ignore
  yText.insert(0, welcomeContent);

  filesMap.set(readme.path, {
    type: "file",
    textName,
    language: "markdown",
    parent: null,
  });
}


    const updateFromY = () => {
      const list: FileEntry[] = [];
      filesMap.forEach((value: any, key: string) => {
        const type: FileType = value.type ?? "file";
        list.push({
          path: key,
          name: getNameFromPath(key),
          type,
          textName: value.textName,
          language: value.language ?? "plaintext",
          parent: value.parent ?? getParentFromPath(key),
        });
      });

      list.sort((a, b) => a.path.localeCompare(b.path));
      setFiles(list);

      if (!activeFile && list.length > 0) {
        setActiveFile(list[0].path);
        setOpenFiles((prev) =>
          prev.length === 0 ? [list[0].path] : prev
        );
      }
    };

    // initial load
    updateFromY();

    // observe changes on Y.Map
    const observer = () => {
      updateFromY();
    };

    // Y.Map#observe
    filesMap.observe(observer);

    return () => {
      filesMap.unobserve(observer);
    };
  }, [provider]);

  // --- Helpers that mutate Yjs (source of truth) ---
  const createFile = useCallback(
    (path: string, opts?: { language?: string; content?: string }) => {
      const yDoc = provider.getYDoc();
      const filesMap = yDoc.getMap(FILES_MAP_KEY);

      if (filesMap.has(path)) {
        // already exists
        return;
      }

      const textName = `file:${path}`;
      const yText = yDoc.getText(textName);
      const initialContent = opts?.content ?? "";
      // @ts-ignore
      yText.delete(0, yText.length || 0);
      // @ts-ignore
      yText.insert(0, initialContent);

      filesMap.set(path, {
        type: "file",
        textName,
        language: opts?.language ?? "plaintext",
        parent: getParentFromPath(path),
      });

      setActiveFile(path);
      setOpenFiles((prev) =>
        prev.includes(path) ? prev : [...prev, path]
      );
    },
    [provider]
  );

  const createFolder = useCallback(
    (path: string) => {
      const yDoc = provider.getYDoc();
      const filesMap = yDoc.getMap(FILES_MAP_KEY);

      if (filesMap.has(path)) return;

      filesMap.set(path, {
        type: "folder",
        parent: getParentFromPath(path),
      });
    },
    [provider]
  );

  const deleteEntry = useCallback(
    (path: string) => {
      const yDoc = provider.getYDoc();
      const filesMap = yDoc.getMap(FILES_MAP_KEY);
      const entry = filesMap.get(path);

      if (!entry) return;

      // If folder: delete all children recursively
      if (entry.type === "folder") {
        const toDelete: string[] = [];
        filesMap.forEach((value: any, key: string) => {
          if (key === path) return;
          if (key === path || key.startsWith(path + "/")) {
            toDelete.push(key);
          }
        });
        toDelete.forEach((p) => filesMap.delete(p));
      }

      filesMap.delete(path);

      setOpenFiles((prev) => prev.filter((p) => p !== path));
      setActiveFile((prev) => (prev === path ? null : prev));
    },
    [provider]
  );

  const renameEntry = useCallback(
    (oldPath: string, newPath: string) => {
      if (oldPath === newPath) return;

      const yDoc = provider.getYDoc();
      const filesMap = yDoc.getMap(FILES_MAP_KEY);
      const entry = filesMap.get(oldPath);
      if (!entry) return;

      // If folder, move all children
      if (entry.type === "folder") {
        const updates: { oldKey: string; newKey: string; value: any }[] = [];
        filesMap.forEach((value: any, key: string) => {
          if (key === oldPath || key.startsWith(oldPath + "/")) {
            const suffix = key.slice(oldPath.length);
            const target = newPath + suffix;
            updates.push({ oldKey: key, newKey: target, value });
          }
        });

        updates.forEach((u) => {
          filesMap.set(u.newKey, u.value);
          filesMap.delete(u.oldKey);
        });
      } else {
        filesMap.set(newPath, {
          ...entry,
          parent: getParentFromPath(newPath),
        });
        filesMap.delete(oldPath);
      }

      setOpenFiles((prev) =>
        prev.map((p) => (p === oldPath ? newPath : p))
      );
      setActiveFile((prev) => (prev === oldPath ? newPath : prev));
    },
    [provider]
  );
    const getFileContent = useCallback(
    (path: string): string => {
      const yDoc = provider.getYDoc();
      const filesMap = yDoc.getMap(FILES_MAP_KEY);
      const entry = filesMap.get(path);
      if (!entry || entry.type !== "file" || !entry.textName) return "";
      const yText = yDoc.getText(entry.textName);
      return yText.toString();
    },
    [provider]
  );

  const setActiveFileSafe = useCallback((path: string | null) => {
    setActiveFile(path);
    if (path) {
      setOpenFiles((prev) =>
        prev.includes(path) ? prev : [...prev, path]
      );
    }
  }, []);

  const openInTab = useCallback((path: string) => {
    setOpenFiles((prev) =>
      prev.includes(path) ? prev : [...prev, path]
    );
    setActiveFile(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    setOpenFiles((prev) => {
      const idx = prev.indexOf(path);
      if (idx === -1) return prev;

      const next = prev.filter((p) => p !== path);

      setActiveFile((curr) => {
        if (curr !== path) return curr;
        // choose new active: next tab to the right, else left
        if (next.length === 0) return null;
        if (idx < next.length) return next[idx];
        return next[next.length - 1];
      });

      return next;
    });
  }, []);

  const value = useMemo<FileSystemContextValue>(
    () => ({
      files,
      activeFile,
      openFiles,
      setActiveFile: setActiveFileSafe,
      openInTab,
      closeTab,
      createFile,
      createFolder,
      deleteEntry,
      renameEntry,
      getFileContent,
    }),
    [
      files,
      activeFile,
      openFiles,
      setActiveFileSafe,
      openInTab,
      closeTab,
      createFile,
      createFolder,
      deleteEntry,
      renameEntry,
      getFileContent,
    ]
  );


  return (
    <FileSystemContext.Provider value={value}>
      {children}
    </FileSystemContext.Provider>
  );
};

export function useFileSystem(): FileSystemContextValue {
  const ctx = useContext(FileSystemContext);
  if (!ctx) {
    throw new Error("useFileSystem must be used inside FileSystemProviderDefault");
  }
  return ctx;
}

export default FileSystemProviderDefault;
