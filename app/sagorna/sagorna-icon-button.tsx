"use client";

import type { ReactNode } from "react";

type SagornaIconButtonProps = {
  ariaLabel: string;
  icon: ReactNode;
  onClick: () => void;
};

export function SagornaIconButton({ ariaLabel, icon, onClick }: SagornaIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="enter-button inline-flex h-[29px] w-[29px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.04] text-[#F4F7F6] backdrop-blur-[12px] transition-[background-color,border-color,color,backdrop-filter,transform,opacity] duration-300 ease-out hover:border-[#00C2B3]/70 hover:bg-white/[0.06] hover:text-[#00C2B3] focus-visible:border-[#00C2B3]/70 focus-visible:outline-none focus-visible:ring-0 active:translate-y-[2px]"
    >
      {icon}
    </button>
  );
}
