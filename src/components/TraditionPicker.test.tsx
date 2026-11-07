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

function Harness({ initial, onChange }: { initial: TraditionPreference | null; onChange?: (value: TraditionPreference) => void }) {
  const [value, setValue] = useState<TraditionPreference | null>(initial);
  return <TraditionPicker value={value} onChange={(next) => { setValue(next); onChange?.(next); }} />;
}

describe('TraditionPicker', () => {
  it('pre-selects nothing before a first choice, and passes axe in that state', async () => {
    const { container } = render(<Harness initial={null} />);
    const radios = screen.getAllByRole('radio');
    expect(radios.filter((radio) => (radio as HTMLInputElement).checked)).toHaveLength(0);
    expect(screen.getByRole('radio', { name: /^Christian/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Spiritual but not religious/ })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('from nothing chosen: a tradition card chooses One tradition; A few I choose waits for the first pick', async () => {
    const changes: TraditionPreference[] = [];
    const first = render(<Harness initial={null} onChange={(value) => changes.push(value)} />);
    fireEvent.click(screen.getByRole('radio', { name: /^Hindu/ }));
    expect(changes.at(-1)).toEqual({ mode: 'one', traditions: ['hindu'] });
    expect(screen.getByRole('radio', { name: /One tradition/ })).toBeChecked();
    first.unmount();

    changes.length = 0;
    const { container } = render(<Harness initial={null} onChange={(value) => changes.push(value)} />);
    fireEvent.click(screen.getByRole('radio', { name: /A few I choose/ }));
    expect(changes).toHaveLength(0);
    expect(screen.getByRole('radio', { name: /A few I choose/ })).toBeChecked();
    expect(screen.getAllByRole('checkbox').filter((box) => (box as HTMLInputElement).checked)).toHaveLength(0);
    fireEvent.click(screen.getByRole('checkbox', { name: /^Jain/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /^Buddhist/ }));
    expect(changes.at(-1)).toEqual({ mode: 'several', traditions: ['jain', 'buddhist'] });
    expect(await axeViolations(container)).toEqual([]);
  });

  it('leaving Rotate through all does not quietly pick a tradition', () => {
    const changes: TraditionPreference[] = [];
    render(<Harness initial={{ mode: 'rotate', traditions: ['christian', 'buddhist', 'hindu', 'muslim', 'jain', 'red-road', 'reflective'] }} onChange={(value) => changes.push(value)} />);
    fireEvent.click(screen.getByRole('radio', { name: /One tradition/ }));
    expect(changes).toHaveLength(0);
    expect(screen.getAllByRole('radio').filter((radio) => radio.getAttribute('name')?.endsWith('-tradition') && (radio as HTMLInputElement).checked)).toHaveLength(0);
    fireEvent.click(screen.getByRole('radio', { name: /^Muslim/ }));
    expect(changes.at(-1)).toEqual({ mode: 'one', traditions: ['muslim'] });
  });

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
    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['muslim'] } } } as never;
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
    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['red-road'] } } } as never;
    const { unmount } = render(<MemoryRouter><DailyReadingCard date={new Date(2026, 10, 6)} daysInRecovery={0} /></MemoryRouter>);
    expect(screen.getByRole('note')).toHaveTextContent(/Teachings differ from nation to nation.*White Bison and the Wellbriety Movement/);
    unmount();

    mocks.context = { ...(mocks.context as object), preferences: { ...defaultPreferences(), traditionChoicePending: false, traditionPreference: { mode: 'one', traditions: ['buddhist'] } } } as never;
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

  it('shows a neutral reading, not Christian, until a tradition is chosen', async () => {
    mocks.context = { ...(mocks.context as object), preferences: defaultPreferences() } as never;
    const { container } = render(<MemoryRouter><DailyReadingCard date={new Date(2026, 10, 6)} daysInRecovery={0} /></MemoryRouter>);
    const card = screen.getByRole('region', { name: 'A READING FOR THE JOURNEY' });
    expect(within(card).getByText(/^Spiritual but not religious ·/)).toBeInTheDocument();
    expect(within(card).getByText(/haven’t chosen a tradition yet/)).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: /Choose a tradition/ })).toHaveAttribute('href', '/settings#daily-readings');
    expect(await axeViolations(container)).toEqual([]);
  });
});
