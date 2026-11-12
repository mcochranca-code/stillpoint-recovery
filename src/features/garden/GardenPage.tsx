import { Download, ExternalLink, Flower2 } from 'lucide-react';

const artworks = [
  {
    id: 'sunlight-after-rain',
    title: 'Sunlight After Rain',
    image: '/assets/garden/sunlight-after-rain.jpg',
    alt: 'An original post-impressionist painting of sunflowers along a path at golden dawn after rain.',
    downloadName: 'stillpoint-sunlight-after-rain.jpg',
    inspiration: 'Vincent van Gogh’s Sunflowers, 1888–1889',
    historicalContext: 'The Van Gogh Museum says the Sunflowers paintings were made in Arles in 1888 and 1889, and that Vincent wrote they communicated “gratitude.”',
    stillpointMeaning: 'This new image was made to hold gratitude gently. It does not ask anyone to feel cheerful; it offers a place to notice a little light after a hard stretch.',
    sourceUrl: 'https://www.vangoghmuseum.nl/en/collection/s0031v1962',
    sourceLabel: 'Van Gogh Museum · Sunflowers',
  },
  {
    id: 'first-blossom',
    title: 'First Blossom',
    image: '/assets/garden/first-blossom.jpg',
    alt: 'An original post-impressionist painting of pale spring blossoms reaching into a broad blue morning sky.',
    downloadName: 'stillpoint-first-blossom.jpg',
    inspiration: 'Vincent van Gogh’s Almond Blossom, 1890',
    historicalContext: 'The Van Gogh Museum describes almond blossom as an early-spring symbol of new life. Van Gogh gave the painting to his brother Theo and sister-in-law Jo after their son was born.',
    stillpointMeaning: 'This image is an invitation to be patient with beginnings. Hope can appear quietly, before everything has changed or come into bloom.',
    sourceUrl: 'https://www.vangoghmuseum.nl/en/collection/s0176v1962',
    sourceLabel: 'Van Gogh Museum · Almond Blossom',
  },
  {
    id: 'room-to-rest',
    title: 'Room to Rest',
    image: '/assets/garden/room-to-rest.jpg',
    alt: 'An original post-impressionist painting of a quiet room with a lamp, a chair, a blanket, and an open garden window.',
    downloadName: 'stillpoint-room-to-rest.jpg',
    inspiration: 'Vincent van Gogh’s The Bedroom, 1888',
    historicalContext: 'The Van Gogh Museum says Van Gogh intended the bright colors in The Bedroom to express repose or sleep, and that he deliberately flattened the room’s perspective.',
    stillpointMeaning: 'This new image is a reminder that rest is care, not a prize earned by productivity. A pause can be worthwhile without proving anything.',
    sourceUrl: 'https://www.vangoghmuseum.nl/en/collection/s0047v1962',
    sourceLabel: 'Van Gogh Museum · The Bedroom',
  },
] as const;

/** A free art garden: no points, streaks, unlocks, or recovery data are needed. */
export function GardenPage() {
  return (
    <div className="page-stack garden-gallery-page">
      <header className="page-header garden-gallery-header">
        <div>
          <p className="eyebrow">A gift for simply being here</p>
          <h1>The Living Garden.</h1>
          <p>We the people are the flowers in this garden; our stories are the aroma. Take a piece of art with you, with no milestone to reach and no feeling you have to prove.</p>
        </div>
        <span className="pill"><Flower2 size={14} aria-hidden="true" /> Art, not a score</span>
      </header>

      <section className="card garden-gallery-intro" aria-label="About the Living Garden">
        <h2>A place to pause, look, and keep what speaks to you.</h2>
        <p>Every artwork here is free to download. There are no points, streaks, activity requirements, or locked rewards. The starter collection contains original AI-generated Stillpoint artworks inspired by three Van Gogh paintings; they are not Van Gogh originals and are not member-submitted pieces.</p>
        <p>Members’ artwork and stories are not collected or uploaded by this gallery. Your own recovery story remains yours.</p>
      </section>

      <section className="garden-artwork-list" aria-label="Downloadable Living Garden artwork">
        {artworks.map((artwork) => (
          <article className="card garden-artwork-card" key={artwork.id} aria-labelledby={`${artwork.id}-title`}>
            <figure className="garden-artwork-figure">
              <img src={artwork.image} alt={artwork.alt} loading="lazy" decoding="async" />
              <figcaption>Original AI-generated artwork for Stillpoint · not a Van Gogh original</figcaption>
            </figure>
            <div className="garden-artwork-copy">
              <p className="eyebrow">A freely downloadable art gift</p>
              <h2 id={`${artwork.id}-title`}>{artwork.title}</h2>
              <p className="garden-artwork-inspiration">Inspired by {artwork.inspiration}. This is a new image, not a reproduction.</p>
              <section className="garden-beholder" aria-labelledby={`${artwork.id}-beholder-title`}>
                <h3 id={`${artwork.id}-beholder-title`}>From the Eye of the Beholder</h3>
                <h4>Historical context</h4>
                <p>{artwork.historicalContext}</p>
                <h4>A Stillpoint interpretation</h4>
                <p>{artwork.stillpointMeaning}</p>
                <a href={artwork.sourceUrl} target="_blank" rel="noopener noreferrer">
                  Read the source work’s museum notes: {artwork.sourceLabel} <ExternalLink size={14} aria-hidden="true" />
                </a>
              </section>
              <a className="button button-primary garden-download" href={artwork.image} download={artwork.downloadName} aria-label={`Download the artwork ${artwork.title}`}>
                <Download size={16} aria-hidden="true" /> Download this art gift
              </a>
              <p className="fine-print">Free for anyone using the app. No streak, milestone, account, or activity threshold.</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
