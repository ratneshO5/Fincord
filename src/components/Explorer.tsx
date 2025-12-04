"use client";

import { useMemo, useRef, useState } from "react";
import { useFileSystem } from "@/context/FileSystem";
import JSZip from "jszip";

type TreeNode = {
  path: string;
  name: string;
  type: "file" | "folder";
  parent: string | null;
  children: TreeNode[];
};

export function Explorer() {
  const {
    files,
    activeFile,
    openInTab,
    createFile,
    createFolder,
    deleteEntry,
    renameEntry,
    getFileContent,
  } = useFileSystem();

  // UI state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const [creating, setCreating] = useState<{
    parent: string | null;
    type: "file" | "folder";
  } | null>(null);
  const [creatingName, setCreatingName] = useState("");

  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
const folderInputRef = useRef<HTMLInputElement | null>(null);
const [showImportMenu, setShowImportMenu] = useState(false);


  // Build multi-nested tree from flat FileEntry[]
  const tree = useMemo<TreeNode[]>(() => {
    const map = new Map<string, TreeNode>();

    files.forEach((f) => {
      map.set(f.path, {
        path: f.path,
        name: f.name,
        type: f.type,
        parent: f.parent ?? null,
        children: [],
      });
    });

    const roots: TreeNode[] = [];

    files.forEach((f) => {
      const node = map.get(f.path)!;
      if (node.type === "folder" && !expanded.hasOwnProperty(node.path)) {
        // default: root-level folders expanded
        if (!node.parent) {
          expanded[node.path] = true;
        }
      }

      if (f.parent) {
        const parentNode = map.get(f.parent);
        if (parentNode) {
          parentNode.children.push(node);
        } else {
          roots.push(node);
        }
      } else {
        roots.push(node);
      }
    });

    const sortChildren = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === "folder" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach((n) => sortChildren(n.children));
    };

    sortChildren(roots);
    return roots;
  }, [files]);

  const selectedEntry = useMemo(
    () => files.find((f) => f.path === selectedPath),
    [files, selectedPath]
  );

  const selectedFolderPath: string | null = useMemo(() => {
    if (!selectedEntry) return null;
    if (selectedEntry.type === "folder") return selectedEntry.path;
    return selectedEntry.parent ?? null;
  }, [selectedEntry]);

  // --- Creation helpers ---

  const startCreate = (type: "file" | "folder") => {
    setCreating({
      parent: selectedFolderPath,
      type,
    });
    setCreatingName("");
  };

  const commitCreate = () => {
    if (!creating || !creatingName.trim()) {
      setCreating(null);
      setCreatingName("");
      return;
    }
    const baseName = creatingName.trim();
    const basePath = creating.parent ? `${creating.parent}/` : "";
    const finalPath = `${basePath}${baseName}`;

    if (creating.type === "folder") {
      createFolder(finalPath);
      setExpanded((prev) => ({ ...prev, [finalPath]: true }));
      setSelectedPath(finalPath);
    } else {
      createFile(finalPath, {
        language: guessLanguageFromName(finalPath),
        content: "",
      });
      openInTab(finalPath);
      setSelectedPath(finalPath);
    }

    setCreating(null);
    setCreatingName("");
  };

  const cancelCreate = () => {
    setCreating(null);
    setCreatingName("");
  };

  // --- Rename helpers ---

  const startRename = (path: string, currentName: string) => {
    setRenamingPath(path);
    setRenamingName(currentName);
  };

  const commitRename = () => {
    if (!renamingPath) return;
    const newBaseName = renamingName.trim();
    if (!newBaseName) {
      setRenamingPath(null);
      setRenamingName("");
      return;
    }

    const entry = files.find((f) => f.path === renamingPath);
    const parent = entry?.parent ?? null;
    const newPath = parent ? `${parent}/${newBaseName}` : newBaseName;

    renameEntry(renamingPath, newPath);
    setRenamingPath(null);
    setRenamingName("");
    setSelectedPath(newPath);
  };

  const cancelRename = () => {
    setRenamingPath(null);
    setRenamingName("");
  };

  // --- Import / Export ---

  const triggerImport = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e
  ) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const filesArray = Array.from(fileList);

    for (const file of filesArray) {
      const anyFile = file as any;
      const relPath: string =
        anyFile.webkitRelativePath && anyFile.webkitRelativePath !== ""
          ? anyFile.webkitRelativePath
          : file.name;

      const normalizedPath = relPath.replace(/\\/g, "/");
      const parts = normalizedPath.split("/").filter(Boolean);

      // create folders
      if (parts.length > 1) {
        let prefix = "";
        for (let i = 0; i < parts.length - 1; i++) {
          prefix = prefix ? `${prefix}/${parts[i]}` : parts[i];
          createFolder(prefix);
        }
      }

      const content = await file.text();
      createFile(normalizedPath, {
        language: guessLanguageFromName(normalizedPath),
        content,
      });
    }

    // reset input so same folder can be selected again if needed
    e.target.value = "";
  };

  const handleExport = async () => {
    const zip = new JSZip();

    for (const f of files) {
      if (f.type !== "file") continue;
      const content = getFileContent(f.path) ?? "";
      zip.file(f.path, content);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "fincord-project.zip";
    a.click();

    URL.revokeObjectURL(url);
  };

  const toggleFolder = (path: string) => {
    setExpanded((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const handleDelete = (path: string) => {
    // no popup – just delete
    deleteEntry(path);
    if (selectedPath === path) {
      setSelectedPath(null);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,      // ✅ important for scroll
        fontSize: 13,
    }}
  >

      {/* Header actions */}
      <div
        style={{
          padding: "6px 8px",
          borderBottom: "1px solid #3e3e42",
          display: "flex",
          gap: 6,
          alignItems: "center",
        }}
      >
        <button
          onClick={() => startCreate("file")}
          style={headerButtonStyle}
        >
          + File
        </button>
        <button
          onClick={() => startCreate("folder")}
          style={headerButtonStyle}
        >
          + Folder
        </button>
        
<div style={{ position: "relative" }}>
  <button
    onClick={() => setShowImportMenu((v) => !v)}
    style={{
      ...headerButtonStyle,
      display: "flex",
      alignItems: "center",
      gap: 4,
    }}
    type="button"
  >
    Import
    <span style={{ fontSize: 10 }}>▾</span>
  </button>

  {showImportMenu && (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 2,
        background: "#252526",
        border: "1px solid #3e3e42",
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 140,
        zIndex: 10,
        boxShadow: "0 4px 8px rgba(0,0,0,0.4)",
      }}
    >
      <button
        type="button"
        onClick={() => {
          setShowImportMenu(false);
          fileInputRef.current?.click();
        }}
        style={{
          display: "block",
          width: "100%",
          padding: "4px 10px",
          background: "transparent",
          border: "none",
          textAlign: "left",
          fontSize: 12,
          color: "#f3f3f3",
          cursor: "pointer",
        }}
      >
        Import files
      </button>
      <button
        type="button"
        onClick={() => {
          setShowImportMenu(false);
          folderInputRef.current?.click();
        }}
        style={{
          display: "block",
          width: "100%",
          padding: "4px 10px",
          background: "transparent",
          border: "none",
          textAlign: "left",
          fontSize: 12,
          color: "#f3f3f3",
          cursor: "pointer",
        }}
      >
        Import folder
      </button>
    </div>
  )}
</div>

<button onClick={handleExport} style={headerButtonStyle}>
          Export ZIP
        </button>

{/* Hidden file inputs */}
<input
  ref={fileInputRef}
  type="file"
  multiple
  style={{ display: "none" }}
  onChange={handleImportChange}
/>

<input
  ref={folderInputRef}
  type="file"
  multiple
  // @ts-ignore - non-standard but supported
  webkitdirectory="true"
  style={{ display: "none" }}
  onChange={handleImportChange}
/>

      </div>

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 4px 8px" }}>
        {/* creation row at root level */}
        {creating && !creating.parent && (
          <CreateOrRenameRow
            depth={0}
            type={creating.type}
            name={creatingName}
            setName={setCreatingName}
            onCommit={commitCreate}
            onCancel={cancelCreate}
          />
        )}

        {tree.map((node) => (
          <TreeNodeRow
            key={node.path}
            node={node}
            depth={0}
            expanded={expanded}
            toggleFolder={toggleFolder}
            selectedPath={selectedPath}
            setSelectedPath={setSelectedPath}
            activeFile={activeFile}
            onOpenFile={openInTab}
            onDelete={handleDelete}
            onStartRename={startRename}
            renamingPath={renamingPath}
            renamingName={renamingName}
            setRenamingName={setRenamingName}
            onCommitRename={commitRename}
            onCancelRename={cancelRename}
            creating={creating}
            creatingName={creatingName}
            setCreatingName={setCreatingName}
            onCommitCreate={commitCreate}
            onCancelCreate={cancelCreate}
          />
        ))}
      </div>
    </div>
  );
}

const headerButtonStyle: React.CSSProperties = {
  fontSize: 11,
  padding: "2px 6px",
  background: "#2d2d30",
  border: "1px solid #3e3e42",
  borderRadius: 4,
  cursor: "pointer",
};

// Renders a single row + its children (recursive)
function TreeNodeRow(props: {
  node: TreeNode;
  depth: number;
  expanded: Record<string, boolean>;
  toggleFolder: (path: string) => void;
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
  activeFile: string | null;
  onOpenFile: (path: string) => void;
  onDelete: (path: string) => void;
  onStartRename: (path: string, currentName: string) => void;
  renamingPath: string | null;
  renamingName: string;
  setRenamingName: (name: string) => void;
  onCommitRename: () => void;
  onCancelRename: () => void;
  creating: { parent: string | null; type: "file" | "folder" } | null;
  creatingName: string;
  setCreatingName: (name: string) => void;
  onCommitCreate: () => void;
  onCancelCreate: () => void;
}) {
  const {
    node,
    depth,
    expanded,
    toggleFolder,
    selectedPath,
    setSelectedPath,
    activeFile,
    onOpenFile,
    onDelete,
    onStartRename,
    renamingPath,
    renamingName,
    setRenamingName,
    onCommitRename,
    onCancelRename,
    creating,
    creatingName,
    setCreatingName,
    onCommitCreate,
    onCancelCreate,
  } = props;

  const isFolder = node.type === "folder";
  const isExpanded = isFolder ? !!expanded[node.path] : false;
  const isSelected = selectedPath === node.path;
  const isActiveFile = activeFile === node.path;
  const isRenaming = renamingPath === node.path;

  const paddingLeft = 4 + depth * 12;

  const handleClick = () => {
    setSelectedPath(node.path);
    if (!isFolder) {
      onOpenFile(node.path);
    } else {
      toggleFolder(node.path);
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "2px 4px",
          borderRadius: 4,
          background: isSelected
            ? "#094771"
            : isActiveFile
            ? "#333333"
            : "transparent",
          color: isSelected ? "white" : "#cccccc",
          cursor: "pointer",
        }}
        onClick={handleClick}
      >
              <div
        style={{
          paddingLeft,
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
      >
        {/* Left side: arrow + icon + name (takes all free space) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          {isFolder ? (
            <span
              style={{ width: 12, display: "inline-block", marginRight: 2 }}
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(node.path);
              }}
            >
              {isExpanded ? "▾" : "▸"}
            </span>
          ) : (
            <span
              style={{ width: 12, display: "inline-block", marginRight: 2 }}
            />
          )}

          <span style={{ marginRight: 6 }}>
            {isFolder ? "📁" : "📄"}
          </span>

          {isRenaming ? (
            <CreateOrRenameRow
              depth={0}
              type={node.type}
              name={renamingName}
              setName={setRenamingName}
              onCommit={onCommitRename}
              onCancel={onCancelRename}
              inline
            />
          ) : (
            <span
              style={{
                flex: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {node.name}
            </span>
          )}
        </div>

        {/* Right side: actions, stuck to the edge */}
        {!isRenaming && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginLeft: 4,
            }}
          >
            <button
              title="Rename"
              onClick={(e) => {
                e.stopPropagation();
                onStartRename(node.path, node.name);
              }}
              style={rowIconButtonStyle}
            >
              ✎
            </button>
            <button
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(node.path);
              }}
              style={rowIconButtonStyle}
            >
              🗑
            </button>
          </div>
        )}
      </div>

      </div>

      {/* creation row inside this folder */}
      {creating && creating.parent === node.path && (
        <CreateOrRenameRow
          depth={depth + 1}
          type={creating.type}
          name={creatingName}
          setName={setCreatingName}
          onCommit={onCommitCreate}
          onCancel={onCancelCreate}
        />
      )}

      {/* children */}
      {isFolder && isExpanded &&
        node.children.map((child) => (
          <TreeNodeRow
            key={child.path}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggleFolder={toggleFolder}
            selectedPath={selectedPath}
            setSelectedPath={setSelectedPath}
            activeFile={activeFile}
            onOpenFile={onOpenFile}
            onDelete={onDelete}
            onStartRename={onStartRename}
            renamingPath={renamingPath}
            renamingName={renamingName}
            setRenamingName={setRenamingName}
            onCommitRename={onCommitRename}
            onCancelRename={onCancelRename}
            creating={creating}
            creatingName={creatingName}
            setCreatingName={setCreatingName}
            onCommitCreate={onCommitCreate}
            onCancelCreate={onCancelCreate}
          />
        ))}
    </>
  );
}

const rowIconButtonStyle: React.CSSProperties = {
  fontSize: 10,
  border: "none",
  background: "transparent",
  color: "#999",
  cursor: "pointer",
  padding: "0 2px",
};

function CreateOrRenameRow(props: {
  depth: number;
  type: "file" | "folder";
  name: string;
  setName: (name: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  inline?: boolean;
}) {
  const { depth, type, name, setName, onCommit, onCancel, inline } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);

  // auto-focus
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useState(() => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return null;
  });

  const paddingLeft = inline ? 0 : 4 + depth * 12;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "2px 4px",
        borderRadius: 4,
        background: "#094771",
        color: "white",
      }}
    >
      <div style={{ paddingLeft, display: "flex", alignItems: "center" }}>
        <span style={{ width: 12, display: "inline-block", marginRight: 2 }}>
          {type === "folder" ? "▸" : ""}
        </span>
        <span style={{ marginRight: 6 }}>
          {type === "folder" ? "📁" : "📄"}
        </span>
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onCommit();
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
          onBlur={onCommit}
          style={{
            fontSize: 13,
            padding: "1px 4px",
            borderRadius: 3,
            border: "1px solid #555",
            background: "#1e1e1e",
            color: "white",
            minWidth: 60,
          }}
        />
      </div>
    </div>
  );
}

function guessLanguageFromName(name: string): string {
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "typescript";
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "javascript";
  if (name.endsWith(".json")) return "json";
  if (name.endsWith(".md")) return "markdown";
  if (name.endsWith(".css")) return "css";
  if (name.endsWith(".html")) return "html";
  return "plaintext";
}
