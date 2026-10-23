# Teach Turborepo checks

Teach currently uses Turborepo's single-package mode. It runs the existing
TypeScript check and foundation tests in parallel, with a local cache. No account
or remote cache setup is required.

From the repository root, install the application dependencies as usual, then
install the pinned tooling:

```sh
pnpm install --frozen-lockfile --ignore-scripts --ignore-pnpmfile
pnpm --dir tooling/turbo install --frozen-lockfile --ignore-scripts --ignore-pnpmfile
```

Run both checks, inspect the task plan, or run one task:

```sh
pnpm --dir tooling/turbo check
pnpm --dir tooling/turbo plan
pnpm --dir tooling/turbo turbo typecheck
```

The launcher includes the actual Node version, OS, and architecture in the cache
key. All source inputs use Turborepo's default hashing, including tracked files
and changes to them. Changing source or the pinned tooling invalidates the cache.
These tasks produce logs only, so their output lists are empty. To force fresh
execution, append `--force` to the check command.

The tooling has its own workspace and lockfile because the existing hosted
source packaging and CI contracts pin the root dependency descriptor, lockfile,
and command aliases. Root dependencies, source layout, and commands retain their
reviewed identities. The additional tooling is not an application dependency.

Database operations, authority audits, packaging, and deployment remain in their
existing fresh-execution workflows. A cached local check does not replace the
canonical self-audit or deployment acceptance evidence. Vercel continues to use
the existing pinned Node release builder.

Adding actual application packages later requires a separate source-layout
change and review of the package closure and workspace contracts. This setup
does not move the application into `apps/` or split its domain modules.
