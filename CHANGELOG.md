# kitty-kit

## 1.2.0

### Minor Changes

- cb9087c: - Header Modifier: URL pattern field now supports four explicit match operators (Equals, Contains, Wildcard, Regex). Existing rules default to Wildcard.
  - Header Modifier / Tracking Cleaner: Firefox builds now correctly use the webRequest blocking path. Previously the runtime feature check selected declarativeNetRequest in Firefox 113+, even though the manifest provisions webRequest specifically as the Firefox fallback.
  - Release flow: replaced manual tag-push releases with a Changesets-driven workflow.
