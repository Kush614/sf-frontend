import "server-only";

import { ApiUnreachableError } from "@/lib/apiClient";

/**
 * Relay a vCard from the API to the browser as a download.
 *
 * The backend URL is server-only, so the browser cannot fetch the vCard itself
 * — these routes are the bridge. Only the two headers a download needs are
 * copied through; everything else the upstream sends is dropped rather than
 * forwarded blind.
 */
export async function relayVcard(
  fetchUpstream: () => Promise<Response>,
): Promise<Response> {
  let upstream: Response;
  try {
    upstream = await fetchUpstream();
  } catch (error) {
    if (error instanceof ApiUnreachableError) {
      return new Response("The Contacts API is unreachable.", { status: 503 });
    }
    throw error;
  }

  if (!upstream.ok) {
    return new Response("Contact not found.", {
      status: upstream.status === 404 ? 404 : 502,
    });
  }

  const headers = new Headers({
    "Content-Type": upstream.headers.get("Content-Type") ?? "text/vcard; charset=utf-8",
    // The API builds this filename from an allow-list of characters.
    "Content-Disposition":
      upstream.headers.get("Content-Disposition") ?? 'attachment; filename="contact.vcf"',
    "Cache-Control": "no-store",
  });

  // Relay the body as a stream rather than awaiting `.text()`. Reading it here
  // would hold the whole address book in memory before a single byte reached
  // the browser — and it happens outside the catch above, so a stall after the
  // headers arrived would surface as an unhandled 500 rather than the 503 this
  // function exists to produce.
  return new Response(upstream.body, { headers });
}
