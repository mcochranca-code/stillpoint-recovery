import { useEffect, useState } from 'react';

type CharmMedallionProps = {
  name: string;
  image: string;
  size?: 'gallery' | 'garden';
  locked?: boolean;
};

export function CharmMedallion({ name, image, size = 'gallery', locked = false }: CharmMedallionProps) {
  const [spinning, setSpinning] = useState(false);

  useEffect(() => {
    if (!spinning) return undefined;
    const timeout = window.setTimeout(() => setSpinning(false), 1000);
    return () => window.clearTimeout(timeout);
  }, [spinning]);

  return (
    <button
      type="button"
      className={`charm-medallion charm-medallion--${size}${locked ? ' locked' : ''}${spinning ? ' is-spinning' : ''}`}
      aria-label={`Spin ${name} charm`}
      title="Tap to spin"
      disabled={spinning}
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
