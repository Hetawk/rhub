import type { Metadata } from "next";
import { DbtShellWrapper } from "@/components/tools/dbt/dbt-shell-wrapper";

export const metadata: Metadata = {
  title: "Debate Hub | EKD Digital Resource Hub",
  description:
    "Manage debates, scoring, and judging. Real-time scoring sheets with criteria-based evaluation and audience voting.",
};

export default function DebateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DbtShellWrapper>{children}</DbtShellWrapper>;
}
