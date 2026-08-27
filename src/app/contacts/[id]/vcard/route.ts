import { getContactVcard } from "@/lib/contacts/api";
import { relayVcard } from "@/lib/contacts/vcardResponse";

/** `GET /contacts/{id}/vcard` — download one contact as a `.vcf`. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // `Number.parseInt` stops at the first non-digit, so "1abc" and "1.5" would
  // both silently download contact 1. Match the whole segment instead.
  const raw = (await params).id;
  if (!/^[1-9]\d*$/.test(raw)) {
    return new Response("Contact not found.", { status: 404 });
  }

  return relayVcard(() => getContactVcard(Number(raw)));
}
