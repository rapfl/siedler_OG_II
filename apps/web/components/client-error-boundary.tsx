"use client";

import type { ReactNode } from "react";
import { Component } from "react";

interface ClientErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((controls: { reset: () => void }) => ReactNode);
  resetKeys?: unknown[];
}

interface ClientErrorBoundaryState {
  hasError: boolean;
}

export class ClientErrorBoundary extends Component<ClientErrorBoundaryProps, ClientErrorBoundaryState> {
  state: ClientErrorBoundaryState = {
    hasError: false,
  };

  private readonly resetBoundary = () => {
    this.setState({ hasError: false });
  };

  static getDerivedStateFromError(): ClientErrorBoundaryState {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error) {
    console.error("Match surface crashed", error);
  }

  componentDidUpdate(previousProps: ClientErrorBoundaryProps) {
    if (this.state.hasError && didResetKeysChange(previousProps.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return typeof this.props.fallback === "function" ? this.props.fallback({ reset: this.resetBoundary }) : this.props.fallback;
    }

    return this.props.children;
  }
}

function didResetKeysChange(previous: unknown[] | undefined, next: unknown[] | undefined) {
  if (!previous || !next) {
    return previous !== next;
  }

  if (previous.length !== next.length) {
    return true;
  }

  return previous.some((value, index) => !Object.is(value, next[index]));
}
