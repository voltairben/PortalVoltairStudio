import { describe, expect, it } from "vitest";
import { normalizeRepo } from "./repo";

describe("normalizeRepo", () => {
  const canonical = "voltairben/portalvoltairstudio";

  it.each([
    "voltairben/PortalVoltairStudio",
    "https://github.com/voltairben/PortalVoltairStudio",
    "https://github.com/voltairben/PortalVoltairStudio.git",
    "https://www.github.com/voltairben/PortalVoltairStudio/",
    "git@github.com:voltairben/PortalVoltairStudio.git",
    "  voltairben/PortalVoltairStudio  ",
  ])("collapses %j to the owner/repo slug", (input) => {
    expect(normalizeRepo(input)).toBe(canonical);
  });
});
