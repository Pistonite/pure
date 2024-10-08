# pure
![JSR Version](https://img.shields.io/jsr/v/@pistonite/pure)

Pure TypeScript utility library for browsers

## Documentation
- [`fs`](https://jsr.io/@pistonite/pure/doc/fs/~): Browser File System Integration
- [`result`](https://jsr.io/@pistonite/pure/doc/result/~): 0 runtime error handling without exceptions
- `log`: Logging library with log export ability
- [`sync`](https://jsr.io/@pistonite/pure/doc/sync/~): Synchronization utilities
  - [`SerialEvent`](https://jsr.io/@pistonite/pure/doc/sync/~/SerialEvent): Discard/stop previous async process when a new one starts
- [`pref`](https://jsr.io/@pistonite/pure/doc/pref/~): Preference utilities, for example theme and language.

## Setup
Install the package from JSR (bunx also works)
```
npx jsr install @pistonite/pure
```

Import the things you need
```typescript
import type { Result } from "@pistonite/pure/result";
```
