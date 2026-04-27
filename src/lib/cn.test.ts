import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges tailwind classes and resolves conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-ink", false && "hidden", "font-bold"))
      .toBe("text-ink font-bold");
  });
});
