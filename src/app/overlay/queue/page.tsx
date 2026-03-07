/**
 * /overlay/queue — OBS Browser Source
 * Width: 420px | Height: 580px | Allow transparency: ON
 * Custom CSS in OBS: body { background: transparent !important; overflow: hidden; }
 */
import { QueueOverlayRealtime } from "./QueueOverlayRealtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function QueueOverlayPage() {
  return (
    <div className="w-full min-h-screen bg-transparent p-3 font-sans">
      <QueueOverlayRealtime />
    </div>
  );
}
