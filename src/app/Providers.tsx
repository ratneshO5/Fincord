"use client";

import { LiveblocksProvider } from "@liveblocks/react";
import { PropsWithChildren } from "react";
import { UserProvider, useUser } from "@/context/UserContext";
import { SessionProvider } from "next-auth/react";

function LiveblocksWrapper({ children }: PropsWithChildren) {
  const { user } = useUser();

  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        const payload = {
          room,
          user
        };
        const response = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        return await response.json();
      }}
    >
      {children}
    </LiveblocksProvider>
  );
}

export function Providers({ children }: PropsWithChildren) {
  return (
    <SessionProvider>
      <UserProvider>
        <LiveblocksWrapper>
          {children}
        </LiveblocksWrapper>
      </UserProvider>
    </SessionProvider>
  );
}
