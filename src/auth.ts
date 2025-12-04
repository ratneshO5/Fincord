import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { createUser, getUser } from "@/lib/db";

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user.email) return false;
            const existingUser = getUser(user.email);
            if (!existingUser) {
                createUser({
                    name: user.name || "Unknown",
                    email: user.email,
                    image: user.image || undefined,
                    color: "#" + Math.floor(Math.random() * 16777215).toString(16) // Random default color
                });
            }
            return true;
        },
        async jwt({ token, trigger, session }) {
            if (trigger === "update" && session) {
                token.name = session.name;
                token.color = session.color;
            }
            if (!token.color && token.email) {
                const dbUser = getUser(token.email);
                if (dbUser) {
                    token.color = dbUser.color;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user?.email) {
                const dbUser = getUser(session.user.email);
                if (dbUser) {
                    session.user.id = dbUser.id;
                    // @ts-ignore
                    session.user.color = token.color || dbUser.color;
                    session.user.name = token.name || dbUser.name;
                }
            }
            return session;
        },
    },
});
