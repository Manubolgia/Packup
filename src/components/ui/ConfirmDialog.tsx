import { Sheet } from './Sheet';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" block onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} block onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-[var(--app-muted)]">{message}</p>
    </Sheet>
  );
}
