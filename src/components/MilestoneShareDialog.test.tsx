import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MilestoneShareDialog } from './MilestoneShareDialog';

function replaceValue(target: object, key: string, value: unknown): () => void {
  const previous = Object.getOwnPropertyDescriptor(target, key);
  Object.defineProperty(target, key, { configurable: true, writable: true, value });
  return () => {
    if (previous) Object.defineProperty(target, key, previous);
    else Reflect.deleteProperty(target, key);
  };
}

describe('MilestoneShareDialog', () => {
  it('omits milestone name and date from both previews until the user selects them', () => {
    const { container } = render(<MilestoneShareDialog milestone={{ id: 'milestone-90', label: '90 days of recovery', dateLabel: 'October 19, 2026' }} onClose={() => undefined} />);
    const textPreview = () => container.querySelector('.share-preview > p:last-child')?.textContent ?? '';
    const cardPreview = () => container.querySelector('.virtual-card-preview')?.textContent ?? '';

    expect(textPreview()).toBe('A milestone I am glad to have reached.');
    expect(cardPreview()).toContain('A moment worth keeping');
    expect(cardPreview()).not.toContain('90 days of recovery');
    expect(cardPreview()).not.toContain('October 19, 2026');

    fireEvent.click(screen.getByLabelText(/include milestone name/i));
    fireEvent.click(screen.getByLabelText(/include reached date/i));

    expect(textPreview()).toContain('Milestone: 90 days of recovery');
    expect(textPreview()).toContain('Date: October 19, 2026');
    expect(cardPreview()).toContain('90 days of recovery');
    expect(cardPreview()).toContain('October 19, 2026');
  });

  it('does not send or download anything when the preview is canceled', () => {
    const onClose = vi.fn();
    render(<MilestoneShareDialog milestone={{ id: 'milestone-30', label: 'Thirty days', dateLabel: 'October 1, 2026' }} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('downloads the HTML card locally when the browser cannot share files', async () => {
    const restoreShare = replaceValue(navigator, 'share', undefined);
    const restoreCanShare = replaceValue(navigator, 'canShare', undefined);
    const createObjectUrl = vi.fn().mockReturnValue('blob:stillpoint-card');
    const restoreCreate = replaceValue(URL, 'createObjectURL', createObjectUrl);
    const restoreRevoke = replaceValue(URL, 'revokeObjectURL', vi.fn());
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    try {
      render(<MilestoneShareDialog milestone={{ id: 'milestone-30', label: 'Thirty days', dateLabel: 'October 1, 2026' }} onClose={() => undefined} />);
      fireEvent.click(screen.getByRole('button', { name: 'Share HTML card' }));
      await waitFor(() => expect(screen.getByRole('status').textContent?.toLowerCase().includes('downloaded locally')).toBe(true));
      expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
      expect(click).toHaveBeenCalledOnce();
    } finally {
      click.mockRestore();
      restoreRevoke();
      restoreCreate();
      restoreCanShare();
      restoreShare();
    }
  });
});
