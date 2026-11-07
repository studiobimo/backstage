# React on the site worker, against the free plan

- **Status:** Done. Settles [risk 6](../RISKS.md).
- **Date:** 2026-11-07
- **Issue:** [#3](https://github.com/studiobimo/backstage/issues/3)

## The question

The site worker renders each published page with React's `renderToReadableStream`
([PUB-3](../PRD.md)). Does that fit the free plan's limits: 10 ms of CPU per request, and a
Worker bundle that stays inside its size budget?

## Answer

**It fits, with one thing to watch: the first request in a fresh isolate.**

- **Size.** The renderer and a page of five blocks bundle to **222 KiB, or 68 KiB gzipped**.
  The renderer is nearly all of it; the page's code adds under 4 KiB. Cloudflare's compressed
  size limit (3 MB on free) was removed in September 2026, and the limit that remains is 64 MiB
  uncompressed, so size is only the budget we set ourselves (#9).
- **CPU, once warm:** about **0.1 ms** to render five blocks, and about 0.3 ms for 25.
- **CPU, first render in a fresh process:** about **6 ms** for five blocks and 8 ms for 25.
  Evaluating the bundle costs another **6 ms**. Cloudflare's docs describe startup as separate
  from request CPU, but we could not confirm how the first request is billed. If both count,
  a cold isolate is close to the 10 ms line.

So the risk is a cold isolate, not a busy one. Edge caching ([PUB-4](../PRD.md)) takes most
requests off the render path, and the cold case is cheap to guard against (see below).

## What was measured

A throwaway page of **five blocks**: a hero, a grid of six features, six paragraphs of rich text,
a gallery of eight images and a call to action, in a layout with a header, navigation and footer.
It renders to 6.1 KB of HTML. A second page repeats the five blocks five times (28 KB of HTML).
Each is a plain function component, as a block's component will be.

The worker is `renderToReadableStream(<Page />)`, awaits `stream.allReady` and returns it as a
`Response`. esbuild bundled it the way the Cloudflare Vite plugin does for production:
`workerd`, `worker` and `browser` export conditions, minified, `NODE_ENV=production`.

| Bundle | Raw | gzip | brotli |
| --- | --- | --- | --- |
| A worker that returns `ok` | 0.1 KiB | 0.1 KiB | 0.1 KiB |
| `react-dom/server` and one `<p>` | 218.5 KiB | 66.6 KiB | 38.8 KiB |
| **Five-block page** | **222.1 KiB** | **68.0 KiB** | **39.9 KiB** |
| 25-block page | 222.0 KiB | 67.9 KiB | 39.9 KiB |

CPU time came from `process.cpuUsage()` in Node 24, which runs the same V8 as workerd. It was
taken in **25 fresh processes** per page: the CPU spent importing the bundle, on the first
render, and then on 500 renders after 200 warm-up renders.

| Page | Import | First render | Renders 2 to 5 | Warm, median | Warm, p95 |
| --- | --- | --- | --- | --- | --- |
| `<p>hello</p>` | 6.2 ms | 3.4 ms | 0.16 ms | 0.02 ms | 0.11 ms |
| **Five blocks** | **6.3 ms** | **6.1 ms** | **0.9 ms** | **0.09 ms** | **0.68 ms** |
| 25 blocks | 6.1 ms | 8.3 ms | 2.9 ms | 0.31 ms | 1.2 ms |

The same bundle also ran in local workerd (`wrangler dev`), timed from outside with curl.
That includes HTTP and wrangler's proxy, so it bounds the cost from above rather than
measuring CPU: a worker that returns `ok` took 0.23 ms, the five-block page a median of
**1.9 ms** (p95 2.5 ms), and the very first request after a start **12 to 14 ms**, over three
starts.

## What this does not tell us

- **It is not Cloudflare's CPU meter.** Node and a local workerd are the same engine, not the
  same machine or the same accounting. Real pages carry more markup, i18n and the registry.
- **The first-request bill is unconfirmed.** Whether module evaluation counts against the
  request's 10 ms is the open question.
- **The development build is far slower.** `wrangler dev` bundles with `NODE_ENV=development`
  unless told otherwise, and React's development build took about 4 ms warm instead of 1.9 ms.
  Measure production builds only.

## Recommendations

1. **Keep the cached path off React.** Load the renderer only on a cache miss, with a dynamic
   `import()`, so a cache hit in a cold isolate pays neither the 6 ms import nor the render.
   Untested here: check that the Vite plugin's bundle still defers the evaluation.
2. **Budget the site worker at 150 KiB gzipped to start.** That is about twice the measured
   renderer, with room for Hono, the registry and the blocks. #9 sets the number and can move it.
3. **Re-measure on `development`** once #8 deploys it. Read the Worker's CPU time in the
   dashboard (p50 and p99) for a cold start and a day of normal use, and close risk 6 for good
   or reopen it with those figures.
4. **Keep blocks plain.** Nothing here rewards a heavier tree: a block with no client script
   ships no JavaScript (PUB-3), and cost grows with the number of elements, not with blocks.

## Limits cited

From [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and the
[2026-09-04 changelog](https://developers.cloudflare.com/changelog/post/2026-09-04-increased-worker-size-limit/),
read on 2026-11-07: 10 ms of CPU per HTTP request on the free plan, and a 64 MiB uncompressed
limit for the Worker bundle on every plan. The same page says server-side rendering usually
needs the paid plan, and that is the claim this measurement tests.
