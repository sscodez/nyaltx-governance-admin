import type { ComponentType, ReactNode } from 'react'
import type { StaticImageData } from 'next/image'

declare module 'google-maps-react' {
  export interface GoogleApiWrapperOptions {
    apiKey?: string
    client?: string
    url?: string
    version?: string
    language?: string
    region?: string
    libraries?: string[]
    LoadingContainer?: ComponentType
    [key: string]: unknown
  }

  export interface IProvidedProps {
    google: any
    loaded?: boolean
  }

  export interface IMapProps {
    google: any
    className?: string
    style?: Record<string, unknown>
    containerStyle?: Record<string, unknown>
    initialCenter?: { lat: number; lng: number }
    center?: { lat: number; lng: number }
    zoom?: number
    bounds?: unknown
    visible?: boolean
    styles?: unknown
    centerAroundCurrentLocation?: boolean
    zoomControlOptions?: Record<string, unknown>
    streetViewControl?: boolean
    onReady?: (...args: any[]) => void
    children?: ReactNode
    [key: string]: unknown
  }

  export interface IMarkerProps {
    google?: any
    name?: string
    title?: string
    position?: { lat: number; lng: number }
    onClick?: (...args: any[]) => void
    [key: string]: unknown
  }

  export interface IInfoWindowProps {
    google?: any
    marker?: any
    visible?: boolean
    onClose?: (...args: any[]) => void
    children?: ReactNode
    [key: string]: unknown
  }

  export const Map: ComponentType<IMapProps>
  export const Marker: ComponentType<IMarkerProps>
  export const InfoWindow: ComponentType<IInfoWindowProps>
  export const Polyline: ComponentType<any>
  export function GoogleApiWrapper(options?: GoogleApiWrapperOptions): (component: ComponentType<IProvidedProps>) => ComponentType<any>
}

declare module 'react-easy-edit' {
  import type { ComponentType } from 'react'

  export const Types: Record<string, string>
  const EasyEdit: ComponentType<Record<string, unknown>>

  export default EasyEdit
}

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
