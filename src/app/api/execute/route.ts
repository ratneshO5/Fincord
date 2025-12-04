import { NextResponse } from "next/server";

// Simple proxy to a Piston-compatible execution engine.
// Set env var PISTON_URL to a Piston server (e.g. https://emkc.org/api/v2/piston/execute)
const DEFAULT_PISTON = "https://emkc.org/api/v2/piston/execute";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const pistonUrl = process.env.PISTON_URL || DEFAULT_PISTON;

    // Normalize request body for Piston
    // Expecting: { language, version?, files: [{name, content}], stdin?, args? }
    const pistonBody: any = {
      language: body.language,
      // version is required by many Piston deployments (for compiled languages like C).
      // If caller didn't provide one, we'll try to auto-select a suitable runtime.
      version: body.version,
      files: body.files || [{ name: body.filename || "main", content: body.code || "" }],
      stdin: body.stdin || "",
      args: body.args || [],
    };

    // If no version provided, try to query the runtimes endpoint and pick a reasonable default
    if (!pistonBody.version) {
      try {
        const base = pistonUrl.replace(/\/execute\/?$/, "");
        const runtimesRes = await fetch(`${base}/runtimes`);
        if (runtimesRes.ok) {
          const runtimes = await runtimesRes.json();
          if (Array.isArray(runtimes) && runtimes.length > 0) {
            // Try to find a matching runtime for the requested language
            const lang = (body.language || "").toString().toLowerCase();
            let found: any = null;
            for (const r of runtimes) {
              const rLang = (r.language || r.name || "").toString().toLowerCase();
              if (rLang === lang) {
                found = r;
                break;
              }
            }

            if (!found) {
              // try fuzzy match contains
              for (const r of runtimes) {
                const rLang = (r.language || r.name || "").toString().toLowerCase();
                if (rLang.includes(lang) || lang.includes(rLang)) {
                  found = r;
                  break;
                }
              }
            }

            if (found) {
              // determine a version string from the runtime entry
              let chosenVersion: string | undefined;
              if (typeof found.version === "string" && found.version) chosenVersion = found.version;
              else if (Array.isArray(found.versions) && found.versions.length > 0) {
                // versions might be an array of strings or objects
                const v = found.versions[0];
                if (typeof v === "string") chosenVersion = v;
                else if (v && typeof v.version === "string") chosenVersion = v.version;
              } else if (Array.isArray(found) && typeof found[0] === "string") {
                chosenVersion = found[0];
              }

              if (chosenVersion) {
                pistonBody.version = chosenVersion;
              }
            }
          }
        }
      } catch (e) {
        // ignore and let Piston return the error if it needs a version
      }
    }

    const res = await fetch(pistonUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(pistonBody),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
