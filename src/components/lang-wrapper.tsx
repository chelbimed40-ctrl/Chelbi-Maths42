"use client";

import type { ReactNode } from "react";
import { LangProvider } from "@/lib/i18n";

export function LangWrapper({ children }: { children: ReactNode }) {
  return <LangProvider>{children}</LangProvider>;
}
