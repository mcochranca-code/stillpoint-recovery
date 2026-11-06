/**
 * Calm branded splash shown while the local database opens. The halo breathes
 * slowly; under reduced motion it is still. The message is announced politely
 * once, without interrupting anything a screen reader is already saying.
 */
export function LoadingScreen({ message = 'Making a little room for today…' }: { message?: string }) {
  return (
    <main className="loading-screen" aria-busy="true">
      <div className="splash-mark" aria-hidden="true">
        <span className="splash-halo splash-halo--outer" />
        <span className="splash-halo" />
        <img src="/assets/branding/stillpoint-logo.svg" alt="" />
      </div>
      <h1 className="splash-title">Stillpoint Recovery</h1>
      <p className="splash-message" role="status" aria-live="polite">{message}</p>
      <span className="splash-horizon" aria-hidden="true" />
    </main>
  );
}
