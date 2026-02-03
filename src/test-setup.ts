// Jest setup file - configures MobX as reactivity provider for all tests

import * as mobx from 'mobx';
import { setReactivityProvider, createMobxProvider } from './core/reactivity/index.js';

// Configure MobX for tests
mobx.configure({
  enforceActions: 'never', // Allow state modifications outside actions in tests
});

// Set MobX as the reactivity provider
setReactivityProvider(createMobxProvider(mobx));
