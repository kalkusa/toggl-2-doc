import { Document, Paragraph, Table, TableRow, TableCell, BorderStyle, Packer } from 'docx'
import { TogglTimeEntry } from '../types/toggl'

interface UseDocumentGeneratorReturn {
  generateDocument: (timeEntries: TogglTimeEntry[]) => Promise<void>;
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}:${minutes.toString().padStart(2, '0')}`
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function useDocumentGenerator(): UseDocumentGeneratorReturn {
  const generateDocument = async (timeEntries: TogglTimeEntry[]) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: 'Toggl Time Entries Report',
            heading: 'Heading1'
          }),
          new Table({
            width: {
              size: 100,
              type: 'pct',
            },
            rows: [
              // Header row
              new TableRow({
                children: [
                  'Description',
                  'Project',
                  'Start',
                  'Stop',
                  'Duration',
                ].map(header => 
                  new TableCell({
                    children: [new Paragraph({ text: header })],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                  })
                ),
              }),
              // Data rows
              ...timeEntries.map(entry => 
                new TableRow({
                  children: [
                    entry.description || 'No description',
                    entry.project?.name || 'No project',
                    formatDate(entry.start),
                    formatDate(entry.stop),
                    formatDuration(entry.duration),
                  ].map(text => 
                    new TableCell({
                      children: [new Paragraph({ text })],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                    })
                  ),
                })
              ),
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