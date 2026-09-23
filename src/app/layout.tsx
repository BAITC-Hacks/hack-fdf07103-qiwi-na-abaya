import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qadam · задачи с реальным смыслом",
  description: "Платформа бизнес-задач и студенческих решений. Демонстрационная база MVP.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
