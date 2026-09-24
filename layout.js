import "@fontsource-variable/inter";
import "./globals.css";
import { ToastProvider } from "@/components/ds";

export const metadata = {
  title: "SplitSmart AI",
  description: "Split smarter. Settle with confidence.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
