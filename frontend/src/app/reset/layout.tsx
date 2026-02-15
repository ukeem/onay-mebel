import type { Metadata } from "next";

export const metadata: Metadata = { title: "Восстановление пароля" };

export default function ResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
