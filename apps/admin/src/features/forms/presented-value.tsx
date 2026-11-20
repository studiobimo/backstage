import type { PresentedField, PresentedValue } from '@studiobimo/backstage/internal'
import { useTranslation } from 'react-i18next'

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

type TableValue = Extract<PresentedValue, { kind: 'table' }>

function Missing() {
  const { t } = useTranslation('forms')
  return <span className="text-muted-foreground">{t('detail.none')}</span>
}

function ValueTable({ label, value }: { label: string; value: TableValue }) {
  const { columns, rows, total } = value
  return (
    <Table>
      <TableCaption className="sr-only">{label}</TableCaption>
      <TableHeader>
        <TableRow>
          {columns.map(({ key, label: column }) => (
            <TableHead key={key}>{column}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={index}>
            {row.map((cell, cellIndex) => (
              <TableCell key={columns[cellIndex]?.key ?? cellIndex}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {total && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={Math.max(columns.length - 1, 1)} className="font-medium">
              {total.label}
            </TableCell>
            <TableCell className="font-medium">{total.text}</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}

function NestedFields({ fields }: { fields: PresentedField[] }) {
  return (
    <dl className="flex flex-wrap gap-x-4 gap-y-1">
      {fields.map((field) => (
        <div key={field.key} className="flex gap-1.5">
          <dt className="text-muted-foreground">{field.label}</dt>
          <dd>
            <PresentedValueView label={field.label} value={field.value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function PresentedValueView({ label, value }: { label: string; value: PresentedValue }) {
  if (value.kind === 'table') {
    return value.rows.length === 0 ? <Missing /> : <ValueTable label={label} value={value} />
  }
  if (value.kind === 'fields') return <NestedFields fields={value.fields} />
  return value.text === '' ? <Missing /> : <>{value.text}</>
}
