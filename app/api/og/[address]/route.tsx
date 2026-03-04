import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(
  req: Request,
  { params }: { params: { address: string } }
) {
  const { searchParams } = new URL(req.url);
  const verdict = searchParams.get("verdict") ?? "UNKNOWN";
  const score = searchParams.get("score") ?? "—";
  const symbol = searchParams.get("symbol") ?? params.address.slice(0, 8) + "…";

  const verdictColor =
    verdict === "RUG"
      ? "#cc2222"
      : verdict === "HIGH"
        ? "#993333"
        : verdict === "CAUTION"
          ? "#998800"
          : "#2a7a2a";

  const shortAddr = `${params.address.slice(0, 6)}…${params.address.slice(-6)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#080808",
          display: "flex",
          flexDirection: "column",
          fontFamily: "monospace",
          padding: "60px",
          border: "1px solid #252525",
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "48px",
          }}
        >
          <span style={{ color: "#f0f0f0", fontSize: "14px", letterSpacing: "0.3em" }}>
            SPECTR
          </span>
          <span style={{ color: "#555", fontSize: "12px", letterSpacing: "0.2em" }}>
            SOLANA TOKEN INTELLIGENCE
          </span>
        </div>

        {/* Horizontal rule */}
        <div style={{ background: "#252525", height: "1px", marginBottom: "48px" }} />

        {/* Main content */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flex: 1 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ color: "#f0f0f0", fontSize: "52px", fontWeight: "bold", letterSpacing: "-1px" }}>
              {symbol}
            </div>
            <div style={{ color: "#555", fontSize: "16px", letterSpacing: "0.1em" }}>
              {shortAddr}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
            <div
              style={{
                color: verdictColor,
                fontSize: "64px",
                fontWeight: "bold",
                letterSpacing: "0.1em",
              }}
            >
              {verdict}
            </div>
            <div style={{ color: "#a0a0a0", fontSize: "20px" }}>
              Risk Score: {score}/100
            </div>
          </div>
        </div>

        {/* Bottom rule */}
        <div style={{ background: "#252525", height: "1px", marginTop: "48px", marginBottom: "24px" }} />
        <div style={{ color: "#333", fontSize: "12px", letterSpacing: "0.2em" }}>
          spectr.gg — forensic-grade solana token intelligence
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
