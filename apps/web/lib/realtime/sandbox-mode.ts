export function isLocalSandboxHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isSandboxEnabledForRuntime(options?: {
  nodeEnv?: string;
  hostname?: string;
  forceEnable?: string;
}): boolean {
  if (options?.forceEnable === "1") {
    return true;
  }

  if (options?.nodeEnv !== "production") {
    return true;
  }

  return options?.hostname ? isLocalSandboxHost(options.hostname) : false;
}
