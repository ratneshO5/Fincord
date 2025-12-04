import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateInviteStatus, getUserInvites } from "@/lib/db";

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { inviteId, status } = await req.json();

        if (!inviteId || !['accepted', 'declined'].includes(status)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Verify the invite belongs to the user
        const myInvites = getUserInvites(session.user.email);
        const invite = myInvites.find(i => i.id === inviteId);

        if (!invite) {
            // It might be already processed, so getUserInvites won't return it.
            // But for security, we should probably check if it was addressed to them.
            // For simplicity in this JSON DB, we'll trust the ID if we could fetch it, 
            // but getUserInvites only returns pending.
            // Let's assume if it's not in pending, we can't update it anyway.
            return NextResponse.json({ error: "Invite not found or already processed" }, { status: 404 });
        }

        updateInviteStatus(inviteId, status);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error responding to invite:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
