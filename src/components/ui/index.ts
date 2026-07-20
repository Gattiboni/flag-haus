/**
 * Componentes-base do Design System Flag Haus.
 *
 * Regra em vigor desde a Spec #4c-visual: todo JSX novo importa daqui;
 * todo CSS novo consome os tokens de src/styles/tokens/. Se um componente
 * não existe, pausa e reporta — não improvisa (docs/design-system/adoption.md).
 */

export { Alert } from './Alert'
export type { AlertProps, AlertVariant } from './Alert'

export { Badge } from './Badge'
export type { BadgeProps, BadgeVariant } from './Badge'

export { Button } from './Button'
export type { ButtonProps, ButtonSize, ButtonVariant } from './Button'

export { Card, CardHeader } from './Card'
export type { CardHeaderProps, CardProps, CardTone } from './Card'

export { Checkbox } from './Checkbox'
export type { CheckboxProps } from './Checkbox'

export { Dialog } from './Dialog'
export type { DialogProps } from './Dialog'

export { Input } from './Input'
export type { InputProps } from './Input'

export { RadioGroup } from './RadioGroup'
export type { RadioGroupProps, RadioOption } from './RadioGroup'

export { Select } from './Select'
export type { SelectOption, SelectProps } from './Select'

export { Textarea } from './Textarea'
export type { TextareaProps } from './Textarea'
