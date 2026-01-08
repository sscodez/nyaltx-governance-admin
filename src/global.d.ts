import type { ReactNode } from 'react'
import type { StaticImageData } from 'next/image'

declare module 'google-maps-react' {
  interface IMapProps {
    children?: ReactNode
    styles?: unknown
  }
}

declare module 'react-easy-edit'

declare module '*.jpg' {
  const content: StaticImageData
  export default content
}

declare module '*.png' {
  const content: StaticImageData
  export default content
}

declare module '*.jpeg' {
  const content: StaticImageData
  export default content
}

declare module '*.gif' {
  const content: StaticImageData
  export default content
}

declare module '*.svg' {
  const content: StaticImageData
  export default content
}

declare module '*.webp' {
  const content: StaticImageData
  export default content
}

// declare module "react-table";
