import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axeViolations } from '../../../tests/axe';
import { db } from '../../db/database';
import { defaultPreferences } from '../../db/repository';
import { getReaderProgress, saveReaderProgress, saveStepAnswer } from '../../db/stepWork';
import { titleForPath } from '../../app/routeTitles';
import todayPageSource from '../today/TodayPage.tsx?raw';
import todayNudgeSource from '../today/TodayNudge.tsx?raw';
import todayQuickStartSource from '../../components/TodayQuickStart.tsx?raw';

const mocks = vi.hoisted(() => ({ context: {} as never }));
vi.mock('../../app/AppContext', () => ({ useAppContext: () => mocks.context }));

import { NaStepGuidesPage } from './NaStepGuidesPage';
import { NaStepGuidesCard } from './NaStepGuidesCard';

function renderReader(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <main id="main-content">
        <Routes>
          <Route path="/library/na-step-guides" element={<NaStepGuidesPage />} />
          <Route path="/library/na-step-guides/:chapterId" element={<NaStepGuidesPage />} />
          <Route path="/library" element={<NaStepGuidesCard />} />
        </Routes>
      </main>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await db.delete();
  await db.open();
  mocks.context = { preferences: { ...defaultPreferences(), onboardingComplete: true }, notify: vi.fn() } as never;
});

afterEach(async () => {
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 20));
  db.close();
});

describe('NA Step Working Guides reader', () => {
  it('title screen shows the required credit, a table of contents and passes axe', async () => {
    const { container } = renderReader('/library/na-step-guides');
    expect(screen.getByRole('heading', { level: 1, name: 'NA Step Working Guides' })).toBeInTheDocument();
    expect(screen.getByText('Copyright © 1998, World Service Office, Inc. Reprinted by permission. All rights reserved.')).toBeInTheDocument();
    expect(screen.getByText('This is NA Fellowship-approved literature.')).toBeInTheDocument();
    expect(screen.getByText(/not affiliated with, and is not endorsed by, Narcotics Anonymous/)).toBeInTheDocument();
    const toc = screen.getByRole('navigation', { name: 'Table of contents' });
    const links = within(toc).getAllByRole('link');
    expect(links).toHaveLength(13);
    expect(links[0]).toHaveAccessibleName('Preface');
    expect(links[4]).toHaveAttribute('href', '/library/na-step-guides/step-4');
    expect(within(toc).getByText(/0 of 82 questions answered/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Reading text size' })).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('a step reads with landmarks, headings and labelled answer boxes, and passes axe', async () => {
    const { container } = renderReader('/library/na-step-guides/step-1');
    expect(screen.getByRole('heading', { level: 1, name: 'Step One' })).toBeInTheDocument();
    expect(screen.getByText('“We admitted we were powerless over our addiction, that our lives had become unmanageable.”')).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Step One' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Sections in Step One' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Denial' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Powerlessness' })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(68);
    expect(screen.getByRole('textbox', { name: 'What does "the disease of addiction" mean to me?' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Previous and next chapter' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Step Two/ })).toHaveAttribute('href', '/library/na-step-guides/step-2');
    expect(await axeViolations(container)).toEqual([]);
  });

  it('the preface renders with its italic book titles and passes axe', async () => {
    const { container } = renderReader('/library/na-step-guides/preface');
    expect(screen.getByRole('heading', { level: 1, name: 'Preface' })).toBeInTheDocument();
    expect(screen.getByText('It Works: How and Why.').tagName).toBe('EM');
    expect(screen.getByText('WSC Literature Committee')).toBeInTheDocument();
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(await axeViolations(container)).toEqual([]);
  });

  it('saves a typed answer only to IndexedDB and updates the step progress', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderReader('/library/na-step-guides/step-2');
    const box = screen.getByRole('textbox', { name: 'What do I have hope about today?' });
    await user.click(box);
    await user.type(box, 'Losing my job.');
    await user.tab();
    await waitFor(async () => expect(await db.stepWorkAnswers.get('s2-q001')).toMatchObject({ stepNumber: 2, text: 'Losing my job.' }));
    expect(await screen.findByText(/1 of 47 questions answered/)).toBeInTheDocument();
    expect(await screen.findByText('Answer to question 1 saved on this device.')).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(JSON.stringify({ ...window.localStorage })).not.toContain('Losing my job.');
    fetchSpy.mockRestore();
  });

  it('shows saved answers when the step is reopened, and keyboard users can clear one', async () => {
    await saveStepAnswer('s3-q001', 3, 'Already written.');
    renderReader('/library/na-step-guides/step-3');
    const box = await screen.findByDisplayValue('Already written.');
    fireEvent.focus(box);
    fireEvent.change(box, { target: { value: '' } });
    fireEvent.blur(box);
    await waitFor(async () => expect(await db.stepWorkAnswers.get('s3-q001')).toBeUndefined());
  });

  it('remembers where you left off and offers to continue there', async () => {
    const first = renderReader('/library/na-step-guides/step-4#step-4-fear');
    expect(screen.getByRole('heading', { level: 1, name: 'Step Four' })).toBeInTheDocument();
    await waitFor(async () => expect(await getReaderProgress()).toMatchObject({ chapterId: 'step-4', sectionId: 'step-4-fear' }));
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Fear' })).toHaveFocus());
    first.unmount();

    renderReader('/library/na-step-guides');
    const resume = await screen.findByRole('link', { name: 'Continue: Step Four · Fear' });
    expect(resume).toHaveAttribute('href', '/library/na-step-guides/step-4#step-4-fear');
    expect(screen.getByText('Last read')).toBeInTheDocument();
  });

  it('jumps to a section without smooth scrolling when reduced motion is on', async () => {
    mocks.context = { preferences: { ...defaultPreferences(), reducedMotion: true }, notify: vi.fn() } as never;
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    renderReader('/library/na-step-guides/step-9#step-9-forgiveness');
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ behavior: 'instant', block: 'start' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Forgiveness' })).toHaveFocus();
  });

  it('changes the reading text size and keeps it', async () => {
    const user = userEvent.setup();
    const { container } = renderReader('/library/na-step-guides');
    const larger = screen.getByRole('radio', { name: 'Larger' });
    await user.click(larger);
    await waitFor(async () => expect((await getReaderProgress())?.textSize).toBe('larger'));
    await waitFor(() => expect(container.querySelector('.na-reader')).toHaveAttribute('data-text-size', 'larger'));
    fireEvent.click(screen.getByRole('radio', { name: 'Large' }));
    await waitFor(async () => expect((await getReaderProgress())?.textSize).toBe('large'));
  });

  it('sends unknown chapters back to the contents', () => {
    renderReader('/library/na-step-guides/step-13');
    expect(screen.getByRole('heading', { level: 1, name: 'NA Step Working Guides' })).toBeInTheDocument();
  });

  it('names chapter routes for the document title and announcements', () => {
    expect(titleForPath('/library/na-step-guides')).toBe('NA Step Working Guides');
    expect(titleForPath('/library/na-step-guides/step-7')).toBe('Step Seven · NA Step Working Guides');
    expect(titleForPath('/library/na-step-guides/preface')).toBe('Preface · NA Step Working Guides');
  });

  it('the Library card links to the reader and resumes the last chapter', async () => {
    await saveReaderProgress({ chapterId: 'step-6' });
    await saveStepAnswer('s6-q001', 6, 'x');
    const { container } = renderReader('/library');
    expect(await screen.findByRole('link', { name: 'Continue: Step Six' })).toHaveAttribute('href', '/library/na-step-guides/step-6');
    expect(await screen.findByText('1 answer saved on this device.')).toBeInTheDocument();
    expect(await axeViolations(container)).toEqual([]);
  });

  it('the Library card hides the answer count in discreet display', async () => {
    mocks.context = { preferences: { ...defaultPreferences(), discreetMode: true }, notify: vi.fn() } as never;
    await saveStepAnswer('s6-q001', 6, 'x');
    renderReader('/library');
    expect(await screen.findByRole('link', { name: 'Open the guides' })).toBeInTheDocument();
    expect(screen.queryByText(/saved on this device/)).not.toBeInTheDocument();
  });

  it('is never part of Today: no card rotation entry and no nudge', () => {
    for (const source of [todayPageSource, todayNudgeSource, todayQuickStartSource]) {
      expect(source).not.toMatch(/na-step-guides|NaStepGuides|Step Working Guide/);
    }
  });
});
