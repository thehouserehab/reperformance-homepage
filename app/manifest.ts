import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RP APP",
    short_name: "RP APP",
    description: "체대입시 학생의 공부, 운동, 회복과 상담을 한 흐름으로 관리합니다.",
    start_url: "/student",
    display: "standalone",
    background_color: "#f3eee4",
    theme_color: "#344335",
    orientation: "portrait",
    icons: [
      {
        src: "/rp-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/rp-app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
