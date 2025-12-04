<div align="center">

# ⚡ Fincord
### The Ultimate Collaborative Code Editor

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Liveblocks](https://img.shields.io/badge/Liveblocks-Collaboration-f59e0b?style=for-the-badge&logo=liveblocks&logoColor=white)](https://liveblocks.io/)
[![Monaco](https://img.shields.io/badge/Monaco-Editor-1e1e1e?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://microsoft.github.io/monaco-editor/)
[![Piston](https://img.shields.io/badge/Piston-Execution-green?style=for-the-badge&logo=python&logoColor=white)](https://github.com/engineer-man/piston)

<br />

**Fincord** is a state-of-the-art collaborative IDE built for teams who ship fast.
Real-time editing, secure workspaces, and instant code execution—all in your browser.

[Features](#-features) • [Getting Started](#-getting-started) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 🚀 Features

### 🤝 Real-Time Collaboration
- **Multi-User Editing**: See changes instantly as your team types.
- **Live Cursors & Avatars**: Know exactly where everyone is working.
- **Presence Awareness**: See who is online with real-time status indicators.

### 🛡️ Secure Workspaces
- **Crypto-Secure Invites**: Generate 32-character hex codes (`9f3db62c...`) for airtight access control.
- **Role-Based Access**: Owners can manage collaborators and revoke access instantly.
- **Private Rooms**: Every project is an isolated, secure environment.

### ⚡ Powerful Editor
- **Monaco Engine**: The same editor that powers VS Code.
- **Smart IntelliSense**: Auto-completion and syntax highlighting for 20+ languages.
- **Breadcrumbs**: Easy navigation through your project structure.
- **File System**: Create, rename, and delete files and folders with a virtual file system.

### 🏃 Instant Execution
- **Run Anywhere**: Execute Python, JavaScript, Rust, Go, and more directly in the browser.
- **Piston Integration**: Secure, sandboxed code execution via the Piston API.
- **Integrated Terminal**: View output and errors in a sleek, resizable panel.

### 🎨 Premium UI/UX
- **Glassmorphism Design**: A modern, dark-themed interface that looks beautiful on any screen.
- **Custom Profiles**: Personalize your identity with custom names and avatar colors.
- **Smooth Animations**: Subtle transitions and toast notifications for a polished feel.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: CSS Modules (Zero-runtime overhead)
- **Collaboration**: [Liveblocks](https://liveblocks.io/) + [Yjs](https://github.com/yjs/yjs)
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Auth**: [NextAuth.js](https://next-auth.js.org/)
- **Database**: JSON-based persistence (Lightweight & Portable)

---

## 🏁 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/ratneshO5/Fincord.git
    cd Fincord
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up Environment Variables**
    Create a `.env.local` file in the root directory:
    ```env
    # Liveblocks Secret Key (Get from liveblocks.io)
    LIVEBLOCKS_SECRET_KEY=sk_...

    # NextAuth Secret (Generate with `openssl rand -base64 32`)
    NEXTAUTH_SECRET=...
    
    # Google OAuth (Optional, for social login)
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    ```

4.  **Run the development server**
    ```bash
    npm run dev
    ```

5.  **Open your browser**
    Visit `http://localhost:3000` to start coding!

---

## 🏗️ Architecture

Fincord follows a **Serverless + Client-Side State** architecture:

1.  **State Management**: The "Truth" lives in Yjs documents synced via Liveblocks. The React UI is merely a reflection of this state.
2.  **Virtual File System**: Files are stored as `Y.Text` objects within a `Y.Map`, allowing for complex directory structures without a backend database for files.
3.  **Execution Proxy**: Code execution requests are proxied through a Next.js API route to avoid CORS issues and hide API keys, then sent to a Piston sandbox.

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1.  Fork the repository.
2.  Create a new branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

---

<div align="center">

**Built with ❤️ by Ratnesh**

[Report Bug](https://github.com/ratneshO5/Fincord/issues) • [Request Feature](https://github.com/ratneshO5/Fincord/issues)

</div>
