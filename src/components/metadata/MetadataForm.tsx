import { OCCASIONS, MAX_MESSAGE_LEN, MAX_NOTE_LEN, type CardMetadata } from '../../types/card';

interface Props {
  value: CardMetadata;
  onChange: (patch: Partial<CardMetadata>) => void;
}

export function MetadataForm({ value, onChange }: Props) {
  return (
    <div className="grid gap-4">
      <Field label="Title">
        <input
          type="text"
          value={value.title}
          maxLength={80}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="e.g. Mom's 60th Birthday"
          className="input"
        />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Occasion">
          <select
            value={value.occasion}
            onChange={(e) =>
              onChange({ occasion: e.target.value as CardMetadata['occasion'] })
            }
            className="input"
          >
            {OCCASIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date received">
          <input
            type="date"
            value={value.dateReceived}
            onChange={(e) => onChange({ dateReceived: e.target.value })}
            className="input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="From">
          <input
            type="text"
            value={value.from}
            maxLength={80}
            onChange={(e) => onChange({ from: e.target.value })}
            placeholder="Signed by…"
            className="input"
          />
        </Field>
        <Field label="To">
          <input
            type="text"
            value={value.to}
            maxLength={80}
            onChange={(e) => onChange({ to: e.target.value })}
            placeholder="For…"
            className="input"
          />
        </Field>
      </div>

      <Field
        label={`Message transcription (${value.message.length}/${MAX_MESSAGE_LEN})`}
        hint="Verbatim text from the card — printed sentiment and handwriting. Autofill can do this for you."
      >
        <textarea
          value={value.message}
          maxLength={MAX_MESSAGE_LEN}
          rows={6}
          onChange={(e) => onChange({ message: e.target.value })}
          placeholder={`"Dear Michelle,\nIt was so nice seeing your nice writing…"`}
          className="input resize-y min-h-[140px] font-serif leading-relaxed"
        />
      </Field>

      <Field label={`Personal note (${value.note.length}/${MAX_NOTE_LEN})`} hint="Your own memory about this card.">
        <textarea
          value={value.note}
          maxLength={MAX_NOTE_LEN}
          rows={3}
          onChange={(e) => onChange({ note: e.target.value })}
          placeholder="Anything you want to remember about this card…"
          className="input resize-y"
        />
      </Field>

      <style>{`
        .input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #E5E0D8;
          background: #FFFFFF;
          font-size: 15px;
          color: #1C1C1E;
          outline: none;
        }
        .input:focus {
          border-color: #C2603A;
          box-shadow: 0 0 0 3px rgba(194, 96, 58, 0.15);
        }
      `}</style>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-ink-muted uppercase tracking-wide mb-1.5">
        {label}
      </span>
      {children}
      {hint && (
        <span className="block text-[11px] text-ink-muted mt-1.5">{hint}</span>
      )}
    </label>
  );
}
