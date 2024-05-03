# pure

The In-house TypeScript utility library

These are used internally in my projects and are inherently unstable. However if you want, you can depend on it
either by copying them into your project or use the setup below

Some libraries have external dependencies, which you want to state in the `package.json`
of your project. This repo doesn't have one :)

## Libraries
- `fs`: Browser File System Integration
- `log`: Logging library with log export ability
- `result`: Rust-list result handling library
- `utils`: I don't know where to put the stuff

## Setup
You need add `pure` as a git submodule. If you have [magoo](https://github.com/Pistonite/magoo), it's as easy as
```
magoo install https://github.com/Pistonite/pure path/to/install/local/pure --branch main
```

and include this in your `tsconfig.json` to setup the imports and compiling
```json
{
    "compilerOptions": {
        "paths": {
            "pure/*": ["base/rel/path/to/pure/*"]
        }
    },
    "include": ["path/to/pure"]
}
```
The path mapping needs to relative to "baseUrl" if you have that set. The `include` can also be a parent directory of `pure` (like `src`, if you are cloning to inside your src tree), or particular subdirectory(-ies) if you only need part of pure (to avoid having to install dependencies that you don't need)

Now you can import!
```typescript
import type { Result } from "pure/result";
```
