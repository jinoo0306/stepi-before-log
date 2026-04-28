import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "stepi · 채용 작업 로그",
  description: "채용 과정 작업 시간 측정 도구",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
