import { ImageResponse } from "next/og"

export const size = { width: 1200, height: 630 }
export const contentType = "image/png"
export const alt = "PlotTwist. Drop secret answers. Guess the author."

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#100d1d",
          padding: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "#1b1730",
            borderRadius: 32,
            padding: 64,
            color: "white",
          }}
        >
          <div style={{ fontSize: 28, letterSpacing: 6 }}>PLOTTWIST</div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              marginTop: 20,
              maxWidth: 860,
            }}
          >
            Drop secret answers. Guess the author.
          </div>
        </div>
      </div>
    ),
    size
  )
}
