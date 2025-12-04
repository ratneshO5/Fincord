import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProjectByInviteCode, createInvite, updateInviteStatus, getUserInvites, getProjectInviteByEmail } from "@/lib/db";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { code } = await req.json();

        if (!code) {
            return NextResponse.json({ error: "Missing code" }, { status: 400 });
        }

        const project = getProjectByInviteCode(code);

        if (!project) {
            return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
        }

        // Check if user already has access or is owner
        if (project.ownerId === session.user.id) {
            return NextResponse.json({ projectId: project.id });
        }

        // Check for existing invite
        const existingInvite = getProjectInviteByEmail(project.id, session.user.email);

        if (existingInvite) {
            if (existingInvite.status === 'pending') {
                updateInviteStatus(existingInvite.id, 'accepted');
            }
            // If already accepted or declined (and we want to re-allow?), just return ID.
            // If declined, we might want to switch to accepted.
            if (existingInvite.status === 'declined') {
                updateInviteStatus(existingInvite.id, 'accepted');
            }
            return NextResponse.json({ projectId: project.id });
        }

        // Create and accept new invite
        const invite = createInvite(project.id, project.ownerId, session.user.email);
        updateInviteStatus(invite.id, 'accepted');

        return NextResponse.json({ projectId: project.id });

    } catch (error) {
        console.error("Error joining project:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
