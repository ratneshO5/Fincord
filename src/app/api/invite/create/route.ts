import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createInvite, getUser, getUserInvites, getProjectInviteByEmail } from "@/lib/db";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { projectId, email } = await req.json();

        if (!projectId || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (email === session.user.email) {
            return NextResponse.json({ error: "You cannot invite yourself" }, { status: 400 });
        }

        // Check if already invited (pending or accepted)
        const existingInvite = getProjectInviteByEmail(projectId, email);

        if (existingInvite) {
            if (existingInvite.status === 'accepted') {
                return NextResponse.json({ error: "User is already a collaborator" }, { status: 400 });
            }
            if (existingInvite.status === 'pending') {
                return NextResponse.json({ error: "Invite already sent" }, { status: 400 });
            }
        }

        const senderId = session.user.id || "unknown";
        createInvite(projectId, senderId, email);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error creating invite:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
