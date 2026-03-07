/**
 * Overlay layout — transparent body for OBS Browser Source.
 * No sidebar, no admin chrome. Pure overlay.
 */
export default function OverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="overlay-root">
      {children}
    </div>
  );
}
