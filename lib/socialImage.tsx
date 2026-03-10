import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";

import {
  SITE_DESCRIPTION,
  SITE_LOGO_PATH,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

export const socialImageSize = {
  width: 1200,
  height: 630,
};

export const socialImageContentType = "image/png";

let logoDataUrlPromise: Promise<string> | null = null;

async function getLogoDataUrl() {
  if (!logoDataUrlPromise) {
    const logoPath = path.join(process.cwd(), "public", SITE_LOGO_PATH.replace(/^\//, ""));
    logoDataUrlPromise = readFile(logoPath).then((buffer) => {
      return `data:image/png;base64,${buffer.toString("base64")}`;
    });
  }

  return logoDataUrlPromise;
}

export async function createSocialImageResponse() {
  const logoDataUrl = await getLogoDataUrl();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "54px",
          background:
            "radial-gradient(circle at top left, rgba(74, 112, 255, 0.34), transparent 34%), radial-gradient(circle at bottom right, rgba(215, 173, 91, 0.28), transparent 28%), linear-gradient(135deg, #08111f 0%, #10192d 52%, #070d18 100%)",
          color: "#f5f0e6",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "stretch",
            gap: "34px",
            borderRadius: "34px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            background: "rgba(9, 16, 29, 0.58)",
            boxShadow: "0 26px 64px rgba(3, 7, 15, 0.48)",
            padding: "34px",
          }}
        >
          <div
            style={{
              width: "38%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "28px",
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02))",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <img
              src={logoDataUrl}
              alt=""
              style={{
                width: "82%",
                height: "82%",
                objectFit: "contain",
              }}
            />
          </div>

          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "18px",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "22px",
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#d6deef",
              }}
            >
              <span
                style={{
                  display: "flex",
                  width: "12px",
                  height: "12px",
                  borderRadius: "999px",
                  background: "#d7ad5b",
                  boxShadow: "0 0 0 8px rgba(215, 173, 91, 0.12)",
                }}
              />
              {SITE_NAME}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div
                style={{
                  fontSize: "66px",
                  lineHeight: 1,
                  letterSpacing: "-0.05em",
                  fontWeight: 700,
                  fontFamily: "Georgia, 'Times New Roman', serif",
                }}
              >
                {SITE_TITLE}
              </div>
              <div
                style={{
                  maxWidth: "600px",
                  fontSize: "28px",
                  lineHeight: 1.45,
                  color: "rgba(245, 240, 230, 0.82)",
                }}
              >
                {SITE_DESCRIPTION}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "16px",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.12)",
                fontSize: "22px",
                color: "rgba(214, 222, 239, 0.86)",
              }}
            >
              <span>Act reference and member portal</span>
              <span>{SITE_URL.replace(/^https?:\/\//, "")}</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...socialImageSize,
    },
  );
}
