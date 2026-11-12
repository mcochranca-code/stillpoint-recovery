import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { GardenPage } from './GardenPage';

describe('Living Garden art gallery', () => {
  it('offers three original, free-to-download artworks with source context and a separate Stillpoint interpretation', () => {
    render(<GardenPage />);

    expect(screen.getByRole('heading', { name: 'The Living Garden.' })).toBeInTheDocument();
    expect(screen.getByText(/We the people are the flowers in this garden; our stories are the aroma/)).toBeInTheDocument();
    expect(screen.getByText(/no points, streaks, activity requirements, or locked rewards/i)).toBeInTheDocument();

    const cards = screen.getAllByRole('article');
    expect(cards).toHaveLength(3);
    const names = ['Sunlight After Rain', 'First Blossom', 'Room to Rest'];
    const filenames = ['stillpoint-sunlight-after-rain.jpg', 'stillpoint-first-blossom.jpg', 'stillpoint-room-to-rest.jpg'];
    for (const [index, card] of cards.entries()) {
      const item = within(card);
      expect(item.getByRole('heading', { name: names[index] })).toBeInTheDocument();
      expect(item.getByRole('heading', { name: 'From the Eye of the Beholder' })).toBeInTheDocument();
      expect(item.getByText('A Stillpoint interpretation')).toBeInTheDocument();
      expect(item.getByRole('link', { name: `Download the artwork ${names[index]}` })).toHaveAttribute('download', filenames[index]);
      expect(item.getByRole('link', { name: /Read the source work’s museum notes/ })).toHaveAttribute('target', '_blank');
    }
  });

  it('clearly separates generated homage art from Van Gogh originals and member-submitted work', () => {
    render(<GardenPage />);
    expect(screen.getAllByText(/not a Van Gogh original/i)).toHaveLength(3);
    expect(screen.getByText(/not member-submitted pieces/i)).toBeInTheDocument();
    expect(screen.queryByText(/unlock|streak counter|garden level/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });
});
