import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
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
            width: 26,
            height: 26,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#9b7bff",
            borderRadius: 7,
            color: "#100d1d",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          P
        </div>
      </div>
    ),
    { ...size }
  )
}
