import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus } from "lucide-react";
import ApiErrorPanel from "@/components/contacts/ApiErrorPanel";
import ApiStatusBadge from "@/components/contacts/ApiStatusBadge";
import ContactsTable from "@/components/contacts/ContactsTable";
import ContactsToolbar from "@/components/contacts/ContactsToolbar";
import EmptyState from "@/components/contacts/EmptyState";
import Pagination from "@/components/contacts/Pagination";
import { buttonClasses } from "@/components/ui/Button";
import { ApiUnreachableError, apiBaseUrl } from "@/lib/apiClient";
import { getHealth, listContacts } from "@/lib/contacts/api";
import {
  contactsHref,
  parseContactListQuery,
  toApiParams,
  type RawSearchParams,
} from "@/lib/contacts/query";
import type { ContactPage } from "@/lib/contacts/types";

export const metadata: Metadata = {
  title: "Contacts",
  description: "Browse, search, and manage contacts.",
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const query = parseContactListQuery(await searchParams);

  // The list is the page; health is a nice-to-have, so it never fails the render.
  const [outcome, health] = await Promise.all([
    listContacts(toApiParams(query)).catch((error: unknown) => error as Error),
    getHealth(),
  ]);

  const result: ContactPage | null = outcome instanceof Error ? null : outcome;
  const error: Error | null = outcome instanceof Error ? outcome : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Contacts
          </h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            {result
              ? `${result.total} ${result.total === 1 ? "contact" : "contacts"}${
                  query.search ? ` matching “${query.search}”` : ""
                }`
              : "Manage the people in your address book."}
            <ApiStatusBadge health={health} />
          </p>
        </div>

        <div className="flex items-center gap-2">
          {result && result.total > 0 ? (
            // A plain link, not a fetch — the browser sees the download headers
            // and saves the file without any client-side blob handling.
            <a
              href={
                query.search
                  ? `/contacts/vcard?search=${encodeURIComponent(query.search)}`
                  : "/contacts/vcard"
              }
              className={buttonClasses("secondary")}
            >
              <Download className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
              Export {query.search ? "matches" : "all"}
            </a>
          ) : null}

          <Link href="/contacts/new" className={buttonClasses("primary")}>
            <Plus className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            New contact
          </Link>
        </div>
      </header>

      {error ? (
        <ApiErrorPanel
          message={
            error instanceof ApiUnreachableError
              ? "The Contacts API did not respond. Start the backend and reload."
              : error.message
          }
          hint={`API base URL: ${apiBaseUrl || "(same origin)"}`}
        />
      ) : (
        <>
          <ContactsToolbar query={query} />

          {result && result.items.length > 0 ? (
            <>
              <ContactsTable contacts={result.items} query={query} />
              <Pagination
                query={query}
                total={result.total}
                shown={result.items.length}
              />
            </>
          ) : (
            <EmptyState
              searchTerm={query.search || undefined}
              clearHref={contactsHref(query, { search: "", page: 1 })}
            />
          )}
        </>
      )}
    </div>
  );
}
