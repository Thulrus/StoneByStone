/**
 * Desk-mode editing shortcuts (plan §9, conventions §10.5), pure: each returns the range to
 * replace and the text to put there, so the caller can apply it as a real edit (native undo
 * keeps working).
 */
export interface Edit {
  start: number;
  end: number;
  text: string;
}

export const ILLEGIBLE = '[illegible]';
export const UNCERTAIN = '[?]';

/** Ctrl+I: `[illegible]` (or the convention's mark) in place of the selection. */
export const illegible = (start: number, end: number, mark = ILLEGIBLE): Edit => ({
  start,
  end,
  text: mark,
});

/**
 * Ctrl+.: in text, `[?]` (or the convention's mark) after the word at (or just before) the caret, or after the
 * selection; in a date or age, a trailing `?` (which the date parser reads as "about").
 */
export function uncertain(
  value: string,
  start: number,
  end: number,
  kind: 'text' | 'date',
  mark = UNCERTAIN,
): Edit | undefined {
  if (kind === 'date') {
    const trimmed = value.replace(/\s+$/u, '');
    if (!trimmed || trimmed.endsWith('?')) return undefined;
    return { start: trimmed.length, end: value.length, text: '?' };
  }
  let at = Math.max(start, end);
  if (start === end) while (at < value.length && !/\s/u.test(value[at] ?? '')) at++;
  const marked = (from: number) => value.slice(from, from + mark.length) === mark;
  if (marked(at) || marked(at - mark.length)) return undefined;
  return { start: at, end: at, text: mark };
}

/** Apply an edit to an input or textarea as typing would (undoable, fires `input`). */
export function applyEdit(el: HTMLInputElement | HTMLTextAreaElement, e: Edit): void {
  el.focus();
  el.setSelectionRange(e.start, e.end);
  // execCommand keeps the browser's own undo stack; where it's missing (tests), set directly.
  const done =
    typeof document.execCommand === 'function' && document.execCommand('insertText', false, e.text);
  if (done) return;
  const proto = Object.getPrototypeOf(el) as HTMLInputElement;
  const set = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  set?.call(el, el.value.slice(0, e.start) + e.text + el.value.slice(e.end));
  el.setSelectionRange(e.start + e.text.length, e.start + e.text.length);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}
