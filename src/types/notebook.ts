export type NotebookCellType = 'code' | 'markdown' | 'raw' | (string & {})

export type NotebookCellSourceValue = string | string[]

export type NotebookOutputImage = {
  image_data: string
  media_type: 'image/png' | 'image/jpeg' | (string & {})
}

export type NotebookCellStreamOutput = {
  output_type: 'stream'
  name?: string
  text?: string | string[]
}

export type NotebookCellDisplayOutput = {
  output_type: 'execute_result' | 'display_data'
  data?: Record<string, unknown>
  metadata?: Record<string, unknown>
  execution_count?: number | null
}

export type NotebookCellErrorOutput = {
  output_type: 'error'
  ename: string
  evalue: string
  traceback: string[]
}

export type NotebookCellOutput =
  | NotebookCellStreamOutput
  | NotebookCellDisplayOutput
  | NotebookCellErrorOutput

export type NotebookCell = {
  cell_type: NotebookCellType
  id?: string
  source: NotebookCellSourceValue
  metadata: Record<string, unknown>
  execution_count?: number | null
  outputs?: NotebookCellOutput[]
}

export type NotebookContent = {
  nbformat: number
  nbformat_minor: number
  metadata: {
    language_info?: {
      name?: string
      [key: string]: unknown
    }
    [key: string]: unknown
  }
  cells: NotebookCell[]
  [key: string]: unknown
}

export type NotebookCellSourceOutput =
  | {
      output_type: 'stream'
      text?: string
    }
  | {
      output_type: 'execute_result' | 'display_data'
      text?: string
      image?: NotebookOutputImage
    }
  | {
      output_type: 'error'
      text?: string
    }

export type NotebookCellSource = {
  cellType: NotebookCellType
  source: string
  execution_count?: number
  cell_id: string
  language?: string
  outputs?: NotebookCellSourceOutput[]
}

