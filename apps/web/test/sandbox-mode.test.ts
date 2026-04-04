import { describe, expect, it } from "vitest";

import { isLocalSandboxHost, isSandboxEnabledForRuntime } from "../lib/realtime/sandbox-mode";

describe("sandbox mode", () => {
  it("recognizes localhost hosts for production sandbox access", () => {
    expect(isLocalSandboxHost("localhost")).toBe(true);
    expect(isLocalSandboxHost("127.0.0.1")).toBe(true);
    expect(isLocalSandboxHost("::1")).toBe(true);
    expect(isLocalSandboxHost("example.com")).toBe(false);
  });

  it("keeps sandbox tools enabled on localhost even in production mode", () => {
    expect(isSandboxEnabledForRuntime({ nodeEnv: "production", hostname: "127.0.0.1" })).toBe(true);
    expect(isSandboxEnabledForRuntime({ nodeEnv: "production", hostname: "localhost" })).toBe(true);
    expect(isSandboxEnabledForRuntime({ nodeEnv: "production", hostname: "example.com" })).toBe(false);
  });

  it("allows explicit force-enable and non-production access", () => {
    expect(isSandboxEnabledForRuntime({ nodeEnv: "production", hostname: "example.com", forceEnable: "1" })).toBe(true);
    expect(isSandboxEnabledForRuntime({ nodeEnv: "development", hostname: "example.com" })).toBe(true);
  });
});
