# pure

Pure TypeScript utility libraries for my projects

## Documentation

https://pure.pistonite.dev

## Setup

Install the package from NPM

```bash
npm install @pistonite/pure
```

For React hooks

```bash
npm install @pistonite/pure-react
```

Import the things you need

```typescript
import type { Result } from "@pistonite/pure/result";
```

## Bundling
Because this library has global states, it's likely you need to dedupe it
in your bundler config

For example, Vite:

```typescript
export default defineConfig({
    /* ... */

    resolve: {
        dedupe: ["@pistonite/pure"]
    }

    /* ... */
})
```
