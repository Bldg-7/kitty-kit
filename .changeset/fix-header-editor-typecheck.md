---
"kitty-kit": patch
---

Fix a type error that broke `tsc` (and the release build) under the wxt 0.21
toolchain: its generated tsconfig enables `noUncheckedIndexedAccess`, which
made `headers[index]` possibly-undefined in the Header Modifier rule editor.
`updateHeader` now maps over the headers instead of index-assigning, which is
behavior-preserving and type-safe.
