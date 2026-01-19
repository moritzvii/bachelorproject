declare module "pdfjs-dist/web/pdf_viewer.mjs" {
  export class TextLayerBuilder {
    constructor(options: { pdfPage: unknown });
    div: HTMLDivElement;
    cancel(): void;
    render(options: { viewport: unknown }): Promise<void>;
  }
}
