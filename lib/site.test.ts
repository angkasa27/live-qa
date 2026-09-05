import { describe, expect, it } from "vitest";
import { eventUrl, eventUrlPrefix } from "./site.ts";

describe("eventUrl", () => {
  it("joins an origin and an id", () => {
    expect(eventUrl("https://sual.id", "adab-sebelum-ilmu")).toBe(
      "https://sual.id/events/adab-sebelum-ilmu",
    );
  });

  it("is empty until the origin is known, so nothing renders a half-built link", () => {
    expect(eventUrl("", "adab-sebelum-ilmu")).toBe("");
  });
});

describe("eventUrlPrefix", () => {
  it("drops the scheme, because a form shows an address not a URL", () => {
    expect(eventUrlPrefix("https://sual.id")).toBe("sual.id/events/");
    expect(eventUrlPrefix("http://localhost:3000")).toBe("localhost:3000/events/");
  });

  it("degrades to a bare path before hydration", () => {
    expect(eventUrlPrefix("")).toBe("/events/");
  });
});
