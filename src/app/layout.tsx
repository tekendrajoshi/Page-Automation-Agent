import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "IOE Page Automation Agent",
  description: "AI assisted Facebook page automation for IOE students."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
