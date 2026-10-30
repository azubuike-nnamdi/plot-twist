import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#100d1d",
        }}
      >
        <div
          style={{
            width: 148,
            height: 148,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#9b7bff",
            borderRadius: 36,
            color: "#100d1d",
          }}
        >
          <div style={{ fontSize: 92, fontWeight: 800, lineHeight: 1 }}>P</div>
          <div
            style={{
              width: 64,
              height: 8,
              marginTop: 4,
              background: "#ff6b8a",
              borderRadius: 8,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  )
}
