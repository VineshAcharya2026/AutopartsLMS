import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in | CenterCRM",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
