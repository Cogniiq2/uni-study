import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState title="Seite nicht gefunden">
      <ButtonLink href="/" variant="secondary" className="mt-4">Zur Übersicht</ButtonLink>
    </EmptyState>
  );
}
