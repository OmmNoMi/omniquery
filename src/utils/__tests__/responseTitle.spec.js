import { describe, it, expect } from "vitest";
import { resolveResponseTitle } from "../responseTitle";

describe("resolveResponseTitle", () => {
  it("resolves full tokens according to default format", () => {
    const responses = {
      respondent_name: "Sunita Devi",
      village_gp: "Rampur",
      enterprise_name: "Devi Dairy",
    };
    const title = resolveResponseTitle(responses);
    expect(title).toBe("Sunita Devi - Rampur (Devi Dairy)");
  });

  it("handles case-insensitive and trimmed keys", () => {
    const responses = {
      " RESPONDENT_NAME ": "  Radha Sharma  ",
      village_gp: "Kalyanpur",
      enterprise_name: "Radha Handicrafts",
    };
    const title = resolveResponseTitle(responses);
    expect(title).toBe("Radha Sharma - Kalyanpur (Radha Handicrafts)");
  });

  it("resolves alias fields such as full_name and village", () => {
    const responses = {
      full_name: "Geeta Bai",
      village: "Shivnagar",
      business_name: "Shiv Garments",
    };
    const title = resolveResponseTitle(responses);
    expect(title).toBe("Geeta Bai - Shivnagar (Shiv Garments)");
  });

  it("cleans up punctuation when optional tokens are missing", () => {
    const responsesWithoutBiz = {
      respondent_name: "Meena Patel",
      village_gp: "Gokulpur",
    };
    const title = resolveResponseTitle(responsesWithoutBiz);
    expect(title).toBe("Meena Patel - Gokulpur");

    const responsesOnlyName = {
      respondent_name: "Anita Kumari",
    };
    const titleName = resolveResponseTitle(responsesOnlyName);
    expect(titleName).toBe("Anita Kumari");
  });

  it("supports custom template format strings", () => {
    const responses = {
      farmer_name: "Ramesh Kumar",
      khasra_no: "412/9",
    };
    const title = resolveResponseTitle(responses, "{farmer_name} [Khasra {khasra_no}]");
    expect(title).toBe("Ramesh Kumar [Khasra 412/9]");
  });

  it("falls back gracefully when responses are empty or invalid", () => {
    expect(resolveResponseTitle({}, "", "Custom Fallback")).toBe("Custom Fallback");
    expect(resolveResponseTitle(null, "", "Custom Fallback")).toBe("Custom Fallback");
    expect(resolveResponseTitle(undefined)).toBe("In-Progress Draft");
  });
});
