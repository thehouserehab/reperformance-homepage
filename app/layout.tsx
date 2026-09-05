import type { Metadata, Viewport } from "next";
import { AppStateProvider } from "@/components/AppStateProvider";
import { PwaRegistrar } from "@/components/PwaRegistrar";
import "./globals.css";

export const metadata: Metadata = {
  title: "RP APP | 공부와 실기를 한 흐름으로",
  description: "체대입시 학생의 공부, 운동, 회복과 상담을 연결하는 RePERFORMANCE 앱",
  applicationName: "RP APP",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#344335",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppStateProvider>
          {children}
          <PwaRegistrar />
        </AppStateProvider>
      </body>
    </html>
  );
}
