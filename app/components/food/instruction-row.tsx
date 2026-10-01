import { useCallback, useMemo } from "react";
import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from "lucide-react";
import { Field, FieldLabel } from "~/components/ui/field";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { InputError } from "./errors";
export type DraftInstruction = { key: string; text: string };
export function InstructionRow({
  step,
  index,
  last,
  onChange,
  onMove,
  onRemove,
  errors,
}: {
  step: DraftInstruction;
  index: number;
  last: boolean;
  errors?: Record<string, string[]>;
  onChange: (key: string, text: string) => void;
  onMove: (key: string, direction: -1 | 1) => void;
  onRemove: (key: string) => void;
}) {
  const name = useMemo(() => `instructions.${index}`, [index]);
  const position = useMemo(() => index + 1, [index]);
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) =>
      onChange(step.key, event.target.value),
    [step.key, onChange],
  );
  const up = useCallback(() => onMove(step.key, -1), [step.key, onMove]);
  const down = useCallback(() => onMove(step.key, 1), [step.key, onMove]);
  const remove = useCallback(() => onRemove(step.key), [step.key, onRemove]);
  return (
    <Field data-invalid={!!errors?.[name]}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={step.key}>Step {position}</FieldLabel>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={up}
            disabled={index === 0}
            aria-label={`Move step ${position} up`}
          >
            <ArrowUpIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={down}
            disabled={last}
            aria-label={`Move step ${position} down`}
          >
            <ArrowDownIcon />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={remove}
            aria-label={`Remove step ${position}`}
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <Textarea
        id={step.key}
        value={step.text}
        onChange={handleChange}
        rows={3}
        placeholder="What happens next?"
        aria-invalid={!!errors?.[name]}
      />
      <InputError errors={errors} name={name} />
    </Field>
  );
}
