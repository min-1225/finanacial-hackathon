import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecondSign · 가입 전 원칙 대조",
  description:
    "내가 확정한 금융 원칙과 상품설명서에서 근거가 확인된 조건만 대조하는 가입 전 검증 도구",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
