import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Clipboard,
  Languages,
  Mic,
  Settings2,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { ContextEditor } from "./components/ContextEditor";
import { LanguageModal } from "./components/LanguageModal";
import { Waveform } from "./components/Waveform";
import { createSpeechCapture, type SpeechCapture } from "./lib/speechCapture";
import { usePersistentState } from "./lib/usePersistentState";
import { languages } from "./lib/languages";

const tones = ["Default", "Casual", "Formal", "More Casual"] as const;
type ContextField = "presets" | "dictionary" | "snippets";

export default function App() {
  const speech = useRef<SpeechCapture>();
  const [text, setText] = usePersistentState("voice-pro-transcript", "");
  const [language, setLanguage] = usePersistentState(
    "voice-pro-language",
    "en-US",
  );
  const [presets, setPresets] = usePersistentState<string[]>(
    "voice-pro-presets",
    ["Concise product update"],
  );
  const [dictionary, setDictionary] = usePersistentState<string[]>(
    "voice-pro-dictionary",
    ["Voice Pro", "Capacitor"],
  );
  const [snippets, setSnippets] = usePersistentState<string[]>(
    "voice-pro-snippets",
    ["Thanks for your time."],
  );
  const [tone, setTone] = useState<(typeof tones)[number]>("Default");
  const [interim, setInterim] = useState("");
  const [refined, setRefined] = useState("");
  const [listening, setListening] = useState(false);
  const [nativeVolume, setNativeVolume] = useState(0);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    speech.current = createSpeechCapture();
    const unsubscribers = [
      speech.current.onResult((result) => {
        setText((current) =>
          `${current}${current.trim() ? " " : ""}${result}`.trimStart(),
        );
        setInterim("");
      }),
      speech.current.onInterimResult(setInterim),
      speech.current.onError((message) => {
        setError(message);
        setListening(false);
        setNativeVolume(0);
      }),
      speech.current.onVolumeLevel(setNativeVolume),
      speech.current.onListeningChange(setListening),
    ];
    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      void speech.current?.stop();
    };
  }, [setText]);

  const languageLabel = useMemo(
    () => languages.find(([code]) => code === language)?.[1] ?? language,
    [language],
  );

  const toggleListening = async () => {
    setError("");
    try {
      if (listening) {
        await speech.current?.stop();
        setListening(false);
        setNativeVolume(0);
        setInterim("");
      } else {
        setNativeVolume(0);
        setListening(true);
        await speech.current?.start(language);
      }
    } catch (caught) {
      setListening(false);
      setNativeVolume(0);
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to start speech recognition.",
      );
    }
  };

  const refine = async () => {
    if (!text.trim()) return;
    setRefining(true);
    setError("");
    try {
      const response = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          tone,
          context: [
            ...presets,
            `Preferred words: ${dictionary.join(", ")}`,
            `Snippets: ${snippets.join(" | ")}`,
          ].join("\n"),
        }),
      });
      const data = (await response.json()) as {
        refined?: string;
        error?: string;
      };
      if (!response.ok || !data.refined)
        throw new Error(data.error || "Refinement failed.");
      setRefined(data.refined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Refinement failed.");
    } finally {
      setRefining(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(refined || text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const updateContext = (field: ContextField, values: string[]) => {
    if (field === "presets") setPresets(values);
    if (field === "dictionary") setDictionary(values);
    if (field === "snippets") setSnippets(values);
  };

  return (
    <main className="app-shell">
      <div className="mesh mesh-one" />
      <div className="mesh mesh-two" />
      <motion.div
        className="workspace"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <header>
          <div className="brand">
            <div className="brand-mark">
              <Sparkles size={18} />
            </div>
            <div>
              <h1>Voice Pro</h1>
              <p>Think out loud. Write with clarity.</p>
            </div>
          </div>
          <button
            className="secondary-button"
            onClick={() => setContextOpen((open) => !open)}
          >
            <Settings2 size={17} />
            Context
          </button>
        </header>

        <AnimatePresence>
          {contextOpen && (
            <motion.section
              className="glass-card context-card"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="row-between">
                <div>
                  <p className="eyebrow">Personalize</p>
                  <h2>Writing context</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setContextOpen(false)}
                  aria-label="Close context"
                >
                  <X size={18} />
                </button>
              </div>
              <ContextEditor
                presets={presets}
                dictionary={dictionary}
                snippets={snippets}
                onChange={updateContext}
              />
            </motion.section>
          )}
        </AnimatePresence>

        <section
          className={`glass-card capture-card ${listening ? "is-listening" : ""}`}
        >
          <div className="capture-top">
            <button
              className="language-button"
              onClick={() => setLanguageOpen(true)}
            >
              <Languages size={17} />
              {languageLabel}
              <ChevronDown size={15} />
            </button>
            <span className={`status ${listening ? "live" : ""}`}>
              <i />
              {listening ? "Listening" : "Ready"}
            </span>
          </div>

          <Waveform active={listening} nativeLevel={nativeVolume} />

          <motion.button
            className={`record-button ${listening ? "stop" : ""}`}
            whileTap={{ scale: 0.96 }}
            onClick={() => void toggleListening()}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
          >
            {listening ? (
              <Square size={24} fill="currentColor" />
            ) : (
              <Mic size={28} />
            )}
          </motion.button>
          <p className="record-hint">
            {listening ? "Tap to finish" : "Tap to start dictating"}
          </p>
        </section>

        {error && (
          <div className="error-banner" role="alert">
            {error}
          </div>
        )}

        <section className="glass-card editor-card">
          <div className="row-between">
            <div>
              <p className="eyebrow">Live transcript</p>
              <h2>Your words</h2>
            </div>
            <button
              className="text-button danger"
              onClick={() => {
                setText("");
                setInterim("");
                setRefined("");
              }}
              disabled={!text && !interim}
            >
              <Trash2 size={15} />
              Clear text
            </button>
          </div>
          <div className="transcript-wrap">
            <textarea
              aria-label="Transcript"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Your words will appear here. You can also type or paste text..."
            />
            {interim && <p className="interim">{interim}</p>}
          </div>
          <div className="refine-controls">
            <label>
              Tone
              <select
                value={tone}
                onChange={(event) =>
                  setTone(event.target.value as (typeof tones)[number])
                }
              >
                {tones.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <button
              className="primary-button"
              disabled={!text.trim() || refining}
              onClick={() => void refine()}
            >
              <Sparkles size={17} />
              {refining ? "Refining..." : "Refine with AI"}
            </button>
          </div>
        </section>

        <AnimatePresence>
          {refined && (
            <motion.section
              className="glass-card result-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <div className="row-between">
                <div>
                  <p className="eyebrow">Polished</p>
                  <h2>Refined output</h2>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => void copy()}
                >
                  {copied ? <Check size={17} /> : <Clipboard size={17} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                aria-label="Refined output"
                value={refined}
                onChange={(event) => setRefined(event.target.value)}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </motion.div>
      <LanguageModal
        open={languageOpen}
        selected={language}
        onSelect={setLanguage}
        onClose={() => setLanguageOpen(false)}
      />
    </main>
  );
}
