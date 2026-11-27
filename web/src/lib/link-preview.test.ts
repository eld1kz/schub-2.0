import { describe, expect, it } from "vitest";
import { foundDetails, readEventPage } from "./link-preview";

const page = (head: string) => `<!doctype html><html><head>${head}</head><body></body></html>`;
const ld = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data)}</script>`;

describe("readEventPage", () => {
  it("reads a schema.org Event", () => {
    const html = page(
      ld({
        "@context": "https://schema.org",
        "@type": "Event",
        name: "Seoul Builders Hackathon 2027",
        startDate: "2027-03-06T09:00:00+09:00",
        endDate: "2027-03-07T18:00:00+09:00",
        eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
        location: { "@type": "Place", name: "Sample Hall", address: { "@type": "PostalAddress", addressLocality: "Seoul", addressCountry: "KR" } },
        organizer: { "@type": "Organization", name: "Sample Club" },
        offers: { "@type": "Offer", validThrough: "2027-02-20T23:59:00+09:00" },
        description: "Build something in 30 hours &amp; ship it.",
        inLanguage: ["ko", "en-US"],
      }),
    );
    expect(readEventPage(html)).toEqual({
      title: "Seoul Builders Hackathon 2027",
      type: "hackathon",
      organizer: "Sample Club",
      description: "Build something in 30 hours & ship it.",
      city: "Seoul",
      country: "KR",
      online: false,
      deadline: "2027-02-20",
      starts_at: "2027-03-06",
      ends_at: "2027-03-07",
      languages: ["Korean", "English"],
    });
  });

  it("finds the event inside @graph, with a subtype and a virtual location", () => {
    const html = page(ld({ "@graph": [{ "@type": "WebSite", name: "Site" }, { "@type": ["EducationEvent"], name: "AI Challenge", startDate: "2027-01-10", location: { "@type": "VirtualLocation", url: "https://example.com/live" } }] }));
    expect(readEventPage(html)).toMatchObject({ title: "AI Challenge", type: "competition", online: true, country: "", starts_at: "2027-01-10" });
  });

  it("reads a country by name and a text address", () => {
    expect(readEventPage(page(ld({ "@type": "Event", name: "X Fest", location: { "@type": "Place", address: { addressCountry: { name: "Kazakhstan" } } } }))).country).toBe("KZ");
    expect(readEventPage(page(ld({ "@type": "Event", name: "Y Fest", location: "Mapo-gu, Seoul, South Korea" }))).country).toBe("KR");
  });

  it("falls back to Open Graph and meta tags, in any attribute order", () => {
    const html = page(`
      <title>Ignored when og:title exists</title>
      <meta content="Imagine Cup 2027" property="og:title">
      <meta property='og:description' content='Student tech competition &#8211; worldwide'>
      <meta property="og:site_name" content="Microsoft">
      <meta property="og:locale" content="en_US">`);
    expect(readEventPage(html)).toMatchObject({
      title: "Imagine Cup 2027", organizer: "Microsoft", description: "Student tech competition – worldwide", languages: ["English"], starts_at: "",
    });
  });

  it("skips broken JSON-LD and ignores a ticket deadline after the start", () => {
    const html = page(`<script type="application/ld+json">{not json</script>${ld({ "@type": "Event", name: "Late Tickets", startDate: "2027-05-01", offers: [{ validThrough: "2027-05-02" }] })}`);
    expect(readEventPage(html)).toMatchObject({ title: "Late Tickets", deadline: "" });
  });

  it("an empty page gives an empty form, and says so", () => {
    const empty = readEventPage("<html></html>");
    expect(empty.title).toBe("");
    expect(foundDetails(empty)).toBe(false);
    expect(foundDetails(readEventPage(page(ld({ "@type": "Event", name: "Z", startDate: "2027-01-01" }))))).toBe(true);
  });
});
