import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RePERFORMANCE | 전주 서신동 재활 트레이닝",
  description:
    "전북 전주시 완산구 서신동 RePERFORMANCE. Rehab to Performance, 재활에서 운동까지 이어지는 1:1 재활 트레이닝 공간입니다.",
  keywords: [
    "RePERFORMANCE",
    "리퍼포먼스",
    "전주 재활운동",
    "전주 재활 트레이닝",
    "서신동 PT",
    "전주 PT",
    "부모님 재활",
    "시니어 재활",
    "선수 재활",
    "유소년 선수 트레이닝"
  ],
  openGraph: {
    title: "RePERFORMANCE | Rehab to Performance",
    description:
      "통증과 불편함을 운동으로 관리하고, 재활에서 운동 복귀까지 책임지는 전주 서신동 재활 트레이닝 공간입니다.",
    images: ["/images/coach-profile.jpg"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
