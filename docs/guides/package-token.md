# Install the package with a read-only token

- **Status:** Decided. Settles [PKG-1](../PRD.md) and [risk 3](../RISKS.md).
- **Issue:** [#30](https://github.com/studiobimo/backstage/issues/30)

`@studiobimo/backstage` lives on GitHub Packages ([ADR-0006](../adr/0006-private-package.md)), and
GitHub Packages asks for a token even to read a package. This is how a client project gives it one
in each place the install runs, and how the token is rotated.

## The decision

- **One token per client**, a classic personal access token with only `read:packages`. Fine-grained
  tokens cannot read GitHub Packages, so classic is the only kind that works.
- **Owned by a machine user**, `studiobimo-packages`, a GitHub account that is a member of the
  studiobimo organisation with read access to the package and nothing else. A token tied to a
  person stops working when they leave.
- **Named for the client** (`acme-read-packages`) and given an expiry of 90 days, so a leak ends
  by itself and each client can be revoked alone.
- **One environment variable**, `BACKSTAGE_PACKAGE_TOKEN`, in all three places. The name is the
  same everywhere, so `.npmrc` is the same everywhere.

## `.npmrc`, committed

The file holds the variable's name and never its value, so it is safe to commit:

```ini
@studiobimo:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${BACKSTAGE_PACKAGE_TOKEN}
```

pnpm reads `.npmrc` from the project root and expands `${...}` from the environment. Only
`@studiobimo/*` goes to GitHub Packages; every other package still comes from npm. `pnpm install`
fails with a 401 when the variable is unset, which is the intended behaviour for a stranger.

## Where the value comes from

| Where          | How the token gets there                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Locally        | `export BACKSTAGE_PACKAGE_TOKEN=…` in the shell profile, or in mise's `[env]` read from a gitignored file          |
| GitHub Actions | A repository secret named `BACKSTAGE_PACKAGE_TOKEN`, passed to the install step's `env:`. Never `secrets: inherit` |
| Workers Builds | A **build variable** named `BACKSTAGE_PACKAGE_TOKEN`, set to a secret, under Settings, Build, Variables            |
| Dependabot     | A Dependabot secret of the same name, and a `registries` entry in `dependabot.yml` that reads it                   |

Workers Builds runs `pnpm install` before the build command, with the build variables in its
environment, so `.npmrc` needs nothing else. The variable is a build variable, not a Worker
secret: the deployed Workers never see it, and must not.

## Rotating

Rotate on a schedule (every 90 days, when the token expires) and at once when a leak is suspected
or the contract ends.

1. As the machine user, create a new classic token with `read:packages`, named for the client and
   the month.
2. Replace `BACKSTAGE_PACKAGE_TOKEN` in the places above: the repository secret, the Dependabot
   secret and the Workers Builds variable. Locally, each developer takes the new value from the
   studio's password manager.
3. Trigger a Workers Builds run and a CI run to prove the new token installs.
4. Delete the old token. Until it is deleted it still works, so this step is what ends a leak.

When a contract ends, delete that client's token and nothing else changes for other clients.

## What stays open

- **Nothing was run against Workers Builds.** The steps above follow Cloudflare's documentation and
  GitHub's for GitHub Packages. The first deployed consumer ([M3](../ROADMAP.md)) confirms them.
- **A 90 day expiry means a chore per client.** A reminder in the studio's calendar is the only
  automation for now.
- **Package access is per package, not per token.** The machine user can read every studiobimo
  package it has been granted, so grant it only the ones clients install.
