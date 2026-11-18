// jest-dom's matchers for the engine's UI tests (expect(element).toHaveTextContent(...))
import "@testing-library/jest-dom";
import { setImmediate } from "node:timers";

// Without this a file of synchronous tests never gives the event loop a turn, and after a minute
// vitest gives up on the worker: `Timeout calling "onTaskUpdate"`
afterEach(() => new Promise((resolve) => setImmediate(resolve)));
