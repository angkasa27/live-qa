import { Field as UIField, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * A labelled text input. The `id` is required rather than generated: the label has to point at
 * the input for a screen reader, and a caller that can't name the field probably has a bug.
 * `children` is for whatever sits under the box, like the parsed-video echo.
 *
 * This is a thin wrapper over the shadcn Field primitives rather than a replacement for them.
 * Ten call sites pass `label`/`id`/`hint` and nothing else; spelling each out as
 * Field/FieldLabel/FieldDescription/Input would be four elements where one reads fine. The
 * wrapper is what keeps the styling in components/ui where a regenerate can reach it.
 */
export default function Field({
  label,
  id,
  hint,
  children,
  ...input
}: {
  label: React.ReactNode;
  id: string;
  hint?: string;
  children?: React.ReactNode;
} & React.ComponentProps<"input">) {
  return (
    <UIField className="gap-1.5">
      <FieldLabel htmlFor={id} className="font-medium">
        {label}
      </FieldLabel>
      {hint && <FieldDescription className="-mt-1 text-xs">{hint}</FieldDescription>}
      <Input id={id} {...input} />
      {children}
    </UIField>
  );
}
