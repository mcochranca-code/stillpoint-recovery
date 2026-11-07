import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(cleanup);

// jsdom does not implement scrolling; route-change scroll resets are a no-op in tests.
window.scrollTo = (() => {}) as typeof window.scrollTo;
