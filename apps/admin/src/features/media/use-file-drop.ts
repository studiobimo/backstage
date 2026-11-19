import { useEffect, useRef, useState } from 'react'

const FILES_TYPE = 'Files'

const carriesFiles = (event: DragEvent) => event.dataTransfer?.types.includes(FILES_TYPE) ?? false

export function useFileDrop(onFiles: (files: File[]) => void, enabled = true) {
  const [dragging, setDragging] = useState(false)
  const handler = useRef(onFiles)
  useEffect(() => {
    handler.current = onFiles
  })
  useEffect(() => {
    if (!enabled) return
    let depth = 0
    const enter = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth += 1
      setDragging(true)
    }
    const over = (event: DragEvent) => {
      if (carriesFiles(event)) event.preventDefault()
    }
    const leave = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    const drop = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth = 0
      setDragging(false)
      handler.current(Array.from(event.dataTransfer?.files ?? []))
    }
    document.addEventListener('dragenter', enter)
    document.addEventListener('dragover', over)
    document.addEventListener('dragleave', leave)
    document.addEventListener('drop', drop)
    return () => {
      document.removeEventListener('dragenter', enter)
      document.removeEventListener('dragover', over)
      document.removeEventListener('dragleave', leave)
      document.removeEventListener('drop', drop)
      setDragging(false)
    }
  }, [enabled])
  return dragging
}
