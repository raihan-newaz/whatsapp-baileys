import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/context/ToastContext";
import { SocketProvider } from "@/context/SocketContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PushNotificationManager } from "@/components/PushNotificationManager";

const poppins = Poppins({ 
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "WA Marketing Pro — WhatsApp SaaS",
  description: "Bulk WhatsApp marketing automation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${poppins.variable} ${poppins.className} bg-background text-foreground antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ToastProvider>
            <SocketProvider>
              <PushNotificationManager>
                {children}
              </PushNotificationManager>
            </SocketProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
