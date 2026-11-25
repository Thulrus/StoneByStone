import { Dialog, type DialogProps } from './Dialog';

export type SheetProps = Omit<DialogProps, 'placement'>;

/** Bottom sheet: primary actions stay in the thumb zone on phones (plan §17). */
export function Sheet(props: SheetProps) {
  return <Dialog {...props} placement="bottom" />;
}
