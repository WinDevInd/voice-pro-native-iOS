import { AnimatePresence, motion } from "framer-motion";
import { Check, X } from "lucide-react";

export const languages = [
  ["en-US", "English (US)"],
  ["en-GB", "English (UK)"],
  ["es-ES", "Spanish"],
  ["fr-FR", "French"],
  ["de-DE", "German"],
  ["hi-IN", "Hindi"],
  ["ja-JP", "Japanese"]
] as const;

interface LanguageModalProps {
  open: boolean;
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function LanguageModal({ open, selected, onSelect, onClose }: LanguageModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
          >
            <div className="row-between">
              <div>
                <p className="eyebrow">Recognition</p>
                <h2 id="language-title">Choose a language</h2>
              </div>
              <button className="icon-button" onClick={onClose} aria-label="Close language selector">
                <X size={18} />
              </button>
            </div>
            <div className="language-list">
              {languages.map(([code, label]) => (
                <button
                  className="language-option"
                  key={code}
                  onClick={() => {
                    onSelect(code);
                    onClose();
                  }}
                >
                  <span>{label}</span>
                  {selected === code && <Check size={18} />}
                </button>
              ))}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
