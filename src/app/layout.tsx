import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { LangWrapper } from "@/components/lang-wrapper";

export const metadata: Metadata = {
  title: "النجاح في الرياضيات | الأستاذ محمد شلبي",
  description:
    "منصة Success-In-Maths التفاعلية بإشراف الأستاذ محمد شلبي: مجموعات تلاميذ، اختبارات مباشرة، تصحيح آلي، ترتيب ونجوم وتقارير.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#10142e",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <LangWrapper>{children}</LangWrapper>
      </body>
    </html>
  );
}
