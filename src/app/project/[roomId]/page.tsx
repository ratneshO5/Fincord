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

    const project = getProject(roomId);

    if (!project) {
        return <div>Project not found</div>;
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
