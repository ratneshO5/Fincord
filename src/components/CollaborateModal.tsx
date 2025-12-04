"use client";

import { useState, useEffect } from "react";
import styles from "./CollaborateModal.module.css";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    inviteCode: string;
    projectName: string;
    isOwner: boolean;
};

type Collaborator = {
    id: string;
    name: string;
    email: string;
    image?: string;
};

export function CollaborateModal({ isOpen, onClose, projectId, inviteCode, projectName, isOwner }: Props) {
    const [activeTab, setActiveTab] = useState<'link' | 'invite' | 'manage'>('link');
    const [email, setEmail] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(false);

    useEffect(() => {
        if (isOpen && activeTab === 'manage') {
            fetchCollaborators();
        }
    }, [isOpen, activeTab]);

    const fetchCollaborators = async () => {
        setIsLoadingCollaborators(true);
        try {
            const res = await fetch(`/api/project/${projectId}/collaborators`);
            if (res.ok) {
                const data = await res.json();
                setCollaborators(data.collaborators);
            }
        } catch (error) {
            console.error("Failed to fetch collaborators", error);
        } finally {
            setIsLoadingCollaborators(false);
        }
    };

    const handleRevoke = async (emailToRevoke: string) => {
        if (!confirm(`Are you sure you want to remove ${emailToRevoke} from this project?`)) return;

        try {
            const res = await fetch(`/api/project/${projectId}/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailToRevoke }),
            });

            if (res.ok) {
                setCollaborators(prev => prev.filter(c => c.email !== emailToRevoke));
                setMessage({ type: 'success', text: 'Access revoked successfully' });
            } else {
                setMessage({ type: 'error', text: 'Failed to revoke access' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' });
        }
    };

    if (!isOpen) return null;

    const inviteLink = `${window.location.origin}/join/${inviteCode}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setMessage({ type: 'success', text: 'Link copied to clipboard!' });
        setTimeout(() => setMessage(null), 3000);
    };

    const handleSendInvite = async () => {
        if (!email.trim()) return;
        setIsSending(true);
        setMessage(null);

        try {
            const res = await fetch('/api/invite/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId, email }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'Invite sent successfully!' });
                setEmail("");
            } else {
                const data = await res.json();
                setMessage({ type: 'error', text: data.error || 'Failed to send invite' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <>
            <div className={styles.overlay} onClick={onClose} />
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Collaborate on {projectName}</h2>
                    <button onClick={onClose} className={styles.closeBtn}>×</button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'link' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('link')}
                    >
                        Invitation Code
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'invite' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('invite')}
                    >
                        Invite by Email
                    </button>
                    {isOwner && (
                        <button
                            className={`${styles.tab} ${activeTab === 'manage' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('manage')}
                        >
                            Manage Access
                        </button>
                    )}
                </div>

                <div className={styles.content}>
                    {activeTab === 'link' && (
                        <div className={styles.linkSection}>
                            <p className={styles.description}>
                                Share this Secure Invitation ID to let others join.
                            </p>
                            <div className={styles.linkBox}>
                                <input readOnly value={inviteCode} className={styles.linkInput} style={{ textAlign: 'center', letterSpacing: '2px', fontWeight: 'bold' }} />
                                <button onClick={() => {
                                    navigator.clipboard.writeText(inviteCode);
                                    setMessage({ type: 'success', text: 'Code copied to clipboard!' });
                                    setTimeout(() => setMessage(null), 3000);
                                }} className={styles.copyBtn}>
                                    Copy
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'invite' && (
                        <div className={styles.inviteSection}>
                            <p className={styles.description}>
                                Send an invite to a user's email address.
                            </p>
                            <div className={styles.inputGroup}>
                                <input
                                    type="email"
                                    placeholder="Enter email address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.emailInput}
                                />
                                <button
                                    onClick={handleSendInvite}
                                    disabled={isSending}
                                    className={styles.sendBtn}
                                >
                                    {isSending ? 'Sending...' : 'Send Invite'}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'manage' && (
                        <div className={styles.manageSection}>
                            <p className={styles.description}>
                                People with access to this project.
                            </p>
                            {isLoadingCollaborators ? (
                                <p className={styles.loading}>Loading...</p>
                            ) : collaborators.length === 0 ? (
                                <p className={styles.emptyState}>No other collaborators yet.</p>
                            ) : (
                                <div className={styles.collaboratorsList}>
                                    {collaborators.map(c => (
                                        <div key={c.id} className={styles.collaboratorItem}>
                                            <div className={styles.collaboratorInfo}>
                                                <div className={styles.collaboratorAvatar}>
                                                    {c.image ? <img src={c.image} alt={c.name} /> : (c.name || 'U').charAt(0)}
                                                </div>
                                                <div>
                                                    <div className={styles.collaboratorName}>{c.name}</div>
                                                    <div className={styles.collaboratorEmail}>{c.email}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRevoke(c.email)}
                                                className={styles.revokeBtn}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {message && (
                        <div className={`${styles.message} ${styles[message.type]}`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
