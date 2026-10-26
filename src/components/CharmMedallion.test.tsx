import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CharmMedallion } from './CharmMedallion';

afterEach(() => vi.useRealTimers());

describe('CharmMedallion', () => {
  it('keeps the spin control enabled and focused during the animation fallback', () => {
    vi.useFakeTimers();
    render(<CharmMedallion name="First Light" image="/assets/charms/first-light.svg" />);
    const button = screen.getByRole('button', { name: 'Spin First Light charm' }) as HTMLButtonElement;

    expect(button.getAttribute('title')).toBe('Tap to spin');
    expect(button.disabled).toBe(false);

    button.focus();
    fireEvent.click(button);
    expect(button.classList.contains('is-spinning')).toBe(true);
    expect(button.disabled).toBe(false);
    expect(document.activeElement).toBe(button);

    act(() => { vi.advanceTimersByTime(1000); });
    expect(button.classList.contains('is-spinning')).toBe(false);
    expect(button.disabled).toBe(false);
  });

  it('keeps locked charms spin-accessible as previews', () => {
    render(<CharmMedallion name="Year of Growth" image="/assets/charms/year-of-growth.svg" locked />);
    const button = screen.getByRole('button', { name: 'Spin Year of Growth charm' });

    expect(button.classList.contains('locked')).toBe(true);
    fireEvent.click(button);
    expect(button.classList.contains('is-spinning')).toBe(true);
  });
});
