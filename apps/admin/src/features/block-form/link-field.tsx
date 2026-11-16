import { FieldFrame, FieldHeading } from '@/components/form/fields'
import { Fieldset, FieldsetLegend } from '@/components/ui/fieldset'
import { Tabs, TabsList, TabsTab } from '@/components/ui/tabs'
import { useTranslation } from 'react-i18next'

import { GroupFields, type NodeProps } from './field-node.tsx'
import {
  LINK_MODE,
  linkModeOf,
  linkValueFor,
  pageLinkDraftOf,
  type LinkMode
} from './link-value.ts'
import { PagePicker } from './page-picker.tsx'
import type { GroupSpec } from './spec.ts'
import { fieldName, readValue } from './value.ts'

const LABEL_KEY = 'label'

const pageFields = (spec: GroupSpec): GroupSpec => ({
  ...spec,
  fields: spec.fields.filter(({ key }) => key === LABEL_KEY)
})

export function LinkField(props: NodeProps<GroupSpec>) {
  const { form, spec, path, label, chrome, translated } = props
  const { t } = useTranslation('blockForm')
  const modeLabel = t('link.modeLabel')
  return (
    <form.AppField name={fieldName(path)}>
      {(field) => {
        const current = readValue(field.state.value)
        const mode = linkModeOf(current)
        const switchMode = (next: string) => {
          if (next === mode) return
          field.handleChange(linkValueFor(next as LinkMode, current))
        }
        return (
          <Fieldset className="flex w-full max-w-none flex-col gap-3">
            <FieldsetLegend className="mb-1 w-full">
              <FieldHeading
                {...chrome}
                legend
                label={label}
                optional={chrome?.optional ?? (!spec.required && !translated)}
              />
            </FieldsetLegend>
            <Tabs value={mode} onValueChange={switchMode}>
              <TabsList aria-label={modeLabel} className="w-full text-muted-foreground">
                <TabsTab value={LINK_MODE.page} className="flex-1">
                  {t('link.page')}
                </TabsTab>
                <TabsTab value={LINK_MODE.address} className="flex-1">
                  {t('link.address')}
                </TabsTab>
              </TabsList>
            </Tabs>
            {mode === LINK_MODE.page ? (
              <>
                <form.AppField name={fieldName([...path, 'pageId'])}>
                  {(pageField) => (
                    <FieldFrame label={t('link.pageLabel')}>
                      <PagePicker
                        pageId={pageLinkDraftOf(current)?.pageId ?? ''}
                        label={label}
                        onChange={(pageId) => pageField.handleChange(pageId)}
                      />
                    </FieldFrame>
                  )}
                </form.AppField>
                <GroupFields {...props} spec={pageFields(spec)} />
              </>
            ) : (
              <GroupFields {...props} />
            )}
            {chrome?.footer}
          </Fieldset>
        )
      }}
    </form.AppField>
  )
}
