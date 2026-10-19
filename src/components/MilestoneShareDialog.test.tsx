import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MilestoneShareDialog } from './MilestoneShareDialog';

describe('MilestoneShareDialog', () => {
  it('omits milestone name and date until the user selects them', () => {
    const { container } = render(<MilestoneShareDialog milestone={{ id: 'milestone-90', label: '90 days of recovery', dateLabel: 'October 19, 2026' }} onClose={() => undefined} />);
    const previewText = () => container.querySelector('.share-preview > p:last-child')?.textContent;

    expect(previewText()).toBe('A milestone I am glad to have reached.');
    expect(screen.queryByText('Milestone: 90 days of recovery')).toBeNull();
    expect(screen.queryByText('Date: October 19, 2026')).toBeNull();

    fireEvent.click(screen.getByLabelText(/include milestone name/i));
    fireEvent.click(screen.getByLabelText(/include reached date/i));

    expect(previewText()).toContain('Milestone: 90 days of recovery');
    expect(previewText()).toContain('Date: October 19, 2026');
  });

  it('does not send or download anything when the preview is canceled', () => {
    const onClose = vi.fn();
    render(<MilestoneShareDialog milestone={{ id: 'milestone-30', label: 'Thirty days', dateLabel: 'October 1, 2026' }} onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
