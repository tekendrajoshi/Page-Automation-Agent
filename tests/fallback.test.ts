import { describe, expect, it } from "vitest";
import { fallbackDecision } from "../src/lib/ai/fallback";

describe("fallbackDecision", () => {
  it("accepts IOE exam notices without Gemini", () => {
    const decision = fallbackDecision({
      sourceType: "IOE_EXAM",
      sourceName: "IOE",
      title: "BE regular exam routine published",
      body: "The examination routine is available for students."
    });

    expect(decision.relevant).toBe(true);
    expect(decision.category).toBe("routine");
    expect(decision.caption).toContain("BE regular exam routine published");
  });

  it("ignores unrelated posts", () => {
    const decision = fallbackDecision({
      sourceType: "WEB",
      sourceName: "Random Blog",
      title: "Weekend food festival",
      body: "A local entertainment event."
    });

    expect(decision.relevant).toBe(false);
    expect(decision.category).toBe("ignore");
  });
});
