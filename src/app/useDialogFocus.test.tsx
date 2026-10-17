import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDialogFocus } from './useDialogFocus';

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const dialogRef = useDialogFocus<HTMLDivElement>(open, () => setOpen(false));
  return <><button type="button" onClick={() => setOpen(true)}>Open editor</button>{open && <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Editor" tabIndex={-1}><button type="button">First</button><button type="button">Last</button></div>}</>;
}

describe('accessible dialog focus management', () => {
  it('moves focus into the dialog, traps Tab, closes on Escape, and restores focus', () => {
    render(<DialogHarness />);
    const trigger = screen.getByRole('button', { name: 'Open editor' });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Editor' });
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    expect(document.activeElement).toBe(first);

    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Editor' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});
