import "./globals.css";
import { Providers } from "@/components/providers";
export const metadata = { title: "Daily Checklist", description: "A focused daily recurring checklist" };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><Providers>{children}</Providers></body></html>; }
