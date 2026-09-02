import { Card as UICard, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * A titled section of a form. Both event forms are built out of these.
 *
 * A thin wrapper over the shadcn Card primitives, like components/admin/Field.tsx: six call
 * sites pass a title and children, and spelling out four elements at each would not read
 * better. The wrapper keeps the styling in components/ui where a regenerate can reach it.
 */
export default function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <UICard className="gap-0 py-0">
      <CardHeader className="border-b border-border px-4 py-3">
        <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">{children}</CardContent>
    </UICard>
  );
}
