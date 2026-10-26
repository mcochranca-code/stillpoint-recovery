import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OdbResourcesCard } from './OdbResourcesCard';

describe('OdbResourcesCard', () => {
  it('links directly to official publisher pages and explains the source and privacy boundary', () => {
    const { container } = render(<OdbResourcesCard />);
    const readingPlans = screen.getByRole('link', { name: 'Official Our Daily Bread Reading Plans (opens in a new tab)' });
    const discover = screen.getByRole('link', { name: 'Official Our Daily Bread Discover the Word podcast page (opens in a new tab)' });

    expect(readingPlans.getAttribute('href')).toBe('https://odb.org/page/reading-plans');
    expect(discover.getAttribute('href')).toBe('https://odb.org/podcasts/');
    for (const link of [readingPlans, discover]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.getAttribute('referrerpolicy')).toBe('no-referrer');
    }
    expect(container.querySelector('iframe')).toBeNull();
    const sourceNote = container.querySelector('.odb-source-note')?.textContent ?? '';
    expect(sourceNote).toContain('Sources checked October 22, 2026');
    expect(sourceNote).toContain('journal text');
    expect(sourceNote).toContain('standard connection details');
    const prompt = container.querySelector('.odb-resource-prompt')?.textContent ?? '';
    expect(prompt).toContain('An original Stillpoint prompt:');
    expect(prompt).toContain('one small, kind step');
  });
});
