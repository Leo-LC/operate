import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import { DM_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/sonner";
import { getOrgTheme } from "@/lib/theme";

const sans = localFont({
  src: "../../public/brand/fonts/satoshi/Fonts/WEB/fonts/Satoshi-Variable.woff2",
  variable: "--font-sans",
  weight: "300 900",
  display: "swap",
});

const serif = localFont({
  src: "../../public/brand/fonts/cabinet_grotesk/Fonts/WEB/fonts/CabinetGrotesk-Variable.woff2",
  variable: "--font-serif",
  weight: "100 900",
  display: "swap",
});

const decorative = localFont({
  src: "../../public/brand/fonts/the_next_southerland/Next Southerland Serif.otf",
  variable: "--font-decorative",
  display: "swap",
});

const mono = DM_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Operate",
  description: "Internal operations platform",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgTheme = await getOrgTheme();

  return (
    <html
      lang="en"
      data-theme={orgTheme}
      className={cn("font-sans", sans.variable, serif.variable, decorative.variable, mono.variable)}
      suppressHydrationWarning // next-themes mutates class on the client; data-theme is server-stable
    >
      <body className="antialiased">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
