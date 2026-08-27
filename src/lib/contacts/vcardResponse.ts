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

  return new Response(await upstream.text(), { headers });
}
