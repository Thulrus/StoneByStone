/**
 * Transcription conventions (plan §10.5): the marks used in inscriptions, stored per cemetery
 * (`settings.transcriptionConvention`) and on each inscription it was used for, so exports say
 * how the text was written. Descriptions are translated in the UI.
 */
export interface Convention {
  id: string;
  /** Lost or unreadable text. */
  illegible: string;
  /** Put after an uncertain letter or word. */
  uncertain: string;
  /** Where the stone is broken off. */
  broken: string;
  /** Text continues on the back. */
  onBack: string;
  /** How a new carved line is written. */
  lineBreak: 'newline' | 'slash';
}

export const CONVENTIONS: readonly Convention[] = [
  {
    id: 'as-carved',
    illegible: '[illegible]',
    uncertain: '[?]',
    broken: '[broken]',
    onBack: '[on back]',
    lineBreak: 'newline',
  },
  {
    id: 'slash-lines',
    illegible: '[illegible]',
    uncertain: '[?]',
    broken: '[broken]',
    onBack: '[on back]',
    lineBreak: 'slash',
  },
  {
    id: 'dashes',
    illegible: '---',
    uncertain: '(?)',
    broken: '[broken]',
    onBack: '[on back]',
    lineBreak: 'newline',
  },
];

export const DEFAULT_CONVENTION = 'as-carved';

/** The preset for an id; unknown ids (from another app version) read as the default. */
export function conventionOf(id: string | undefined): Convention {
  return CONVENTIONS.find((c) => c.id === id) ?? (CONVENTIONS[0] as Convention);
}
