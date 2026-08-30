import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/components/SettingsProvider";
import { themeBootstrapScript } from "@/lib/settings";

export const metadata: Metadata = {
  title: "오답노크",
  description: "두드리면 열릴지어다. 오답 두드리기, 오답노크 — 간격반복 문제풀이.",
  applicationName: "오답노크",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF9F6" },
    { media: "(prefers-color-scheme: dark)", color: "#181614" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* 첫 페인트 전에 테마/글자크기/폰트를 적용해 화면 번쩍임을 막습니다 */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
      </head>
      <body>
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
