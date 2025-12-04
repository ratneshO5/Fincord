import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import os from 'os';

// Use /tmp on Vercel (read-only filesystem fix)
const DB_FILE_NAME = 'fincord_db.json';
const DB_PATH = process.env.NODE_ENV === 'production'
    ? path.join(os.tmpdir(), DB_FILE_NAME)
    : path.join(process.cwd(), DB_FILE_NAME);

// Types
export type User = {
    id: string;
    name: string;
    email: string;
    image?: string;
    color: string; // Added color field
};

export type Project = {
    id: string;
    name: string;
    ownerId: string;
    createdAt: number;
    lastOpened: number;
    inviteCode: string; // Added inviteCode
};

export type Invite = {
    id: string;
    projectId: string;
    senderId: string;
    receiverEmail: string;
    status: 'pending' | 'accepted' | 'declined';
};

type DBData = {
    users: User[];
    projects: Project[];
    invites: Invite[];
};

// Initial Data
const initialData: DBData = {
    users: [],
    projects: [],
    invites: [],
};

// Helper to read DB
function readDB(): DBData {
    // If DB doesn't exist in /tmp (or local), try to initialize it
    if (!fs.existsSync(DB_PATH)) {
        // On Vercel, try to copy from the included source file if available
        const sourcePath = path.join(process.cwd(), DB_FILE_NAME);

        if (process.env.NODE_ENV === 'production' && fs.existsSync(sourcePath)) {
            try {
                const data = fs.readFileSync(sourcePath, 'utf-8');
                fs.writeFileSync(DB_PATH, data);
                return JSON.parse(data);
            } catch (e) {
                console.error("Failed to copy initial DB:", e);
                // Fallback to empty init
            }
        }

        // Initialize with empty data
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
        } catch (e) {
            console.error("Failed to write initial DB:", e);
            return initialData; // Return in-memory fallback if write fails
        }
        return initialData;
    }

    try {
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Failed to read DB:", e);
        return initialData;
    }
}

// Helper to write DB
function writeDB(data: DBData) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to write DB:", e);
    }
}

// --- User Operations ---
export function getUser(email: string): User | undefined {
    const db = readDB();
    return db.users.find((u) => u.email === email);
}

export function createUser(user: Omit<User, 'id'>): User {
    const db = readDB();
    const newUser = { ...user, id: uuidv4() };
    db.users.push(newUser);
    writeDB(db);
    return newUser;
}

export function getUserById(id: string): User | undefined {
    const db = readDB();
    return db.users.find((u) => u.id === id);
}

// --- Project Operations ---
export function createProject(name: string, ownerId: string): Project {
    const db = readDB();
    const newProject: Project = {
        id: uuidv4(),
        name,
        ownerId,
        createdAt: Date.now(),
        lastOpened: Date.now(),
        inviteCode: crypto.randomBytes(16).toString("hex"), // Generate secure invite code
    };
    db.projects.push(newProject);
    writeDB(db);
    return newProject;
}

export function getProject(id: string): Project | undefined {
    const db = readDB();
    const project = db.projects.find((p) => p.id === id);

    if (project && !project.inviteCode) {
        // Backfill missing invite code
        project.inviteCode = crypto.randomBytes(16).toString("hex");
        writeDB(db);
    }

    return project;
}

export function getProjectByInviteCode(code: string): Project | undefined {
    const db = readDB();
    return db.projects.find((p) => p.inviteCode === code);
}

export function getUserProjects(userId: string): (Project & { collaboratorCount: number })[] {
    const db = readDB();
    let dbModified = false;

    // Projects owned by user OR where user is invited (accepted)
    const owned = db.projects.filter((p) => p.ownerId === userId);

    const acceptedInvites = db.invites.filter(
        (i) => i.receiverEmail === getUserById(userId)?.email && i.status === 'accepted'
    );
    const invitedProjectIds = acceptedInvites.map((i) => i.projectId);
    const invited = db.projects.filter((p) => invitedProjectIds.includes(p.id));

    const allProjects = [...owned, ...invited];

    // Backfill invite codes if missing
    allProjects.forEach(p => {
        if (!p.inviteCode) {
            p.inviteCode = crypto.randomBytes(16).toString("hex");
            dbModified = true;
        }
    });

    if (dbModified) {
        writeDB(db);
    }

    return allProjects.map(p => {
        const projectInvites = db.invites.filter(i => i.projectId === p.id && i.status === 'accepted');
        const uniqueEmails = new Set(projectInvites.map(i => i.receiverEmail));
        return {
            ...p,
            collaboratorCount: uniqueEmails.size
        };
    }).sort((a, b) => b.lastOpened - a.lastOpened);
}

export function updateProjectLastOpened(id: string) {
    const db = readDB();
    const project = db.projects.find((p) => p.id === id);
    if (project) {
        project.lastOpened = Date.now();
        writeDB(db);
    }
}

export function deleteProject(id: string) {
    const db = readDB();
    db.projects = db.projects.filter((p) => p.id !== id);
    db.invites = db.invites.filter((i) => i.projectId !== id);
    writeDB(db);
}

// --- Invite Operations ---
export function createInvite(projectId: string, senderId: string, receiverEmail: string): Invite {
    const db = readDB();
    const newInvite: Invite = {
        id: uuidv4(),
        projectId,
        senderId,
        receiverEmail,
        status: 'pending',
    };
    db.invites.push(newInvite);
    writeDB(db);
    return newInvite;
}

export function getUserInvites(email: string): (Invite & { projectName: string; senderName: string })[] {
    const db = readDB();
    const invites = db.invites.filter((i) => i.receiverEmail === email && i.status === 'pending');

    return invites.map(invite => {
        const project = db.projects.find(p => p.id === invite.projectId);
        const sender = db.users.find(u => u.id === invite.senderId);
        return {
            ...invite,
            projectName: project?.name || 'Unknown Project',
            senderName: sender?.name || 'Unknown User'
        };
    });
}

export function getProjectInviteByEmail(projectId: string, email: string): Invite | undefined {
    const db = readDB();
    return db.invites.find(
        (i) => i.projectId === projectId && i.receiverEmail === email
    );
}

export function updateInviteStatus(inviteId: string, status: 'accepted' | 'declined') {
    const db = readDB();
    const invite = db.invites.find((i) => i.id === inviteId);
    if (invite) {
        invite.status = status;
        writeDB(db);
    }
}

export function canAccessProject(userId: string, projectId: string): boolean {
    const db = readDB();
    console.log(`Checking access for User: ${userId} to Project: ${projectId}`);

    const project = db.projects.find((p) => p.id === projectId);
    if (!project) {
        console.log("Project not found");
        return false;
    }

    if (project.ownerId === userId) {
        console.log("User is owner");
        return true;
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) {
        console.log("User not found in DB");
        return false;
    }

    const invite = db.invites.find(
        (i) => i.projectId === projectId && i.receiverEmail === user.email && i.status === 'accepted'
    );

    if (invite) console.log("User has accepted invite");
    else console.log("No accepted invite found");

    return !!invite;
}

export function getProjectCollaborators(projectId: string): User[] {
    const db = readDB();
    const acceptedInvites = db.invites.filter(
        (i) => i.projectId === projectId && i.status === 'accepted'
    );

    const users = acceptedInvites.map(invite =>
        db.users.find(u => u.email === invite.receiverEmail)
    ).filter((u): u is User => !!u);

    // Deduplicate users by ID
    return Array.from(new Map(users.map(u => [u.id, u])).values());
}

export function revokeAccess(projectId: string, email: string) {
    const db = readDB();
    // Remove the invite
    db.invites = db.invites.filter(
        (i) => !(i.projectId === projectId && i.receiverEmail === email)
    );
    writeDB(db);
}

