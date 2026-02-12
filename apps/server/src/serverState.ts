/**
 * Server operational state singleton.
 *
 * Tracks whether the server is starting up, in maintenance mode
 * (DB/Redis unavailable), or fully ready.
 */

export type ServerMode = 'starting' | 'maintenance' | 'ready';

type ModeChangeListener = (newMode: ServerMode, prevMode: ServerMode) => void;

let _mode: ServerMode = 'starting';
let _servicesInitialized = false;
const _listeners: ModeChangeListener[] = [];

export function getServerMode(): ServerMode {
  return _mode;
}

export function setServerMode(mode: ServerMode): void {
  const prev = _mode;
  _mode = mode;
  if (prev !== mode) {
    for (const listener of _listeners) {
      listener(mode, prev);
    }
  }
}

/** Register a callback that fires whenever the server mode changes. */
export function onModeChange(listener: ModeChangeListener): void {
  _listeners.push(listener);
}

export function isReady(): boolean {
  return _mode === 'ready';
}

export function isMaintenance(): boolean {
  return _mode === 'maintenance';
}

export function isServicesInitialized(): boolean {
  return _servicesInitialized;
}

export function setServicesInitialized(v: boolean): void {
  _servicesInitialized = v;
}
