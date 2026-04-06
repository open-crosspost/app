---
"ui": patch
---

Refactor navigation to use TanStack Router best practices

- Replace internal navigation `<a>` tags with `<Link>` components for automatic intent-based preloading
- Remove `as never` type casts from route definitions to restore proper TypeScript inference
- Fix route param types for dynamic routes (organizations, projects, apps)
- Fix optional search params type inference for `/apps` route
- Improve type safety and autocomplete for route navigation
- Preserve external links as `<a>` tags (API endpoint, external domains, static files)

This enables automatic route preloading on hover/focus, improving navigation performance and user experience.
