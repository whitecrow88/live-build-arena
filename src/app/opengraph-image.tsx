import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "StreamCoder.live — AI Apps Built Live on Stream";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F0F0F",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #6EE7B7, #3B82F6)",
            display: "flex",
          }}
        />

        {/* Live badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.4)",
            borderRadius: 999,
            padding: "6px 16px",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#EF4444",
              display: "flex",
            }}
          />
          <span style={{ color: "#FCA5A5", fontSize: 14, letterSpacing: 2 }}>
            LIVE ON STREAM
          </span>
        </div>

        {/* Main title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: -2,
            marginBottom: 16,
            display: "flex",
          }}
        >
          <span>Stream</span>
          <span style={{ color: "#6EE7B7" }}>Coder</span>
          <span>.live</span>
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 26,
            color: "#6B7280",
            textAlign: "center",
            maxWidth: 700,
            display: "flex",
          }}
        >
          Donate your idea. Get a working app built live in 15 minutes.
        </div>

        {/* Bottom pills */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            display: "flex",
            gap: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7280", fontSize: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7", display: "flex" }} />
            GitHub Repo
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7280", fontSize: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7", display: "flex" }} />
            Live Preview
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6B7280", fontSize: 16 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#6EE7B7", display: "flex" }} />
            15 Min Build
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
