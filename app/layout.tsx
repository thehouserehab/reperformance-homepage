import type { Metadata } from "next";
import "./globals.css";
import "./detail-pages.css";

export const metadata: Metadata = {
  title: "RePERFORMANCE | 전주 서신동 재활 트레이닝",
  description:
    "전주 서신동 RePERFORMANCE. 재활에서 움직임, 그리고 다시 퍼포먼스까지 이어지는 개인 맞춤 재활 트레이닝 공간입니다.",
  keywords: [
    "RePERFORMANCE",
    "리퍼포먼스",
    "전주 재활운동",
    "전주 PT",
    "서신동 PT",
    "부모님 재활",
    "시니어 재활",
    "선수 재활",
    "통증 운동",
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
