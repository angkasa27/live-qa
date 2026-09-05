"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Date and time as two native controls rather than one `datetime-local`.
 *
 * The combined picker is a single tap target that opens a spinner for both halves at once,
 * which on a phone means scrolling past a year of dates to change 19.30 to 20.00. Split, each
 * half is the platform's own picker and either can be corrected without touching the other.
 *
 * The value stays the `YYYY-MM-DDTHH:mm` string the form already holds, so nothing downstream
 * changes: the caller still hands it to `new Date()` and stores timestamptz.
 */
export default function DateTimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [date = "", time = ""] = value.split("T");

  return (
    <div className="grid grid-cols-2 gap-3">
      <Field className="gap-1.5">
        <FieldLabel htmlFor="startsAtDate" className="font-bold">
          Tanggal
        </FieldLabel>
        <Input
          id="startsAtDate"
          type="date"
          required
          value={date}
          onChange={(e) => onChange(`${e.target.value}T${time || "00:00"}`)}
        />
      </Field>
      <Field className="gap-1.5">
        <FieldLabel htmlFor="startsAtTime" className="font-bold">
          Waktu
        </FieldLabel>
        <Input
          id="startsAtTime"
          type="time"
          required
          value={time}
          onChange={(e) => onChange(`${date}T${e.target.value}`)}
        />
      </Field>
    </div>
  );
}
