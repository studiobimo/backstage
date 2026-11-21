import type { submissionsResponseSchema } from '@studiobimo/backstage/internal'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Pagination, PaginationContent, PaginationItem } from '@/components/ui/pagination'

interface SubmissionsPagerProps {
  listing: Pick<z.infer<typeof submissionsResponseSchema>, 'page' | 'pageSize' | 'total'>
  onPageChange: (page: number) => void
}

const FIRST_PAGE = 1

export function SubmissionsPager({
  listing: { page, pageSize, total },
  onPageChange
}: SubmissionsPagerProps) {
  const { t } = useTranslation('forms')
  const pages = Math.max(Math.ceil(total / pageSize), FIRST_PAGE)
  if (pages === FIRST_PAGE) return null
  const from = (page - FIRST_PAGE) * pageSize + FIRST_PAGE
  const to = Math.min(page * pageSize, total)
  return (
    <Pagination aria-label={t('pager.label')}>
      <PaginationContent className="w-full justify-between gap-2">
        <PaginationItem>
          <Button
            variant="outline"
            disabled={page <= FIRST_PAGE}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeftIcon aria-hidden />
            {t('pager.previous')}
          </Button>
        </PaginationItem>
        <PaginationItem className="text-muted-foreground text-sm" aria-live="polite">
          {t('pager.summary', { from, to, total, page, pages })}
        </PaginationItem>
        <PaginationItem>
          <Button variant="outline" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
            {t('pager.next')}
            <ChevronRightIcon aria-hidden />
          </Button>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
