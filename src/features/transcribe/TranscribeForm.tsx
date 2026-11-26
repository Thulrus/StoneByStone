import { Trans, useLingui } from '@lingui/react/macro';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useStore } from '../../app/store-context';
import { removePerson } from '../../data/people';
import {
  emptyPerson,
  isBlank,
  personDraft,
  type PersonDraft,
  type TranscriptionDraft,
} from '../../data/transcribe';
import type { ID, Monument, Person } from '../../domain';
import { Button } from '../../ui/Button';
import { cn } from '../../ui/cn';
import { toast } from '../../ui/toast-store';
import { LinkPersonDialog } from '../people/LinkPersonDialog';
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
  /** Cemetery setting that orders numeric dates. */
  dateLocale: string;
  /** "Row 1, stone 3" for a person's stone. */
  whereOf: (monumentId: ID | undefined) => string;
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
  whereOf,
  dateLocale,
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

  const [linking, setLinking] = useState<Person>();

  /** Save now; the draft with any replaced person ids swapped in. */
  const saveNow = async (d: TranscriptionDraft) => {
    const renamed = await onSaveNow(d);
    return { ...d, people: d.people.map((p) => ({ ...p, id: renamed[p.id] ?? p.id })) };
  };

  /** Ctrl+Enter: save, and a new person on this stone. */
  const addPerson = async () => {
    if (!draft) return;
    const saved = await saveNow(draft);
    const fresh = emptyPerson(store.newId());
    focusPerson.current = fresh.id;
    setDraft({ ...saved, people: [...saved.people, fresh] });
  };

  /** Links need a saved person, so save first. */
  const openLink = async (p: PersonDraft) => {
    if (!draft) return;
    const at = draft.people.indexOf(p);
    const saved = await saveNow(draft);
    setDraft(saved);
    const person = await store.persons.get(saved.people[at]?.id ?? p.id);
    if (person) setLinking(person);
    else toast({ title: t`Type a name first`, tone: 'error' });
  };

  const remove = async (p: PersonDraft) => {
    if (!draft) return;
    const rest = draft.people.filter((x) => x.id !== p.id);
    setDraft({ ...draft, people: rest.length ? rest : [emptyPerson(store.newId())] });
    if (!(await store.persons.get(p.id))) return;
    await removePerson(store, p.id);
    toast({
      title: t`Person removed`,
      action: {
        label: t`Undo`,
        onAction: () =>
          void store
            .undo()
            .then(() =>
              setDraftState(
                (d) => d && { ...d, people: [...d.people.filter((x) => !isBlank(x)), p] },
              ),
            ),
      },
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
          onRemove={() => void remove(p)}
          onLink={() => void openLink(p)}
          whereOf={whereOf}
          dateLocale={dateLocale}
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
      {linking ? (
        <LinkPersonDialog
          key={linking.id}
          person={linking}
          whereOf={whereOf}
          open
          onOpenChange={(o) => {
            if (!o) setLinking(undefined);
          }}
        />
      ) : null}
    </form>
  );
}
