import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useStore } from '../../app/store-context';
import {
  emptyPerson,
  personDraft,
  type PersonDraft,
  type TranscriptionDraft,
} from '../../data/transcribe';
import type { ID, Monument } from '../../domain';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { PersonFields } from './PersonFields';
import { applyEdit, illegible, uncertain } from './shortcuts';

export interface TranscribeFormProps {
  stone: Monument;
  /** "Row 4, stone 3", status and place in the list. */
  header: ReactNode;
  canPrevious: boolean;
  /** Every change, so moving away by any route can save it. */
  onDraft: (d: TranscriptionDraft) => void;
  onNext: () => void;
  onPrevious: () => void;
  /** Save without moving; resolves to replaced person ids. */
  onSaveNow: (d: TranscriptionDraft) => Promise<Record<ID, ID>>;
}

/** Keyboard-first transcription form (plan §9). Waits for the stone's people to load. */
export function TranscribeForm(props: TranscribeFormProps) {
  const store = useStore();
  const people = useLiveQuery(
    () => store.persons.byMonument(props.stone.id),
    [store, props.stone.id],
  );
  const [initial, setInitial] = useState<TranscriptionDraft>();
  // Taken once: later live updates are this form's own saves.
  if (people && !initial) {
    const drafts = people.map(personDraft);
    setInitial({
      inscription: props.stone.inscription?.text ?? '',
      epitaph: props.stone.epitaph ?? '',
      people: drafts.length ? drafts : [emptyPerson(store.newId())],
    });
  }
  return initial ? <Body {...props} initial={initial} /> : <Body {...props} />;
}

function Body({
  header,
  canPrevious,
  onDraft,
  onNext,
  onPrevious,
  onSaveNow,
  initial,
}: TranscribeFormProps & { initial?: TranscriptionDraft }) {
  const { t } = useLingui();
  const store = useStore();
  const [draft, setDraftState] = useState(initial);
  if (initial && !draft) setDraftState(initial);
  const inscriptionId = useId();
  const epitaphId = useId();
  const inscription = useRef<HTMLTextAreaElement>(null);
  const focusPerson = useRef<ID | undefined>(undefined);
  const nameInputs = useRef(new Map<ID, HTMLInputElement>());

  useEffect(() => {
    inscription.current?.focus();
  }, []);
  useEffect(() => {
    const id = focusPerson.current;
    if (!id) return;
    focusPerson.current = undefined;
    nameInputs.current.get(id)?.focus();
  });

  const setDraft = (d: TranscriptionDraft) => {
    setDraftState(d);
    onDraft(d);
  };
  const setPerson = (p: PersonDraft) =>
    draft && setDraft({ ...draft, people: draft.people.map((x) => (x.id === p.id ? p : x)) });

  /** Ctrl+Enter: save, and a new person on this stone. */
  const addPerson = async () => {
    if (!draft) return;
    const renamed = await onSaveNow(draft);
    const fresh = emptyPerson(store.newId());
    focusPerson.current = fresh.id;
    setDraft({
      ...draft,
      people: [...draft.people.map((p) => ({ ...p, id: renamed[p.id] ?? p.id })), fresh],
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const el = e.target;
    const text = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el : null;
    if (e.key === 'Enter') {
      e.preventDefault();
      void addPerson();
    } else if (e.key === '.' && text) {
      e.preventDefault();
      const kind = text.dataset.kind === 'date' ? 'date' : 'text';
      const edit = uncertain(text.value, text.selectionStart ?? 0, text.selectionEnd ?? 0, kind);
      if (edit) applyEdit(text, edit);
    } else if (e.key.toLowerCase() === 'i' && text) {
      e.preventDefault();
      applyEdit(text, illegible(text.selectionStart ?? 0, text.selectionEnd ?? 0));
    }
  };

  const box = cn('rounded-lg bg-surface p-3 font-mono text-base text-fg sbs-border');
  return (
    <form
      aria-label={t`Transcription`}
      className="flex flex-col gap-4"
      onKeyDown={onKeyDown}
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      {header}
      <div className="flex flex-col gap-1">
        <label htmlFor={inscriptionId} className="font-medium">
          <Trans>Inscription, as carved</Trans>
        </label>
        <textarea
          id={inscriptionId}
          ref={inscription}
          value={draft?.inscription ?? initial?.inscription ?? ''}
          readOnly={!draft}
          rows={7}
          spellCheck={false}
          onChange={(e) => draft && setDraft({ ...draft, inscription: e.currentTarget.value })}
          className={box}
        />
      </div>
      {draft?.people.map((p, i) => (
        <PersonFields
          key={p.id}
          person={p}
          n={i + 1}
          onChange={setPerson}
          nameRef={(el) => {
            if (el) nameInputs.current.set(p.id, el);
            else nameInputs.current.delete(p.id);
          }}
        />
      ))}
      <div className="flex flex-col gap-1">
        <label htmlFor={epitaphId} className="font-medium">
          <Trans>Epitaph</Trans>
        </label>
        <textarea
          id={epitaphId}
          value={draft?.epitaph ?? ''}
          readOnly={!draft}
          rows={2}
          spellCheck={false}
          onChange={(e) => draft && setDraft({ ...draft, epitaph: e.currentTarget.value })}
          className={box}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="lg">
          <Trans>Save & next</Trans>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={!canPrevious}
          onClick={onPrevious}
        >
          <Trans>Previous</Trans>
        </Button>
        <Button type="button" variant="ghost" size="lg" onClick={() => void addPerson()}>
          <Trans>Add another person</Trans>
        </Button>
      </div>
      <p className="text-sm text-fg-muted">
        <Trans>
          Enter in a one-line field: save & next. Ctrl+Enter: add another person. Ctrl+.: mark
          uncertain [?]. Ctrl+I: insert [illegible].
        </Trans>
      </p>
    </form>
  );
}
