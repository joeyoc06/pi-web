import { useMemo } from "react";
import { Field, FieldLabel, FieldDescription } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "~/components/ui/native-select";
import { InputError } from "./errors";
import { label as optionLabel } from "~/lib/sous/display";

type Props = {
  name: string;
  label: string;
  value: string;
  onChange: React.ChangeEventHandler<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  errors?: Record<string, string[]>;
  hint?: string;
  placeholder?: string;
};
export function TextField({
  name,
  label,
  value,
  onChange,
  errors,
  hint,
  multiline,
  type = "text",
  placeholder,
}: Props & { multiline?: boolean; type?: "text" | "number" | "url" }) {
  const id = useMemo(() => `recipe-${name}`, [name]);
  const errorId = useMemo(() => `${id}-error`, [id]);
  return (
    <Field data-invalid={!!errors?.[name]}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          rows={3}
          aria-invalid={!!errors?.[name]}
          aria-describedby={errorId}
          placeholder={placeholder}
        />
      ) : (
        <Input
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          type={type}
          step="any"
          min={type === "number" ? 0 : undefined}
          aria-invalid={!!errors?.[name]}
          aria-describedby={errorId}
          placeholder={placeholder}
        />
      )}
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <div id={errorId}>
        <InputError errors={errors} name={name} />
      </div>
    </Field>
  );
}
export function SelectField({
  name,
  label,
  value,
  onChange,
  errors,
  options,
  hint,
}: Props & { options: readonly string[] }) {
  const id = useMemo(() => `recipe-${name}`, [name]);
  const items = useMemo(
    () =>
      options.map((value) => (
        <NativeSelectOption key={value} value={value}>
          {optionLabel(value)}
        </NativeSelectOption>
      )),
    [options],
  );
  return (
    <Field data-invalid={!!errors?.[name]}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect
        id={id}
        className="w-full"
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={!!errors?.[name]}
      >
        {items}
      </NativeSelect>
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <InputError errors={errors} name={name} />
    </Field>
  );
}
