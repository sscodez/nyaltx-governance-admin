declare module 'ethereum-blockies' {
  type BlockiesOptions = {
    seed: string
    size?: number
    scale?: number
    spotcolor?: string
    color?: string
    bgcolor?: string
  }

  type BlockiesInstance = {
    create: (options: BlockiesOptions) => HTMLCanvasElement
  }

  const blockies: BlockiesInstance
  export default blockies
}
