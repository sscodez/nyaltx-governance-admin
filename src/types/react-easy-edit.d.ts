declare module 'react-easy-edit' {
  import type { ComponentType } from 'react'

  export const Types: Record<string, string>

  const EasyEdit: ComponentType<Record<string, unknown>>

  export default EasyEdit
}
