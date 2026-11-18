import { MEDIA } from '@studiobimo/backstage'
import { useTranslation } from 'react-i18next'

import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from '@/components/ui/meter'
import { formatBytes } from '@/lib/format'

export function StorageMeter({ usedBytes }: { usedBytes: number }) {
  const { t, i18n } = useTranslation('media')
  const budget = MEDIA.storage.freeTierBytes
  return (
    <Meter max={budget} value={Math.min(usedBytes, budget)}>
      <div className="flex items-center justify-between gap-2">
        <MeterLabel>{t('storage.label')}</MeterLabel>
        <MeterValue>
          {() =>
            t('storage.value', {
              used: formatBytes(i18n.language, usedBytes),
              budget: formatBytes(i18n.language, budget)
            })
          }
        </MeterValue>
      </div>
      <MeterTrack>
        <MeterIndicator />
      </MeterTrack>
    </Meter>
  )
}
