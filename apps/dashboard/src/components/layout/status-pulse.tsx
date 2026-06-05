type PulseStatus = 'connected' | 'pending' | 'failed' | 'read' | 'reconnecting';

const STATUS_MAP: Record<PulseStatus, string> = {
  connected: 'status-dot--connected',
  pending: 'status-dot--pending',
  failed: 'status-dot--failed',
  read: 'status-dot--read',
  reconnecting: 'status-dot--pending',
};

export function StatusPulse({ status, className = '' }: { status: PulseStatus; className?: string }) {
  return (
    <span className={`status-dot ${STATUS_MAP[status]} ${className}`} />
  );
}