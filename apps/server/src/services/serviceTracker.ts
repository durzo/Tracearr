/**
 * Service Tracker - Lightweight registry for interval-based background services
 *
 * Each service registers on start and unregisters on stop, allowing the
 * /debug/tasks endpoint to report live status of all background tasks.
 */

export interface TrackedService {
  name: string;
  description: string;
  intervalMs: number;
  running: boolean;
}

const services = new Map<string, TrackedService>();

export function registerService(id: string, info: Omit<TrackedService, 'running'>): void {
  services.set(id, { ...info, running: true });
}

export function unregisterService(id: string): void {
  const service = services.get(id);
  if (service) {
    service.running = false;
  }
}

export function getAllServices(): TrackedService[] {
  return Array.from(services.values());
}
