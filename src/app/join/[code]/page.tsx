import { auth } from "@/auth";
import { getProjectByInviteCode, createInvite, updateInviteStatus, getUser, canAccessProject } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function JoinPage({ params }: { params: { code: string } }) {
    const session = await auth();
    const { code } = params;

    if (!session?.user) {
        redirect(`/api/auth/signin?callbackUrl=/join/${code}`);
    }

    const project = getProjectByInviteCode(code);

    if (!project) {
        return (
            <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>
                <h1>Project Not Found</h1>
                <p>The invite link is invalid or expired.</p>
            </div>
        );
    }

    // Check if already has access
    const hasAccess = canAccessProject(session.user.id!, project.id);
    if (hasAccess) {
        redirect(`/project/${project.id}`);
    }

    // Grant access: Create an accepted invite
    // We need the user's email.
    if (session.user.email) {
        // Create an invite from the owner (or system) to this user
        // We use the project owner as sender, or a system ID.
        // Let's use the project owner ID.
        const invite = createInvite(project.id, project.ownerId, session.user.email);
        
        // Immediately accept it
        updateInviteStatus(invite.id, 'accepted');
        
        redirect(`/project/${project.id}`);
    } else {
         return (
            <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>
                <h1>Error</h1>
                <p>Could not verify your email address.</p>
            </div>
        );
    }
}
