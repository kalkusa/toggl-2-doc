import { Document, Paragraph, Table, TableRow, TableCell, BorderStyle, Packer, WidthType } from 'docx'
import { TogglTimeEntry } from '../types/toggl'

interface UseDocumentGeneratorReturn {
  generateDocument: (timeEntries: TogglTimeEntry[]) => Promise<void>;
}

const formatDuration = (seconds: number, hasStop: boolean): string => {
  if (!hasStop) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60
  return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  // Check for invalid date (like 1970-01-01 which indicates missing stop time)
  if (date.getFullYear() === 1970) return '-'
  
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

export function useDocumentGenerator(): UseDocumentGeneratorReturn {
  const generateDocument = async (timeEntries: TogglTimeEntry[]) => {
    const columnWidths = [30, 20, 20, 20, 10]

    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          new Paragraph({
            text: 'Toggl Time Entries Report',
            heading: 'Heading1'
          }),
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            columnWidths: columnWidths,
            rows: [
              // Header row
              new TableRow({
                children: [
                  'Description',
                  'Project',
                  'Start',
                  'Stop',
                  'Duration',
                ].map((header, index) => 
                  new TableCell({
                    children: [new Paragraph({ text: header })],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                    width: {
                      size: columnWidths[index],
                      type: WidthType.PERCENTAGE,
                    },
                  })
                ),
              }),
              // Data rows
              ...timeEntries.map(entry => {
                const stopTime = formatDate(entry.stop)
                return new TableRow({
                  children: [
                    entry.description || 'No description',
                    entry.project?.name || 'No project',
                    formatDate(entry.start),
                    stopTime,
                    formatDuration(entry.duration, stopTime !== '-'),
                  ].map((text, index) => 
                    new TableCell({
                      children: [new Paragraph({ text })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                      width: {
                        size: columnWidths[index],
                        type: WidthType.PERCENTAGE,
                      },
                    })
                  ),
                })
              }),
            ],
          }),
        ],
      }],
    })

    // Generate the document using Packer
    const blob = await Packer.toBlob(doc)
    
    // Create a download link and trigger the download
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `toggl-report-${new Date().toISOString().split('T')[0]}.docx`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return { generateDocument }
} 