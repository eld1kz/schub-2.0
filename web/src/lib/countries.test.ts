import { describe, expect, it } from "vitest";
import { cityIn, countryName, countryOf } from "./countries";

describe("countryOf", () => {
  it("knows cities in English and in their own script", () => {
    expect(countryOf("Seoul")).toBe("KR");
    expect(countryOf("서울특별시")).toBe("KR");
    expect(countryOf("수원시")).toBe("KR");
    expect(countryOf("Almaty")).toBe("KZ");
    expect(countryOf("Ташкент")).toBe("UZ");
    expect(countryOf("san francisco")).toBe("US");
  });

  it("knows countries by name and common aliases", () => {
    expect(countryOf("South Korea")).toBe("KR");
    expect(countryOf("Korea")).toBe("KR");
    expect(countryOf("UK")).toBe("GB");
  });

  it("finds the country in an address or a longer line", () => {
    expect(countryOf("Gangnam-gu, Seoul, South Korea")).toBe("KR");
    expect(countryOf("Seoul Korea")).toBe("KR");
    expect(countryOf("서울 강남구")).toBe("KR");
  });

  it("never reads a short word as a country code", () => {
    expect(countryOf("in the lab")).toBeNull();
    expect(countryOf("")).toBeNull();
    expect(countryOf("Somewhere")).toBeNull();
  });
});

describe("cityIn and countryName", () => {
  it("picks the known city out of an address, as written", () => {
    expect(cityIn("20 Tojeong-ro, Mapo-gu, Seoul, South Korea")).toBe("Seoul");
    expect(cityIn("Check event page for more details.")).toBe("");
  });

  it("names a code in English", () => {
    expect(countryName("KR")).toBe("South Korea");
    expect(countryName(null)).toBe("");
    expect(countryName("XX")).toBe("");
  });
});
