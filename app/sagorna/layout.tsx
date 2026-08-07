import type { ReactNode } from "react";
import { SagornaShell } from "./sagorna-shell";

export default function SagornaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SagornaShell />
      {children}
    </>
  );
}
