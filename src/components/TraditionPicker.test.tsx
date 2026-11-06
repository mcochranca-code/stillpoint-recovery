import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../tests/axe';
import { defaultPreferences } from '../db/repository';
import type { TraditionPreference } from '../domain/types';
import { TraditionPicker } from './TraditionPicker';

const mocks = vi.hoisted(() => ({ context: {} as never }));
vi.mock('../app/AppContext', () => ({ useAppContext: () => mocks.context }));
import { DailyReadingCard } from '../features/today/DailyReadingCard';

function Harness({ initial, onChange }: { initial: TraditionPreference; onChange?: (value: TraditionPreference) => void }) {
  const [value, setValue] = useState(initial);
  return <TraditionPicker value={value} onChange={(next) => { setValue(next); onChange?.(next); }} />;
}

describe('TraditionPicker', () => {
  it('is a labelled group of native radios with no detectable axe violations', async () => {
    const { container } = render(<Harness initial={{ mode: 'one', traditions: ['christian'] }} />);
    expect(screen.getByRole('group', { name: 'Daily reading tradition' })).toBeInTheDocument();
    const traditions = screen.getAllByRole('radio').filter((radio) => radio.getAttribute('name')?.endsWith('-tradition'));
    expect(traditions).toHaveLength(7);
    expect(screen.getByRole('radio', { name: /^Christian/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Buddhist/ })).toHaveAccessibleDescription(/Dhammapada/);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('selects one tradition with a radio, then several with checkboxes, keeping at least one', async () => {
    const changes: TraditionPreference[] = [];
    const { container } = render(<Harness initial={{ mode: 'one', traditions: ['christian'] }} onChange={(value) => changes.push(value)} />);
    fireEvent.click(screen.getByRole('radio', { name: /^Muslim/ }));
    expect(changes.at(-1)).toEqual({ mode: 'one', traditions: ['muslim'] });

    fireEvent.click(screen.getByRole('radio', { name: /A few I choose/ }));
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    fireEvent.click(screen.getByRole('checkbox', { name: /^Jain/ }));
    expect(changes.at(-1)).toEqual({ mode: 'several', traditions: ['muslim', 'jain'] });
    fireEvent.click(screen.getByRole('checkbox', { name: /^Jain/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /^Muslim/ }));
    expect(screen.getByRole('checkbox', { name: /^Muslim/ })).toBeChecked();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('offers a rotate-through-all mode that names every tradition', async () => {
    const { container } = render(<Harness initial={{ mode: 'one', traditions: ['christian'] }} />);
    fireEvent.click(screen.getByRole('radio', { name: /Rotate through all/ }));
    expect(screen.getByText(/Every tradition takes a turn/)).toHaveTextContent('Red Road · Native wellbriety');
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe('DailyReadingCard', () => {
  beforeEach(() => {
    mocks.context = { preferences: defaultPreferences(), notify: vi.fn(), updatePreferences: vi.fn() } as never;
  });

  it('shows the text, citation, translation credit, prompt and why-this-reading line', async () => {
    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), traditionPreference: { mode: 'one', traditions: ['muslim'] } } } as never;
    const { container } = render(<MemoryRouter><DailyReadingCard date={new Date(2026, 10, 6)} daysInRecovery={3} /></MemoryRouter>);
    const card = screen.getByRole('region', { name: 'A READING FOR THE JOURNEY' });
    expect(within(card).getByText(/Pickthall|Original paraphrase by Stillpoint/)).toBeInTheDocument();
    expect(within(card).getByText('Why this reading')).toBeInTheDocument();
    expect(within(card).getByText(/Muslim readings you chose/)).toBeInTheDocument();
    expect(within(card).getByText('TO CARRY WITH YOU')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Change tradition/ })).toHaveAttribute('href', '/settings#daily-readings');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('shows the Red Road note and the inspired-by label where they apply', () => {
    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), traditionPreference: { mode: 'one', traditions: ['red-road'] } } } as never;
    const { unmount } = render(<MemoryRouter><DailyReadingCard date={new Date(2026, 10, 6)} daysInRecovery={0} /></MemoryRouter>);
    expect(screen.getByRole('note')).toHaveTextContent(/Teachings differ from nation to nation.*White Bison and the Wellbriety Movement/);
    unmount();

    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), traditionPreference: { mode: 'one', traditions: ['buddhist'] } } } as never;
    // Walk forward until an "inspired by" entry comes up; the Buddhist set has seven.
    for (let offset = 0; offset < 17; offset += 1) {
      const view = render(<MemoryRouter><DailyReadingCard date={new Date(2026, 10, 6 + offset)} daysInRecovery={0} /></MemoryRouter>);
      const inspired = screen.queryByText(/Inspired by the teachings of/);
      if (inspired) {
        expect(inspired).toHaveTextContent(/These are not their words/);
        expect(screen.getByText(/Further reading:/)).toBeInTheDocument();
        return;
      }
      view.unmount();
    }
    throw new Error('No inspired-by reading was shown within the Buddhist rotation.');
  });
});
