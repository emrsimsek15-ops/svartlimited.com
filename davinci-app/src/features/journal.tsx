import { useLiveQuery } from 'dexie-react-hooks';
import { Star, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { db } from '../db/db';
import { emptyJournal, saveJournal } from '../db/repo';
import type { JournalEntry } from '../lib/types';
import { strings } from '../i18n';

function useJournal(kind: 'trade' | 'day', ref: string) {
  const row = useLiveQuery(() => db.journal.get(`${kind}:${ref}`).then((r) => r ?? null), [kind, ref]);
  const empty = useMemo(() => emptyJournal(kind, ref), [kind, ref]);
  return row ?? empty;
}

/** Debounced autosave. */
function useAutosave(entry: JournalEntry) {
  const [draft, setDraft] = useState(entry);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setDraft(entry);
  }, [entry.id, entry.updatedAt]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!dirty.current) return;
    setStatus('saving');
    const t = setTimeout(async () => {
      await saveJournal(draft);
      dirty.current = false;
      setStatus('saved');
    }, 500);
    return () => clearTimeout(t);
  }, [draft]);
  const update = (patch: Partial<JournalEntry>) => {
    dirty.current = true;
    setDraft((d) => ({ ...d, ...patch }));
  };
  return { draft, update, status };
}

export function NoteEditor({ kind, refKey, placeholder }: { kind: 'trade' | 'day'; refKey: string; placeholder: string }) {
  const entry = useJournal(kind, refKey);
  const { draft, update, status } = useAutosave(entry);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label">{kind === 'day' ? strings.calendar.dayNote : strings.detail.note}</span>
        <span className="text-[11.5px] text-faint" aria-live="polite">{status === 'saved' ? strings.common.saved : status === 'saving' ? '…' : ''}</span>
      </div>
      <textarea className="input min-h-[120px] resize-y py-2.5 leading-relaxed" placeholder={placeholder} value={draft.note} onChange={(e) => update({ note: e.target.value })} aria-label={kind === 'day' ? strings.calendar.dayNote : strings.detail.note} />
    </div>
  );
}

export function TradeJournal({ tradeKey }: { tradeKey: string }) {
  const entry = useJournal('trade', tradeKey);
  const { draft, update, status } = useAutosave(entry);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="label">{strings.detail.note}</span>
          <span className="text-[11.5px] text-faint" aria-live="polite">{status === 'saved' ? strings.common.saved : status === 'saving' ? '…' : ''}</span>
        </div>
        <textarea className="input min-h-[120px] resize-y py-2.5 leading-relaxed" placeholder={strings.detail.notePlaceholder} value={draft.note} onChange={(e) => update({ note: e.target.value })} aria-label={strings.detail.note} />
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="label">{strings.detail.setup}</span>
        <input className="input" value={draft.setup ?? ''} placeholder={strings.detail.setupPlaceholder} onChange={(e) => update({ setup: e.target.value || undefined })} />
      </label>
      <ChipInput label={strings.detail.tags} placeholder={strings.detail.addTag} values={draft.tags} onChange={(tags) => update({ tags })} prefix="#" />
      <ChipInput label={strings.detail.mistakes} placeholder={strings.detail.addMistake} values={draft.mistakes} onChange={(mistakes) => update({ mistakes })} tone="loss" />
      <div>
        <span className="label mb-1.5 block">{strings.detail.rating}</span>
        <div className="flex gap-1" role="radiogroup" aria-label={strings.detail.rating}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={draft.rating === n} aria-label={`${n}`} onClick={() => update({ rating: draft.rating === n ? undefined : n })} className="icon-btn h-11 w-11">
              <Star size={22} className={(draft.rating ?? 0) >= n ? 'fill-warn text-warn' : 'text-faint'} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChipInput({ label, placeholder, values, onChange, prefix = '', tone = 'accent' }: { label: string; placeholder: string; values: string[]; onChange: (v: string[]) => void; prefix?: string; tone?: 'accent' | 'loss' }) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim().replace(/^#/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setText('');
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    } else if (e.key === 'Backspace' && !text && values.length) onChange(values.slice(0, -1));
  };
  return (
    <div>
      <span className="label mb-1.5 block">{label}</span>
      <div className="input flex min-h-[44px] flex-wrap items-center gap-1.5 py-1.5">
        {values.map((v) => (
          <span key={v} className={`inline-flex h-7 max-w-full items-center gap-1 rounded-[7px] pl-2 pr-1 text-[12.5px] font-medium ${tone === 'loss' ? 'bg-loss/12 text-loss' : 'bg-accent/15 text-accent'}`}>
            <span className="truncate">{prefix}{v}</span>
            <button onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`${strings.common.delete} ${v}`} className="grid h-5 w-5 place-items-center rounded hover:bg-white/10">
              <X size={12} />
            </button>
          </span>
        ))}
        <input className="min-w-[90px] flex-1 bg-transparent py-1 text-text placeholder:text-faint focus:outline-none" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} onBlur={add} aria-label={label} />
      </div>
    </div>
  );
}
