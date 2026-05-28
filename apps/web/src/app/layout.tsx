import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { APP_NAME, APP_TAGLINE } from "@/lib/branding";

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
