import { getContactVcard } from "@/lib/contacts/api";
import { relayVcard } from "@/lib/contacts/vcardResponse";

/** `GET /contacts/{id}/vcard` — download one contact as a `.vcf`. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isInteger(id) || id < 1) {
    return new Response("Contact not found.", { status: 404 });
  }

  return relayVcard(() => getContactVcard(id));
}
