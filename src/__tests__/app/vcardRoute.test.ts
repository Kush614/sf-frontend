import { http, HttpResponse } from "msw";
import { GET } from "@/app/contacts/[id]/vcard/route";
import { api } from "../mocks/handlers";
import { server } from "../mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function request(id: string) {
  return GET(new Request("http://localhost/contacts/x/vcard"), {
    params: Promise.resolve({ id }),
  });
}

describe("GET /contacts/[id]/vcard", () => {
  it("downloads the contact when the segment is a plain id", async () => {
    server.use(
      http.get(api("/api/v1/contacts/1/vcard"), () =>
        HttpResponse.text("BEGIN:VCARD\r\nEND:VCARD\r\n", {
          headers: { "Content-Type": "text/vcard" },
        }),
      ),
    );

    const response = await request("1");
    expect(response.status).toBe(200);
    expect(await response.text()).toContain("BEGIN:VCARD");
  });

  it.each(["1abc", "1.5", "01", "0", "-1", " 1", "1e3", ""])(
    "rejects %p instead of silently downloading a different contact",
    async (id) => {
      // parseInt would stop at the first non-digit and hand back contact 1.
      const response = await request(id);
      expect(response.status).toBe(404);
    },
  );
});
