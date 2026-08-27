import { exportContactsVcard } from "@/lib/contacts/api";
import { relayVcard } from "@/lib/contacts/vcardResponse";

/**
 * `GET /contacts/vcard` — download the whole address book as one `.vcf`.
 *
 * A static segment, so it wins the match against `/contacts/[id]`.
 */
export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search") ?? undefined;
  return relayVcard(() => exportContactsVcard(search));
}
