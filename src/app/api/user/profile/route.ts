import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getUser, createUser } from "@/lib/db";
import fs from 'fs';
import path from 'path';

// Helper to update user in DB (since db.ts doesn't export update function yet)
// We should probably add updateUser to db.ts, but for now I'll implement it here or add it to db.ts
// Actually, let's stick to db.ts pattern. I'll read/write DB here for simplicity or update db.ts.
// Let's update db.ts first? No, I can just read/write here using the same logic if I import the path.
// But db.ts encapsulates the path.
// Let's add updateUser to db.ts in the next step or just do it here.
// I'll add a helper here to keep it self-contained for now, or better, update db.ts.
// Updating db.ts is cleaner. I'll do that first.

// Wait, I can't update db.ts in the same step easily.
// I'll implement the logic here for now.

const DB_PATH = path.join(process.cwd(), 'fincord_db.json');

function readDB() {
    if (!fs.existsSync(DB_PATH)) return { users: [] };
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data: any) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.email) {
        return new Response("Unauthorized", { status: 401 });
    }

    const { name, color } = await request.json();

    const db = readDB();
    const userIndex = db.users.findIndex((u: any) => u.email === session.user.email);

    if (userIndex !== -1) {
        db.users[userIndex].name = name;
        db.users[userIndex].color = color;
        writeDB(db);
        return new Response(JSON.stringify(db.users[userIndex]), { status: 200 });
    }

    return new Response("User not found", { status: 404 });
}
