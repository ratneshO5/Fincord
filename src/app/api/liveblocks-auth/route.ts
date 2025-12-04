import { Liveblocks } from "@liveblocks/node";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { canAccessProject, getUserById } from "@/lib/db";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

console.log(`[LiveblocksAuth] Secret Key Prefix: ${process.env.LIVEBLOCKS_SECRET_KEY?.substring(0, 3)}...`);

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    console.log("[LiveblocksAuth] No session or user ID");
    return new Response("Unauthorized: No Session", { status: 403 });
  }

  const { room } = await request.json();

  if (!room) {
    return new Response("Missing room ID", { status: 400 });
  }

  // Check if user has access to this project (room)
  // Note: room ID in Liveblocks matches our Project ID
  console.log(`[LiveblocksAuth] Checking access for User: ${session.user.id}, Room: ${room}`);

  let hasAccess = canAccessProject(session.user.id, room);
  console.log(`[LiveblocksAuth] Access result: ${hasAccess}`);

  // VERCEL DEMO FIX:
  // On Vercel, serverless functions might run on different instances with separate /tmp directories.
  // If the project was created on Instance A, Instance B (running this auth check) won't see it.
  // In this case, we auto-create the project in Instance B's local DB to allow the demo to proceed.
  if (!hasAccess && process.env.VERCEL) {
    const { getProject, createProject } = await import("@/lib/db");
    const project = getProject(room);
    if (!project) {
      console.log(`[LiveblocksAuth] Project ${room} missing in this lambda instance. Auto-creating for demo.`);
      // We don't know the name, so we use a placeholder.
      createProject("Untitled Project (Demo)", session.user.id);
      // Now check access again (should be true as we just created it with this user as owner)
      hasAccess = canAccessProject(session.user.id, room);
      console.log(`[LiveblocksAuth] Access result after auto-create: ${hasAccess}`);
    }
  }

  if (!hasAccess) {
    console.log(`[LiveblocksAuth] Access DENIED for User: ${session.user.id} to Room: ${room}`);
    return new Response(`Forbidden: No Access for user ${session.user.id} to room ${room}`, { status: 403 });
  }

  const user = getUserById(session.user.id);

  const userInfo = {
    name: user?.name || session.user.name || "Unknown",
    color: "#D583F0", // TODO: Store color in DB or session
    picture: user?.image || session.user.image || "https://liveblocks.io/avatars/avatar-1.png",
  };

  const liveblocksSession = liveblocks.prepareSession(`user-${session.user.id}`, {
    userInfo,
  });

  // Allow full access to the room
  liveblocksSession.allow(room, liveblocksSession.FULL_ACCESS);

  const { body, status } = await liveblocksSession.authorize();
  console.log(`[LiveblocksAuth] Authorize status: ${status}`);
  if (status !== 200) {
    console.log(`[LiveblocksAuth] Authorize body: ${body}`);
    console.log(`[LiveblocksAuth] Secret Key Present: ${!!process.env.LIVEBLOCKS_SECRET_KEY}`);
  }
  return new Response(body, { status });
}
