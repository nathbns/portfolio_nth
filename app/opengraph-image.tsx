import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.name}: ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function serif() {
  try {
    const css = await (
      await fetch("https://fonts.googleapis.com/css2?family=STIX+Two+Text:wght@500")
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export default async function Image() {
  const font = await serif();
  const domain = site.url.replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "88px 96px 80px",
          fontFamily: font ? "STIX" : undefined,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 72, color: "#171717", letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            {site.name}
          </div>
          <div style={{ fontSize: 34, color: "#737373", marginTop: 24 }}>{site.tagline}</div>
          <div style={{ fontSize: 30, color: "#404040", marginTop: 56 }}>
            {`Computer science engineering student, ${site.school.name}`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #e5e5e5",
            paddingTop: 28,
            fontSize: 24,
            color: "#404040",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                background: "#ff7a3d",
                marginRight: 16,
              }}
            />
            {`Looking for an internship · summer ${site.internship.year}`}
          </div>
          <div style={{ color: "#a3a3a3" }}>{domain}</div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: font ? [{ name: "STIX", data: font, weight: 500, style: "normal" }] : undefined,
    },
  );
}
