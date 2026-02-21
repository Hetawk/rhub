"use client";

import * as React from "react";
import { ThemeProvider } from "./theme-provider";
import { UserProvider } from "@/contexts/user-context";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <UserProvider>{children}</UserProvider>
    </ThemeProvider>
  );
}
