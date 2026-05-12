import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RePERFORMANCE | 전주 재활 트레이닝",
  description:
    "전주 서신동 RePERFORMANCE. 통증과 불편함을 운동으로 관리하고, 다시 편하게 움직이는 일상을 돕는 재활 트레이닝 공간입니다.",
  keywords: [
    "전주 재활운동",
    "전주 PT",
    "서신동 PT",
    "전주 재활 트레이닝",
    "리퍼포먼스",
    "RePERFORMANCE",
    "부모님 재활",
    "선수 재활",
    "학생 운동복귀"
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
