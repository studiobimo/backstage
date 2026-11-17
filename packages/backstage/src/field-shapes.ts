import type { TranslatedNode } from './translations.ts'

export type SchemaNode = Exclude<TranslatedNode, boolean>

export type FieldShape =
  | 'richText'
  | 'image'
  | 'link'
  | 'localized'
  | 'reference'
  | 'hexColor'
  | 'array'
  | 'object'
  | 'select'
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'unsupported'

const MARKED_SHAPES: Record<string, FieldShape> = {
  richText: 'richText',
  image: 'image',
  link: 'link',
  localized: 'localized',
  reference: 'reference',
  hexColor: 'hexColor'
}

const TYPE_SHAPES: Record<string, FieldShape> = {
  array: 'array',
  object: 'object',
  string: 'string',
  number: 'number',
  integer: 'integer',
  boolean: 'boolean'
}

export function classifyField(node: SchemaNode): FieldShape {
  const marked = node.backstage === undefined ? undefined : MARKED_SHAPES[node.backstage]
  if (marked) return marked
  const typed = typeof node.type === 'string' ? TYPE_SHAPES[node.type] : undefined
  if (typed === 'array' || typed === 'object') return typed
  if (node.enum) return 'select'
  return typed ?? 'unsupported'
}

const OPAQUE_SHAPES: readonly FieldShape[] = ['richText', 'image', 'link', 'reference']

const joinPath = (path: string, key: string) => (path === '' ? key : `${path}.${key}`)

function childrenOf(node: SchemaNode, path: string): [SchemaNode, string][] {
  const { items, additionalProperties, properties = {} } = node
  const children: [TranslatedNode | undefined, string][] = [
    [Array.isArray(items) ? undefined : items, path],
    [additionalProperties, path],
    ...Object.entries(properties).map(([key, child]): [TranslatedNode, string] => [
      child,
      joinPath(path, key)
    ])
  ]
  return children.flatMap(([child, childPath]) =>
    child === undefined || typeof child === 'boolean' ? [] : [[child, childPath]]
  )
}

export function unrenderableFieldIn(node: SchemaNode, path: string): string | undefined {
  const shape = classifyField(node)
  if (shape === 'unsupported') return path
  if (OPAQUE_SHAPES.includes(shape)) return undefined
  return childrenOf(node, path)
    .map(([child, childPath]) => unrenderableFieldIn(child, childPath))
    .find((found) => found !== undefined)
}

export interface ReferencePlace {
  path: string
  collection: string
}

export function referencePlacesIn(node: SchemaNode, path = ''): ReferencePlace[] {
  const shape = classifyField(node)
  if (shape === 'reference') return [{ path, collection: node.collection ?? '' }]
  if (OPAQUE_SHAPES.includes(shape)) return []
  return childrenOf(node, path).flatMap(([child, childPath]) => referencePlacesIn(child, childPath))
}
