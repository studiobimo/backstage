import type { PublishProblem } from '@studiobimo/backstage/internal'

export const publishProblemKey = ({ reason, path }: Pick<PublishProblem, 'reason' | 'path'>) =>
  `publish.problems.${reason === 'invalid_content' && path ? 'invalid_content_field' : reason}`
