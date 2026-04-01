"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const OVERLAY_ROOT_ID = "pinly-overlay-root";

function getOverlayRoot() {
  let overlayRoot = document.getElementById(OVERLAY_ROOT_ID);

  if (!overlayRoot) {
    overlayRoot = document.createElement("div");
    overlayRoot.id = OVERLAY_ROOT_ID;
    overlayRoot.setAttribute("data-pinly-overlay-root", "true");
    document.body.appendChild(overlayRoot);
  }

  return overlayRoot;
}

export function OverlayPortal({ children }: { children: ReactNode }) {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    setPortalNode(getOverlayRoot());
  }, []);

  if (!portalNode) {
    return null;
  }

  return createPortal(children, portalNode);
}
