import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface ContextEditorProps {
  presets: string[];
  dictionary: string[];
  snippets: string[];
  onChange: (
    field: "presets" | "dictionary" | "snippets",
    values: string[],
  ) => void;
}

export function ContextEditor({
  presets,
  dictionary,
  snippets,
  onChange,
}: ContextEditorProps) {
  const [drafts, setDrafts] = useState({
    presets: "",
    dictionary: "",
    snippets: "",
  });
  const groups = [
    ["presets", "Context presets", presets, "e.g. Client project update"],
    ["dictionary", "Custom dictionary", dictionary, "e.g. Capacitor"],
    ["snippets", "Quick snippets", snippets, "e.g. Best regards, Jay"],
  ] as const;

  return (
    <div className="context-grid">
      {groups.map(([field, title, values, placeholder]) => (
        <section className="context-section" key={field}>
          <h3>{title}</h3>
          <div className="add-row">
            <input
              value={drafts[field]}
              placeholder={placeholder}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [field]: event.target.value,
                }))
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" && drafts[field].trim()) {
                  onChange(field, [...values, drafts[field].trim()]);
                  setDrafts((current) => ({ ...current, [field]: "" }));
                }
              }}
            />
            <button
              className="icon-button"
              aria-label={`Add ${title}`}
              onClick={() => {
                if (!drafts[field].trim()) return;
                onChange(field, [...values, drafts[field].trim()]);
                setDrafts((current) => ({ ...current, [field]: "" }));
              }}
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="chip-list">
            {values.map((value, index) => (
              <span className="chip" key={`${value}-${index}`}>
                {value}
                <button
                  aria-label={`Remove ${value}`}
                  onClick={() =>
                    onChange(
                      field,
                      values.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
