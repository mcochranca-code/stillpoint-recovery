import { useEffect, useState } from 'react';

type CharmMedallionProps = {
  name: string;
  image: string;
  size?: 'gallery' | 'garden' | 'hero' | 'strip';
  locked?: boolean;
  /**
   * Render a still, non-interactive medallion (no spin button) for previews such as the Today hero.
   * With `label` it is announced as one image; without it, it is hidden from assistive technology.
   */
  still?: boolean;
  label?: string;
};

export function CharmMedallion({ name, image, size = 'gallery', locked = false, still = false, label }: CharmMedallionProps) {
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!spinning) return undefined;
    const timeout = window.setTimeout(() => setSpinning(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [spinning]);

  if (still) {
    const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true as const };
    return (
      <span className={`charm-medallion charm-medallion--${size} is-still${locked ? ' locked' : ''}`} {...a11y}>
        <span className="charm-medallion__coin">
          <span className="charm-medallion__face charm-medallion__front" aria-hidden="true">
            <img src={image} alt="" loading="lazy" draggable={false} />
          </span>
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`charm-medallion charm-medallion--${size}${locked ? ' locked' : ''}${spinning ? ' is-spinning' : ''}`}
      aria-label={`Spin ${name} charm`}
      aria-pressed={spinning}
      aria-busy={spinning}
      title="Tap to spin"
      onClick={() => setSpinning(true)}
    >
      <span className="charm-medallion__coin" onAnimationEnd={() => setSpinning(false)}>
        <span className="charm-medallion__face charm-medallion__front" aria-hidden="true">
          <img src={image} alt="" loading="lazy" draggable={false} />
        </span>
        <span className="charm-medallion__face charm-medallion__back" aria-hidden="true">
          <span className="charm-medallion__star">✦</span>
          <span className="charm-medallion__mark">STILLPOINT</span>
        </span>
      </span>
    </button>
  );
}
