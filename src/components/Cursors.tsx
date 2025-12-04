import { useEffect, useMemo, useState } from "react";
import { useSelf } from "@liveblocks/react/suspense";
import { AwarenessList, UserAwareness } from "@/liveblocks.config";
import { LiveblocksYjsProvider } from "@liveblocks/yjs";

type Props = {
  yProvider: LiveblocksYjsProvider;
};

export function Cursors({ yProvider }: Props) {
  // Original info from auth
  const info = useSelf((me) => me.info);

  // Presence coming from UserProfile (name, maybe color later)
  const presence = useSelf((me) => me.presence as any);

  const [awarenessUsers, setAwarenessUsers] = useState<AwarenessList>([]);

  // 1️⃣ Keep awareness subscription stable (like your original code)
  useEffect(() => {
    function setUsers() {
      setAwarenessUsers(
        [...yProvider.awareness.getStates()] as AwarenessList
      );
    }

    yProvider.awareness.on("change", setUsers);
    setUsers(); // initial

    return () => {
      yProvider.awareness.off("change", setUsers);
    };
  }, [yProvider]);

  // 2️⃣ Update our own "user" field in awareness when name/color change
  useEffect(() => {
    const name =
      presence?.name || info?.name || "Guest";

    const color =
      presence?.color || (info as any)?.color;

    const localUser: UserAwareness["user"] = {
      ...(info || {}),
      name,
      ...(color ? { color } : {}),
    };

    // This does NOT resubscribe, it just updates local state
    yProvider.awareness.setLocalStateField("user", localUser);
  }, [yProvider, info, presence?.name, presence?.color]);

  // Insert awareness info into cursors with styles
  const styleSheet = useMemo(() => {
    let cursorStyles = "";

    for (const [clientId, client] of awarenessUsers) {
      if (client?.user) {
        const name = client.user.name || "User";
        const color = client.user.color || "orangered";

        cursorStyles += `
          .yRemoteSelection-${clientId} {
            background-color: ${color}40; /* 25% opacity */
          }
          
          .yRemoteSelectionHead-${clientId} {
            position: absolute;
            border-left: 2px solid ${color};
            border-top: 2px solid ${color};
            border-bottom: 2px solid ${color};
            height: 100%;
            box-sizing: border-box;
          }
          
          .yRemoteSelectionHead-${clientId}::after {
            content: "${name}";
            position: absolute;
            top: -20px;
            left: -2px;
            background: ${color};
            color: #1e1e1e;
            padding: 1px 4px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
            white-space: nowrap;
            pointer-events: none;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10;
          }
        `;
      }
    }

    return { __html: cursorStyles };
  }, [awarenessUsers]);

  return <style dangerouslySetInnerHTML={styleSheet} />;
}
