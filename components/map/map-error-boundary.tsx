"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("MapErrorBoundary caught:", error);
    }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[70vh] flex-col items-center justify-center gap-4 rounded-[2rem] border bg-[var(--surface-soft)] p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-strong)]">
            <AlertTriangle className="h-6 w-6 text-[var(--foreground)]/60" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Map could not load</h2>
            <p className="mt-1 max-w-xs text-sm text-[var(--foreground)]/60">
              Something went wrong while rendering the map. This can happen with
              WebGL or network issues.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="gap-2"
            onClick={() => {
              this.setState({ hasError: false });
            }}
          >
            <RotateCcw className="h-4 w-4" />
            Reload map
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
