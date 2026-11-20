import { z } from 'zod'

import { uniquePaths, type ClientAssets } from './client-scripts.ts'

export const VITE_ASSETS = {
  base: '/',
  error: {
    missingEntry: (entry: string) => `Vite manifest has no entry "${entry}"`,
    missingImport: (key: string, importer: string) =>
      `Vite manifest has no chunk "${key}" imported by "${importer}"`
  }
} as const

export const viteManifestSchema = z.record(
  z.string(),
  z.object({
    file: z.string(),
    css: z.array(z.string()).optional(),
    imports: z.array(z.string()).optional()
  })
)

export type ViteManifest = z.input<typeof viteManifestSchema>

export type ViteAssets = Required<ClientAssets>

export interface ViteAssetsOptions {
  base?: string
}

type Chunks = z.output<typeof viteManifestSchema>

const importedChunksOf = (chunks: Chunks, entry: string) => {
  const found = new Map<string, Chunks[string]>()
  const visit = (key: string, importer: string) => {
    const chunk = chunks[key]
    if (!chunk) throw new Error(VITE_ASSETS.error.missingImport(key, importer))
    if (found.has(key)) return
    found.set(key, chunk)
    chunk.imports?.forEach((child) => visit(child, key))
  }
  chunks[entry]?.imports?.forEach((child) => visit(child, entry))
  found.delete(entry)
  return [...found.values()]
}

export const viteAssets = (
  manifest: ViteManifest,
  entry: string,
  { base = VITE_ASSETS.base }: ViteAssetsOptions = {}
): ViteAssets => {
  const chunks = viteManifestSchema.parse(manifest)
  const root = chunks[entry]
  if (!root) throw new Error(VITE_ASSETS.error.missingEntry(entry))
  const imported = importedChunksOf(chunks, entry)
  const at = (file: string) => `${base}${file}`
  return {
    scripts: [at(root.file)],
    styles: uniquePaths([root, ...imported].flatMap(({ css = [] }) => css.map(at))),
    preloads: uniquePaths(imported.map(({ file }) => at(file)))
  }
}
