import { http, HttpResponse } from "msw";
import { relayVcard } from "@/lib/contacts/vcardResponse";
import { getContactVcard, exportContactsVcard } from "@/lib/contacts/api";
import { api } from "../../mocks/handlers";
import { server } from "../../mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const VCARD = "BEGIN:VCARD\r\nVERSION:4.0\r\nEND:VCARD\r\n";

function vcardHandler(path: string, filename: string) {
  return http.get(api(path), () =>
    HttpResponse.text(VCARD, {
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    }),
  );
}

describe("relayVcard", () => {
  it("passes the body and the download headers through", async () => {
    server.use(vcardHandler("/api/v1/contacts/1/vcard", "Ada-Lovelace.vcf"));

    const response = await relayVcard(() => getContactVcard(1));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(VCARD);
    expect(response.headers.get("Content-Type")).toBe("text/vcard; charset=utf-8");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="Ada-Lovelace.vcf"',
    );
    // A download must never be served from cache.
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("forwards the search term when exporting", async () => {
    let seen: string | null = null;
    server.use(
      http.get(api("/api/v1/contacts/vcard"), ({ request }) => {
        seen = new URL(request.url).searchParams.get("search");
        return HttpResponse.text(VCARD, {
          headers: { "Content-Type": "text/vcard" },
        });
      }),
    );

    await relayVcard(() => exportContactsVcard("lovelace"));

    expect(seen).toBe("lovelace");
  });

  it("turns a missing contact into a 404, not a 502", async () => {
    server.use(
      http.get(api("/api/v1/contacts/9999/vcard"), () =>
        HttpResponse.json({ detail: "Contact 9999 not found" }, { status: 404 }),
      ),
    );

    expect((await relayVcard(() => getContactVcard(9999))).status).toBe(404);
  });

  it("reports an upstream failure as a 502", async () => {
    server.use(
      http.get(api("/api/v1/contacts/1/vcard"), () =>
        HttpResponse.text("boom", { status: 500 }),
      ),
    );

    expect((await relayVcard(() => getContactVcard(1))).status).toBe(502);
  });

  it("reports an unreachable API as a 503 rather than throwing", async () => {
    server.use(http.get(api("/api/v1/contacts/1/vcard"), () => HttpResponse.error()));

    expect((await relayVcard(() => getContactVcard(1))).status).toBe(503);
  });

  it("only forwards the headers a download needs", async () => {
    server.use(
      http.get(api("/api/v1/contacts/1/vcard"), () =>
        HttpResponse.text(VCARD, {
          headers: {
            "Content-Type": "text/vcard",
            "Set-Cookie": "session=leaked",
            "X-Internal-Trace": "abc123",
          },
        }),
      ),
    );

    const response = await relayVcard(() => getContactVcard(1));

    expect(response.headers.get("Set-Cookie")).toBeNull();
    expect(response.headers.get("X-Internal-Trace")).toBeNull();
  });
});
