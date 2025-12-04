import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getProject, getProjectCollaborators } from "@/lib/db";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { projectId } = await params;
    const project = getProject(projectId);

    if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Only owner can see the full list? Or maybe collaborators too?
    // Usually collaborators can see who else is there.
    // But "revoke" is owner only.
    // Let's allow anyone with access to see the list.
    // For now, let's restrict to owner for "Managing" purposes as requested.
    if (project.ownerId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const collaborators = getProjectCollaborators(projectId);
    return NextResponse.json({ collaborators });
}
