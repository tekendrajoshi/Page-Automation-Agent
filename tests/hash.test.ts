import { describe, expect, it } from "vitest";
import { stableHash } from "../src/lib/utils/hash";

describe("stableHash", () => {
  it("creates the same hash for the same content", () => {
    expect(stableHash({ title: "IOE notice" })).toBe(stableHash({ title: "IOE notice" }));
  });

  it("changes when content changes", () => {
    expect(stableHash({ title: "IOE notice" })).not.toBe(stableHash({ title: "IOE result" }));
  });
});
