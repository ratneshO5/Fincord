import { Room } from "@/app/Room";
import { CollaborativeEditor } from "@/components/CollaborativeEditor";
import { auth } from "@/auth";
import { canAccessProject, getProject } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function ProjectPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = await params;
    const session = await auth();

    console.log(`[ProjectPage] Checking access. Room: ${roomId}, User: ${session?.user?.id}, Email: ${session?.user?.email}`);

    if (!session?.user?.email) {
        console.log("[ProjectPage] No session or email, redirecting to home.");
        redirect("/");
    }

    const project = getProject(roomId);

    if (!project) {
        return (
            <div style={{
                display: "flex",
                height: "100vh",
                alignItems: "center",
                justifyContent: "center",
                background: "#1e1e1e",
                color: "white",
                flexDirection: "column",
                gap: "1rem",
                textAlign: "center"
            }}>
                <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>Project Not Found</h1>
                <p style={{ color: "#a1a1aa" }}>This project does not exist or has been deleted.</p>
                <div style={{ padding: "1rem", background: "#2a2a2a", borderRadius: "0.5rem", maxWidth: "400px" }}>
                    <p style={{ fontSize: "0.875rem", color: "#fbbf24" }}>
                        ⚠️ <strong>Note for Vercel Demo:</strong><br />
                        Since this is a serverless deployment using a temporary database,
                        projects are deleted when the server restarts (which happens frequently).
                    </p>
                </div>
                <a href="/" style={{
                    marginTop: "1rem",
                    padding: "0.5rem 1rem",
                    background: "#3b82f6",
                    color: "white",
                    borderRadius: "0.375rem",
                    textDecoration: "none"
                }}>Return to Dashboard</a>
            </div>
        );
    }

    const hasAccess = canAccessProject(session.user.id!, roomId);
    console.log(`[ProjectPage] hasAccess: ${hasAccess}`);

    if (!hasAccess) {
        return (
            <div style={{
                display: "flex",
                height: "100vh",
                alignItems: "center",
                justifyContent: "center",
                background: "#1e1e1e",
                color: "white",
                flexDirection: "column",
                gap: "1rem"
            }}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view this project.</p>
                <a href="/" style={{ color: "#3b82f6", textDecoration: "underline" }}>Return to Dashboard</a>
            </div>
        );
    }

    const isOwner = session?.user?.id === project.ownerId;

    return (
        <main>
            <Room roomId={decodeURIComponent(roomId)}>
                <CollaborativeEditor
                    projectId={project.id}
                    inviteCode={project.inviteCode}
                    projectName={project.name}
                    isOwner={isOwner}
                />
            </Room>
        </main>
    );
}
