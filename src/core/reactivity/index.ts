// Public API - MobX-compatible functions
export {
  makeObservable,
  makeAutoObservable,
  observable,
  runInAction,
  reaction,
} from './api.js';

// Provider management
export {
  setReactivityProvider,
  resetReactivityProvider,
  type ReactivityProvider,
} from './provider.js';

// MobX integration helper
export { createMobxProvider } from './mobx-provider.js';
