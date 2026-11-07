"use client";

import { useEffect } from "react";

export function useDialogDismiss(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const scrollRoot = document.querySelector<HTMLElement>(
      "[data-mobile-app-shell]",
    );
    const previousRootOverflow = scrollRoot?.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    if (scrollRoot) {
      scrollRoot.style.overflow = "hidden";
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (scrollRoot) {
        scrollRoot.style.overflow = previousRootOverflow ?? "";
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);
}
