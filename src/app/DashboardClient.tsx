"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Dashboard.module.css";
import type { User as NextAuthUser } from "next-auth";
import type { Project, Invite } from "@/lib/db";
import { ProfileSettingsModal } from "@/components/ProfileSettingsModal";
import { useUser } from "@/context/UserContext";
import { CollaborateModal } from "@/components/CollaborateModal";

// Define a unified User type for the dashboard
type DashboardUser = {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    color?: string | null;
};

type Props = {
    user: DashboardUser;
    projects: (Project & { collaboratorCount: number })[]; // Updated type
    invites: (Invite & { projectName: string; senderName: string })[];
    createProjectAction: (formData: FormData) => Promise<void>;
    signOutAction: () => Promise<void>;
    deleteProjectAction: (projectId: string) => Promise<void>;
};

export function DashboardClient({ user: initialUser, projects, invites, createProjectAction, signOutAction, deleteProjectAction }: Props) {
    const router = useRouter();
    const { user: contextUser } = useUser();

    // ... (user merging logic remains the same)
    const user: DashboardUser = contextUser ? {
        ...initialUser,
        name: contextUser.name,
        email: contextUser.email,
        image: contextUser.image,
        color: contextUser.color
    } : initialUser;

    const [isCreating, setIsCreating] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [joinId, setJoinId] = useState("");

    // New state for CollaborateModal
    const [selectedProject, setSelectedProject] = useState<(Project & { collaboratorCount: number }) | null>(null);
    const [isCollaborateModalOpen, setIsCollaborateModalOpen] = useState(false);

    console.log("DashboardClient rendered", { user, projects, invites });

    const handleJoin = async () => {
        if (!joinId.trim()) return;

        try {
            // Try to join via invite code first
            const res = await fetch('/api/project/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: joinId.trim() })
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/project/${data.projectId}`);
                return;
            }

            // If not a valid code (404), assume it's a Project ID and try to navigate directly
            // This preserves old behavior for existing members pasting a Room ID
            router.push(`/project/${joinId.trim()}`);
        } catch (e) {
            console.error("Join failed", e);
            router.push(`/project/${joinId.trim()}`);
        }
    };

    const openCollaborateModal = (e: React.MouseEvent, project: Project & { collaboratorCount: number }) => {
        e.stopPropagation();
        setSelectedProject(project);
        setIsCollaborateModalOpen(true);
    };

    return (
        <div className={styles.container}>
            <ProfileSettingsModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />

            {/* Collaborate Modal */}
            {selectedProject && (
                <CollaborateModal
                    isOpen={isCollaborateModalOpen}
                    onClose={() => setIsCollaborateModalOpen(false)}
                    projectId={selectedProject.id}
                    inviteCode={selectedProject.inviteCode}
                    projectName={selectedProject.name}
                    isOwner={selectedProject.ownerId === user.id}
                />
            )}

            <header className={styles.header}>
                {/* ... (header content remains the same) */}
                <div className={styles.logo}>FINCORD</div>
                <div className={styles.headerRight}>
                    <div className={styles.userSection} onClick={() => setIsProfileOpen(true)} style={{ cursor: 'pointer' }} title="Edit Profile">
                        {user.image ? (
                            <img src={user.image} alt={user.name || "User"} className={styles.avatar} style={{ border: `2px solid ${user.color || '#3e3e42'}` }} />
                        ) : (
                            <div className={styles.avatar} style={{ backgroundColor: user.color || "#007acc" }}>
                                {(user.name || "U").charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className={styles.userInfo}>
                            <h1 className={styles.userName}>{user.name || "User"}</h1>
                            <p className={styles.userStatus}>{user.email || "No Email"}</p>
                        </div>
                    </div>
                    <form action={signOutAction}>
                        <button type="submit" className={styles.logoutBtn}>
                            Sign Out
                        </button>
                    </form>
                </div>
            </header>

            <main className={styles.main}>
                {/* Actions Column */}
                <div className={styles.actionsColumn}>
                    {/* ... (Create Project, Join Project, Invites sections remain the same) */}
                    {/* Create Project */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>New Project</h2>
                        <p className={styles.cardDesc}>Start a new collaborative session.</p>

                        {!isCreating ? (
                            <button onClick={() => setIsCreating(true)} className={styles.createBtn}>
                                <span>+</span> Create Project
                            </button>
                        ) : (
                            <form action={createProjectAction} className={styles.createForm}>
                                <input
                                    name="name"
                                    placeholder="Project Name"
                                    className={styles.input}
                                    autoFocus
                                    required
                                />
                                <div className={styles.createActions}>
                                    <button type="submit" className={styles.confirmBtn}>Create</button>
                                    <button type="button" onClick={() => setIsCreating(false)} className={styles.cancelBtn}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Join Project */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Join Project</h2>
                        <p className={styles.cardDesc}>Enter a Room ID or Invite Code.</p>
                        <div className={styles.joinContainer}>
                            <input
                                type="text"
                                value={joinId}
                                onChange={(e) => setJoinId(e.target.value)}
                                className={styles.joinInput}
                                placeholder="Room ID or Invite Code..."
                            />
                            <button onClick={handleJoin} className={styles.joinBtn}>
                                Join
                            </button>
                        </div>
                    </div>

                    {/* Invites Section */}
                    <div className={styles.card}>
                        <h2 className={styles.cardTitle}>Invites</h2>
                        {invites.length > 0 ? (
                            <div className={styles.invitesList}>
                                {invites.map((invite) => (
                                    <div key={invite.id} className={styles.inviteItem}>
                                        <div>
                                            <div className={styles.inviteProject}>{invite.projectName}</div>
                                            <div className={styles.inviteSender}>from {invite.senderName}</div>
                                        </div>
                                        <div className={styles.inviteActions}>
                                            <button
                                                className={styles.acceptBtn}
                                                onClick={async () => {
                                                    await fetch('/api/invite/respond', {
                                                        method: 'POST',
                                                        body: JSON.stringify({ inviteId: invite.id, status: 'accepted' })
                                                    });
                                                    router.refresh();
                                                }}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                className={styles.declineBtn}
                                                onClick={async () => {
                                                    await fetch('/api/invite/respond', {
                                                        method: 'POST',
                                                        body: JSON.stringify({ inviteId: invite.id, status: 'declined' })
                                                    });
                                                    router.refresh();
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.cardDesc}>No pending invites.</p>
                        )}
                    </div>
                </div>

                {/* Projects Column */}
                <div className={styles.projectsColumn}>
                    <h2 className={styles.cardTitle}>Your Projects</h2>
                    {projects.length === 0 ? (
                        <div className={styles.emptyState}>
                            No projects yet. Create one to get started!
                        </div>
                    ) : (
                        <div className={styles.projectsGrid}>
                            {projects.map((project) => (
                                <div
                                    key={project.id}
                                    className={styles.projectCard}
                                    onClick={() => router.push(`/project/${project.id}`)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 className={styles.projectName}>{project.name}</h3>
                                            <p className={styles.projectId}>ID: {project.id}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={(e) => openCollaborateModal(e, project)}
                                                className={styles.collaborateBtn}
                                                title="Manage Collaborators"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.1)',
                                                    border: 'none',
                                                    color: 'white',
                                                    cursor: 'pointer',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                👥 {project.collaboratorCount}
                                            </button>
                                            {project.ownerId === user.id && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Delete this project?')) {
                                                            deleteProjectAction(project.id);
                                                        }
                                                    }}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        padding: '4px',
                                                        borderRadius: '4px'
                                                    }}
                                                    title="Delete Project"
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className={styles.projectDate}>
                                        Last opened: <span suppressHydrationWarning>{new Date(project.lastOpened).toLocaleDateString()}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
