import { Button, type ButtonProps } from '@/components/ui/button'
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip'

interface IconButtonProps extends ButtonProps {
  label: string
}

export function IconButton({ label, size = 'icon', ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size={size} aria-label={label} {...props} />} />
      <TooltipPopup>{label}</TooltipPopup>
    </Tooltip>
  )
}
