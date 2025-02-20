import * as pdfjsLib from "pdfjs-dist";
import { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";

// Define types for our PDF text content
interface PDFTextItem extends TextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
  dir: string;
}

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export class PDFProcessor {
  private static instance: PDFProcessor;
  private isWorkerInitialized: boolean = false;

  private constructor() {
    this.initializeWorker();
  }

  public static getInstance(): PDFProcessor {
    if (!PDFProcessor.instance) {
      PDFProcessor.instance = new PDFProcessor();
    }
    return PDFProcessor.instance;
  }

  private async initializeWorker(): Promise<void> {
    if (!this.isWorkerInitialized) {
      try {
        await pdfjsLib.getDocument({ data: new Uint8Array(0) }).promise;
        this.isWorkerInitialized = true;
      } catch (error) {
        console.error("Failed to initialize PDF.js worker:", error);
        throw new Error("PDF.js worker initialization failed");
      }
    }
  }

  public async extractTextFromPDF(file: File): Promise<string> {
    try {
      // Ensure worker is initialized
      if (!this.isWorkerInitialized) {
        await this.initializeWorker();
      }

      // Read the file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Load the PDF document
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      let fullText = "";

      // Iterate through each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const pageText = await this.extractPageText(pdf, pageNum);
        fullText += pageText + "\n\n";
      }

      return this.cleanupText(fullText);
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw new Error("Failed to process PDF file");
    }
  }

  private async extractPageText(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNum: number,
  ): Promise<string> {
    try {
      const page = await pdf.getPage(pageNum);
      const textContent: TextContent = await page.getTextContent();

      return textContent.items
        .map((item: PDFTextItem) => this.processTextItem(item))
        .join(" ");
    } catch (error) {
      console.error(`Error extracting text from page ${pageNum}:`, error);
      return `[Error extracting text from page ${pageNum}]`;
    }
  }

  private processTextItem(item: PDFTextItem): string {
    // Handle different text item properties and transformations
    let text = item.str;

    // Remove any unusual whitespace or control characters
    text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    // Normalize spaces
    text = text.replace(/\s+/g, " ");

    return text;
  }

  private cleanupText(text: string): string {
    return (
      text
        // Remove multiple newlines
        .replace(/\n{3,}/g, "\n\n")
        // Remove multiple spaces
        .replace(/[ \t]+/g, " ")
        // Remove spaces at the beginning of lines
        .replace(/^\s+/gm, "")
        // Remove spaces at the end of lines
        .replace(/\s+$/gm, "")
        // Final trim
        .trim()
    );
  }
}

// Usage example:
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfProcessor = PDFProcessor.getInstance();
  return await pdfProcessor.extractTextFromPDF(file);
}
