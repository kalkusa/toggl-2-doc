import { Document, Paragraph, Table, TableRow, TableCell, BorderStyle, Packer, WidthType, TextRun } from 'docx'
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
    // Using fixed width in points (1440 points = ~1 inch, document is 8.5 inches)
    const fixedColumnWidths = {
      description: 3000, // ~2 inches (150px equivalent)
      other: 1000        // for the other columns
    }

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
            layout: "fixed",
            // Set preferred widths without filling in the columnWidths array
            rows: [
              // Header row
              new TableRow({
                children: [
                  'Description',
                  'Project',
                  'Start',
                  'Stop',
                  'Duration',
                ].map((header, index) => {
                  const cellWidth = index === 0 
                    ? fixedColumnWidths.description 
                    : fixedColumnWidths.other
                    
                  return new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: header
                          })
                        ],
                        spacing: {
                          before: 120,
                          after: 120
                        }
                      })
                    ],
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 1 },
                      bottom: { style: BorderStyle.SINGLE, size: 1 },
                      left: { style: BorderStyle.SINGLE, size: 1 },
                      right: { style: BorderStyle.SINGLE, size: 1 },
                    },
                    width: {
                      size: cellWidth,
                      type: WidthType.DXA
                    },
                    verticalAlign: "center"
                  })
                }),
              }),
              // Data rows
              ...timeEntries.map(entry => {
                const stopTime = formatDate(entry.stop)
                // Process description to manually wrap text if needed
                const description = entry.description || 'No description'
                // Split by newlines first, then by length
                const descLines = description.split('\n')
                
                return new TableRow({
                  children: [
                    // Description cell with potential multiple lines
                    new TableCell({
                      children: descLines.map(line => 
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: line
                            })
                          ],
                          spacing: {
                            before: 120,
                            after: 120
                          }
                        })
                      ),
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                      width: {
                        size: fixedColumnWidths.description,
                        type: WidthType.DXA
                      },
                      verticalAlign: "center"
                    }),
                    // Project cell
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: entry.project?.name || 'No project'
                            })
                          ],
                          spacing: {
                            before: 120,
                            after: 120
                          }
                        })
                      ],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                      width: {
                        size: fixedColumnWidths.other,
                        type: WidthType.DXA
                      },
                      verticalAlign: "center"
                    }),
                    // Start cell
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: formatDate(entry.start)
                            })
                          ],
                          spacing: {
                            before: 120,
                            after: 120
                          }
                        })
                      ],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                      width: {
                        size: fixedColumnWidths.other,
                        type: WidthType.DXA
                      },
                      verticalAlign: "center"
                    }),
                    // Stop cell
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: stopTime
                            })
                          ],
                          spacing: {
                            before: 120,
                            after: 120
                          }
                        })
                      ],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                      width: {
                        size: fixedColumnWidths.other,
                        type: WidthType.DXA
                      },
                      verticalAlign: "center"
                    }),
                    // Duration cell
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: formatDuration(entry.duration, stopTime !== '-')
                            })
                          ],
                          spacing: {
                            before: 120,
                            after: 120
                          }
                        })
                      ],
                      borders: {
                        top: { style: BorderStyle.SINGLE, size: 1 },
                        bottom: { style: BorderStyle.SINGLE, size: 1 },
                        left: { style: BorderStyle.SINGLE, size: 1 },
                        right: { style: BorderStyle.SINGLE, size: 1 },
                      },
                      width: {
                        size: fixedColumnWidths.other,
                        type: WidthType.DXA
                      },
                      verticalAlign: "center"
                    })
                  ],
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