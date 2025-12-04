# Fincord Guide Book: The Ultimate Technical Reference

This guide is the definitive source of truth for the Fincord project. It is structured to help you defend your project by explaining not just *what* the code is, but *how* it lives and breathes from the moment the server starts to when users interact.

---

# Part 1: The Lifecycle & Execution Flow

This section traces the "heartbeat" of the application. We will follow the execution path from the initial server request to complex user interactions.

## 1. Initialization Phase (The Boot Process)

### Step 1.1: Server Start & Routing
*   **Trigger:** You run `npm run dev`. Next.js starts the server.
*   **Request:** A user visits `http://localhost:3000/`.
*   **Routing:** Next.js looks at `src/app`. It finds `page.tsx` (the home page) and wraps it in `layout.tsx` (the root layout).

### Step 1.2: Server-Side Rendering (SSR)
Before any JavaScript runs in the browser, the server builds the initial HTML.
1.  **`src/app/layout.tsx` executes:**
    *   It renders the `<html>` and `<body>` tags.
    *   It imports `globals.css`, applying the dark theme (`#1e1e1e`) immediately so there's no "white flash".
    *   It wraps everything in `<Providers>`.
2.  **`src/app/page.tsx` executes:**
    *   It renders the `<Room>` component.
    *   Inside `<Room>`, it renders `<CollaborativeEditor>`.
3.  **Result:** The browser receives a static HTML page. It looks like the editor, but it's not interactive yet.

### Step 1.3: Client Hydration & Connection
Now the browser takes over ("Hydration").
1.  **`src/app/Providers.tsx` wakes up:**
    *   It initializes the `LiveblocksProvider`. This is the "phone line" to the collaboration server.
    *   It points to `/api/liveblocks-auth` to check if the user is allowed in (authentication).
2.  **`src/app/Room.tsx` connects:**
    *   The `Room` component reads the URL params to decide which "Room ID" to join (default: `liveblocks:examples:nextjs-yjs-monaco`).
    *   It mounts `<RoomProvider>`. **CRITICAL MOMENT:** The browser opens a WebSocket connection to Liveblocks.
    *   While connecting, `<ClientSideSuspense>` shows the `<Loading />` spinner.
    *   Once connected, the spinner disappears, and `<CollaborativeEditor>` is fully mounted.

## 2. The "Brain" Activation (File System Boot)

The `CollaborativeEditor` is the main container. As soon as it mounts, it initializes the **File System**.

*   **File:** `src/context/FileSystem.tsx`
*   **Action:** `FileSystemProviderDefault` mounts.
*   **Logic:**
    1.  It calls `provider.getYDoc()` to get the shared document (the "database" shared by all users).
    2.  It accesses the shared map `"files"`.
    3.  **The Bootstrap Check:** It asks, "Is this map empty?"
        *   **YES (First run):** It creates the `README.md` file programmatically, inserting the welcome text into a shared `Y.Text` object.
        *   **NO (Returning user):** It reads the existing files.
    4.  **State Sync:** It converts the raw Yjs data into a nice JavaScript array (`FileEntry[]`) and saves it to the React state (`files`).
    5.  **UI Update:** The `Explorer` component sees this new state and renders the file tree.

## 3. The "Heart" Activation (Editor Binding)

Now that we have files, we need to show them in the editor.

*   **File:** `src/components/CollaborativeEditor.tsx` -> `EditorInner`
*   **Action:**
    1.  The `FileSystem` tells the editor: "The active file is `README.md`".
    2.  `EditorInner` gets the `Y.Text` for `README.md`.
    3.  It creates a Monaco Model (an in-memory text buffer).
    4.  **The Binding:** It creates a `new MonacoBinding(...)`.
    5.  **Result:** The text from the shared Yjs document appears in the editor.

---

# Part 2: User Interaction Flows

Here is exactly what happens, step-by-step, during specific user actions.

## Scenario A: User Types Code
**Goal:** User A types `console.log("Hi")` in `main.ts`. User B sees it instantly.

1.  **User A presses keys:** Monaco Editor captures the input.
2.  **MonacoBinding Intercepts:** The `y-monaco` binding (in `CollaborativeEditor.tsx`) detects the change in the Monaco Model.
3.  **Yjs Update:** The binding applies the "delta" (change) to the underlying `Y.Text` object.
4.  **Propagation:**
    *   **Local:** The `FileSystem` context observes this change and might update the file size or metadata if needed.
    *   **Network:** The `LiveblocksYjsProvider` encodes this update into a binary format and sends it over the WebSocket.
5.  **User B Receives:**
    *   User B's browser receives the binary packet.
    *   Yjs applies the update to User B's local `Y.Doc`.
    *   User B's `MonacoBinding` sees the `Y.Text` changed.
    *   It updates User B's Monaco Editor to show the new text.
    *   **Latency:** This happens in milliseconds.

## Scenario B: Creating a New File
**Goal:** User clicks "+ File" and names it `script.js`.

1.  **Click:** User clicks the button in `Explorer.tsx`.
2.  **State Change:** `creating` state is set to true. An input box appears in the file tree.
3.  **Commit:** User types `script.js` and hits Enter.
4.  **Action:** `commitCreate()` calls `createFile("script.js")` from `FileSystem.tsx`.
5.  **Logic (`FileSystem.tsx`):**
    *   Checks if `script.js` already exists.
    *   Creates a new `Y.Text` named `file:script.js`.
    *   Adds an entry to the `"files"` Y.Map: `{ type: "file", language: "javascript", ... }`.
6.  **Sync:** This change is broadcasted. All users see the new file appear in their Explorer instantly.

## Scenario C: Running Code (The Piston Flow)
**Goal:** User clicks "Run" on a Python file.

1.  **Click:** User clicks the "Play" button in `Toolbar.tsx`.
2.  **Bridge:** The button calls `window.__fincord_run_active_file__()`.
3.  **Handler:** This global function (defined in `CollaborativeEditor.tsx`) calls `terminalRef.current.run()`.
4.  **Terminal Logic (`TerminalPanel.tsx`):**
    *   `run()` wakes up.
    *   It grabs the code from the editor: `print("Hello")`.
    *   It detects the language: `python`.
    *   It prepares a JSON payload: `{ language: "python", files: [{ content: "..." }] }`.
5.  **API Call:** It sends a `POST` request to `/api/execute`.
6.  **Server Proxy (`api/execute/route.ts`):**
    *   Next.js server receives the request.
    *   It looks up the Piston runtime version for Python (e.g., "3.10.0").
    *   It forwards the request to `https://emkc.org/api/v2/piston/execute`.
7.  **Execution:** Piston (external server) runs the code in a sandbox and returns `{ run: { stdout: "Hello\n" } }`.
8.  **Display:** `TerminalPanel` receives the JSON and sets `output` state to "Hello\n". The user sees the result.

---

# Part 3: The Encyclopedia (File-by-File Detail)

This section details every file, explaining *why* it exists and *what* specific lines do.

## 📂 `src/app` (The Application Layer)

### `layout.tsx`
**Role:** The skeleton of the app.
*   **Line 1:** Imports `globals.css` to ensure styles are loaded first.
*   **Line 9 (`RootLayout`):** The main function.
*   **Line 31 (`<Providers>`):** Wraps the app in the Liveblocks context. Without this, no collaboration features would work.

### `page.tsx`
**Role:** The entry point.
*   **Line 7 (`<Room>`):** Ensures we are connected to a room before showing the editor. This prevents the "editor loading before data is ready" bug.

### `Room.tsx`
**Role:** Connection manager.
*   **Line 10 (`useExampleRoomId`):** Generates a room ID.
    *   *Detail:* It checks the URL query params. If you visit `?exampleId=team-A`, it joins a separate room from `?exampleId=team-B`. This allows multiple separate teams to use the same deployed app.
*   **Line 19 (`ClientSideSuspense`):** A React Suspense boundary. It effectively says "Don't render the children until we are fully connected to Liveblocks".

### `api/execute/route.ts`
**Role:** The secure gateway to the code execution engine.
*   **Line 5:** Defines the Piston URL (`emkc.org`).
*   **Line 25-76 (Version Auto-Discovery):**
    *   Piston requires a version number (e.g., "3.10.0") to run code. Users don't know this.
    *   This block fetches the list of *all* supported runtimes from Piston.
    *   It loops through them to find one that matches the requested language (e.g., "python").
    *   It extracts the version string and adds it to the request.
*   **Line 78:** The actual `fetch` call to Piston. It runs server-side to avoid CORS issues.

---

## 📂 `src/context` (The State Layer)

### `FileSystem.tsx`
**Role:** The Virtual Operating System. It manages files, folders, and tabs.
*   **Line 20 (`FileEntry`):** The shape of a file. Notice `textName`. This is the "pointer" to the actual content. We don't store the content in the file list (that would be slow); we store a reference to a separate `Y.Text` object.
*   **Line 74 (`FileSystemProviderDefault`):**
    *   **Line 91 (Bootstrap):** `if (filesMap.size === 0)`. This is the "First Run" logic. It injects the `README.md`.
    *   **Line 168 (`updateFromY`):** This function converts the complex Yjs map into a simple array. It runs every time *anything* changes in the file system.
    *   **Line 210 (`createFile`):**
        *   `yDoc.getText(...)`: Creates the content storage.
        *   `filesMap.set(...)`: Creates the metadata entry.
        *   **Crucial:** It performs *both* actions so the file is valid.
    *   **Line 258 (`deleteEntry`):**
        *   **Recursion:** If you delete a folder, it loops through *all* files. If a file's path starts with the folder's path (`key.startsWith(path + "/")`), it deletes that file too. This prevents "orphan" files.

---

## 📂 `src/components` (The UI Layer)

### `CollaborativeEditor.tsx`
**Role:** The Main Layout & Editor Controller.
*   **Line 25 (`guessMonacoLanguage`):** A helper that maps `.py` -> `python`, `.ts` -> `typescript`. This tells Monaco which syntax highlighting to use.
*   **Line 62 (`useEffect` - Global Run Hook):**
    *   It attaches `__fincord_run_active_file__` to the `window` object.
    *   *Why?* The `Toolbar` component is a child of `Editor`, but the `Terminal` is a sibling. React data flow makes it hard for the Toolbar to talk to the Terminal directly without complex context. This global function is a pragmatic shortcut to let the "Play" button trigger the Terminal.
*   **Line 89 (Resizing Logic):** Handles the dragging of the sidebar and terminal panel using standard DOM `mousemove` events.

### `EditorInner` (inside `CollaborativeEditor.tsx`)
**Role:** The Monaco Wrapper.
*   **Line 258 (IntelliSense Config):**
    *   `compilerOptions`: We set `allowJs: true` and `noEmit: true`.
    *   *Why?* By default, Monaco's TypeScript engine is very strict. It will show red squiggly lines if you don't have a `tsconfig.json` or if you import missing files. These settings relax the compiler so it acts more like a text editor and less like a build tool, preventing annoying errors for the user.
*   **Line 337 (`new MonacoBinding`):**
    *   This is the single most important line for collaboration. It links the `Y.Text` (shared data) to the `model` (editor view).

### `Explorer.tsx`
**Role:** The File Tree UI.
*   **Line 46 (`useMemo` - Tree Builder):**
    *   The file system stores files as a *flat list* (e.g., `["a.txt", "folder/b.txt"]`).
    *   The UI needs a *tree* (folders inside folders).
    *   This logic iterates over the flat list and builds a nested object structure (`TreeNode`) so it can be rendered as a tree.
*   **Line 186 (`handleImportChange`):**
    *   Uses the `webkitRelativePath` property of the File API. This allows users to drag-and-drop an entire folder structure, and Fincord will recreate that exact structure in the browser.

### `TerminalPanel.tsx`
**Role:** The execution interface.
*   **Line 27 (`map`):** A dictionary mapping file extensions to "friendly" names (e.g., `rs` -> `Rust`).
*   **Line 113 (`fetch`):** The call to our backend API.
*   **Line 125:** Handles the response. It checks for `run.stdout` (success) or `run.stderr` (runtime error) and formats it for display.

### `Cursors.tsx`
**Role:** Visualizing other users.
*   **How it works:** It does *not* render `<div>`s for cursors. That would be slow.
*   **Line 54:** It generates a dynamic `<style>` tag.
*   **Line 62:** It creates CSS classes like `.yRemoteSelectionHead-123`.
*   **Line 65:** It sets the `--user-color` variable for that specific user ID.
*   **Result:** Monaco Editor (which supports these CSS classes natively) automatically picks up these styles and paints the cursors in the correct colors.

### `UserProfile.tsx`
**Role:** Identity management.
*   **Line 13:** Reads from `localStorage`. This ensures that if you refresh the page, you don't lose your name.
*   **Line 47 (`updateMyPresence`):** This Liveblocks hook broadcasts your name to everyone else. This is how your name appears above your cursor on *their* screen.

---

# Summary of "How It Works"

1.  **Boot:** Server renders HTML -> Browser connects to Liveblocks -> FileSystem loads from Yjs.
2.  **Edit:** User types -> Monaco -> Yjs -> WebSocket -> Other Users.
3.  **Run:** User clicks Run -> Terminal collects code -> API Proxy -> Piston Sandbox -> Result displayed.
4.  **Manage:** User creates file -> FileSystem updates Yjs Map -> Explorer UI updates.

This architecture ensures that **State** (Yjs) is always the single source of truth, **UI** (React) is just a reflection of that state, and **Execution** (Piston) is safely isolated from the client.
