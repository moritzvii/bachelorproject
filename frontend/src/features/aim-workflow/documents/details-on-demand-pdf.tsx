



import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { motion } from "framer-motion";
import {
  FileText,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FileSymlink,
} from "lucide-react";

import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import * as pdfjs from "pdfjs-dist";
import "pdfjs-dist/web/pdf_viewer.css";
import { TextLayerBuilder } from "pdfjs-dist/web/pdf_viewer.mjs";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl as unknown as string;

type NormalizedHighlightRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: "ratio" | "px";
};

type NormalizedHighlight = {
  page: number;
  rects: NormalizedHighlightRect[];
  color: string;
  label: string;
  kind: "text" | "visual";
};

type HighlightOverlayRect = {
  key: string;
  style: { left: number; top: number; width: number; height: number };
  color: string;
  label?: string;
  kind: "text" | "visual";
};

export type DetailsOnDemandPDFProps = {
  src: string;
  title?: string;
  triggerLabel?: string;
  initialScale?: number;
  className?: string;
  buttonVariant?: React.ComponentProps<typeof Button>["variant"];
  showTriggerIcon?: boolean;
  pageShortcuts?: Array<{ page: number; label?: string }>;
  highlights?: Array<{
    page: number;
    rects: Array<{ x: number; y: number; width: number; height: number; unit?: "ratio" | "px" }>;
    color?: string;
    label?: string;
    kind?: "text" | "visual";
  }>;
};

export default function DetailsOnDemandPDF({
  src,
  title = "Source Document",
  triggerLabel = "Details on demand",
  initialScale = 1,
  className,
  buttonVariant = "outline",
  showTriggerIcon = true,
  pageShortcuts,
  highlights,
}: DetailsOnDemandPDFProps) {
  const [open, setOpen] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(initialScale);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfVersion, setPdfVersion] = useState<number>(0);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const textLayerContainerRef = useRef<HTMLDivElement>(null);
  const textLayerBuilderRef = useRef<TextLayerBuilder | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjs.PDFDocumentProxy | null>(null);
  const pendingPageRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const loadingTask = pdfjs.getDocument({ url: src, withCredentials: false });
        const pdf = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setPageNumber(() => {
          const pending = pendingPageRef.current;
          if (pending) {
            const clamped = Math.min(Math.max(1, pending), pdf.numPages);
            pendingPageRef.current = clamped;
            return clamped;
          }
          return 1;
        });
        setPdfVersion((version) => version + 1);
      } catch (error: unknown) {
        console.error(error);
        setError("Unable to load PDF.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open, src]);

  useEffect(() => {
    let cancelled = false;
    let renderTask: pdfjs.RenderTask | null = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      const pdf = pdfDocRef.current;
      if (!canvas || !pdf || cancelled || !open) return;
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled) return;
        const rotation = ((page.rotate ?? 0) + 360) % 360;
        const viewport = page.getViewport({ scale, rotation });
        const context = canvas.getContext("2d");
        if (!context) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        const transform = dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined;
        renderTask = page.render({ canvasContext: context, viewport, transform, canvas });
        await renderTask.promise;
        if (cancelled) return;

        if (!cancelled) {
          setViewportSize((current) => {
            const next = { width: viewport.width, height: viewport.height };
            if (current && Math.abs(current.width - next.width) < 0.5 && Math.abs(current.height - next.height) < 0.5) {
              return current;
            }
            return next;
          });
        }

        const textLayerContainer = textLayerContainerRef.current;
        if (textLayerContainer) {
          textLayerContainer.innerHTML = "";
          textLayerBuilderRef.current?.cancel();
          textLayerBuilderRef.current = null;
          const textLayerBuilder = new TextLayerBuilder({ pdfPage: page });
          const textLayerElement = textLayerBuilder.div;
          textLayerElement.style.width = `${viewport.width}px`;
          textLayerElement.style.height = `${viewport.height}px`;
          textLayerElement.style.pointerEvents = "auto";
          textLayerElement.style.zIndex = "1";
          textLayerContainer.append(textLayerElement);
          try {
            await textLayerBuilder.render({ viewport });
            if (cancelled) {
              textLayerBuilder.cancel();
            } else {
              textLayerBuilderRef.current = textLayerBuilder;
            }
          } catch (renderError) {
            if (!cancelled) {
              console.error(renderError);
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
        }
      }
    }
    renderPage();
    return () => {
      cancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
      textLayerBuilderRef.current?.cancel();
      textLayerBuilderRef.current = null;
    };
  }, [pageNumber, scale, open, pdfVersion]);

  useEffect(() => {
    pendingPageRef.current = pageNumber;
  }, [pageNumber]);

  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    const pdf = pdfDocRef.current;
    if (!el || !pdf) return;

    const fitToWidth = async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const bbox = el.getBoundingClientRect();
        const styles = window.getComputedStyle(el);
        const paddingX =
          parseFloat(styles.paddingLeft || "0") + parseFloat(styles.paddingRight || "0");
        const paddingY =
          parseFloat(styles.paddingTop || "0") + parseFloat(styles.paddingBottom || "0");
        const availableWidth = Math.max(200, bbox.width - paddingX);
        const availableHeight = Math.max(150, bbox.height - paddingY);
        if (!Number.isFinite(availableWidth) || availableWidth <= 0) return;

        const rotation = ((page.rotate ?? 0) + 360) % 360;
        const viewport = page.getViewport({ scale: 1, rotation });
        const widthScale = availableWidth / viewport.width;
        const heightScale =
          Number.isFinite(availableHeight) && availableHeight > 0
            ? availableHeight / viewport.height
            : widthScale;
        const nextScale = Math.min(2.5, Math.max(0.5, Math.min(widthScale, heightScale)));

        setScale((current) => (Math.abs(current - nextScale) < 0.01 ? current : nextScale));
      } catch {
        return;
      }
    };

    fitToWidth();
    const ro = new ResizeObserver(() => fitToWidth());
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, pageNumber, pdfVersion]);

  const canPrev = useMemo(() => pageNumber > 1, [pageNumber]);
  const canNext = useMemo(() => pageNumber < numPages, [pageNumber, numPages]);
  const normalizedShortcuts = useMemo(
    () =>
      (pageShortcuts ?? [])
        .map((shortcut) => {
          const page = Math.round(shortcut.page);
          if (!Number.isFinite(page) || page <= 0) return null;
          return {
            page,
            label: (shortcut.label ?? "").trim(),
          };
        })
        .filter((shortcut): shortcut is { page: number; label: string } => Boolean(shortcut))
        .sort((a, b) => a.page - b.page),
    [pageShortcuts],
  );

  const normalizedHighlights = useMemo<NormalizedHighlight[]>(() => {
    if (!highlights?.length) return [];
    return highlights
      .map((highlight) => {
        const page = Math.round(highlight.page);
        if (!Number.isFinite(page) || page <= 0) return null;
        const rects = (highlight.rects ?? [])
          .map((rect) => {
            const { x, y, width, height } = rect;
            if (
              !Number.isFinite(x) ||
              !Number.isFinite(y) ||
              !Number.isFinite(width) ||
              !Number.isFinite(height) ||
              width <= 0 ||
              height <= 0
            ) {
              return null;
            }
            const normalizedRect: NormalizedHighlightRect = {
              x,
              y,
              width,
              height,
              unit: rect.unit ?? "ratio",
            };
            return normalizedRect;
          })
          .filter((rect): rect is NormalizedHighlightRect => Boolean(rect));
        if (!rects.length) return null;
        const normalizedHighlight: NormalizedHighlight = {
          page,
          rects,
          color:
            highlight.color ??
            (highlight.kind === "visual" ? "rgba(59, 130, 246, 0.18)" : "rgba(252, 211, 77, 0.58)"),
          label: (highlight.label ?? "").trim(),
          kind: highlight.kind === "visual" ? "visual" : "text",
        };
        return normalizedHighlight;
      })
      .filter((highlight): highlight is NormalizedHighlight => Boolean(highlight));
  }, [highlights]);

  const overlayRects = useMemo<HighlightOverlayRect[]>(() => {
    if (!viewportSize) return [];
    const { width: vpWidth, height: vpHeight } = viewportSize;
    const result: HighlightOverlayRect[] = [];

    const scaleValue = (value: number, dimension: number, unit: "ratio" | "px") =>
      unit === "ratio" ? value * dimension : value;

    const activeHighlights = normalizedHighlights.filter((highlight) => highlight.page === pageNumber);

    activeHighlights.forEach((highlight, highlightIndex) => {
      highlight.rects.forEach((rect, rectIndex) => {
        const left = scaleValue(rect.x, vpWidth, rect.unit);
        const top = scaleValue(rect.y, vpHeight, rect.unit);
        const boxWidth = scaleValue(rect.width, vpWidth, rect.unit);
        const boxHeight = scaleValue(rect.height, vpHeight, rect.unit);

        if (
          !Number.isFinite(left) ||
          !Number.isFinite(top) ||
          !Number.isFinite(boxWidth) ||
          !Number.isFinite(boxHeight) ||
          boxWidth <= 0 ||
          boxHeight <= 0
        ) {
          return;
        }

        result.push({
          key: `${highlightIndex}-${rectIndex}`,
          style: {
            left: Math.max(0, left),
            top: Math.max(0, top),
            width: Math.max(0, Math.min(boxWidth, vpWidth - Math.max(0, left))),
            height: Math.max(0, Math.min(boxHeight, vpHeight - Math.max(0, top))),
          },
          color: highlight.color,
          label: rectIndex === 0 && highlight.label ? highlight.label : undefined,
          kind: highlight.kind,
        });
      });
    });

    return result;
  }, [normalizedHighlights, pageNumber, viewportSize]);

  const onPrev = () => canPrev && setPageNumber((p) => p - 1);
  const onNext = () => canNext && setPageNumber((p) => p + 1);
  const onZoomIn = () => setScale((s) => Math.min(2.5, s + 0.1));
  const onZoomOut = () => setScale((s) => Math.max(0.5, s - 0.1));
  const goToPage = (target: number) => {
    if (!Number.isFinite(target)) return;
    const normalized = Math.max(1, Math.round(target));
    pendingPageRef.current = normalized;
    const maxPage = numPages > 0 ? numPages : normalized;
    const next = Math.min(normalized, maxPage);
    setPageNumber(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} className={className}>
          {showTriggerIcon ? <FileText className="mr-2 h-4 w-4" /> : null}
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl w-[92vw] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3">
          <DialogTitle className="text-base font-medium">{title}</DialogTitle>
        </DialogHeader>
        <Separator />

        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!canPrev} onClick={onPrev} aria-label="Previous page">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Previous</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="text-xs tabular-nums min-w-[6rem] text-center select-none">
              Page {pageNumber} / {numPages || "–"}
            </div>

            {normalizedShortcuts.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 gap-2 px-3 text-xs bg-[hsl(var(--chart-3))] text-white hover:bg-[hsl(var(--chart-3))]/90"
                    aria-label="Page overview"
                  >
                    <FileSymlink className="h-3.5 w-3.5" />
                    Jump to Source
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  {normalizedShortcuts.map((shortcut) => (
                    <DropdownMenuItem
                      key={`${shortcut.page}-${shortcut.label}`}
                      onSelect={() => goToPage(shortcut.page)}
                      className="flex flex-col items-start gap-1 py-2"
                    >
                      <span className="text-sm font-medium leading-tight">Page {shortcut.page}</span>
                      {shortcut.label ? (
                        <span className="text-xs leading-tight text-muted-foreground">{shortcut.label}</span>
                      ) : null}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={!canNext} onClick={onNext} aria-label="Next page">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Next</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onZoomOut} aria-label="Zoom out">
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom out</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="w-28">
              <Slider
                value={[Math.round(scale * 100)]}
                onValueChange={(v) => setScale(v[0] / 100)}
                min={50}
                max={250}
                step={5}
              />
            </div>
            <div className="text-xs w-10 text-right tabular-nums select-none">{Math.round(scale * 100)}%</div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onZoomIn} aria-label="Zoom in">
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom in</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <Separator />

        <div ref={containerRef} className="relative px-3 pt-3 pb-6 max-h-[75vh] overflow-auto bg-muted/20">
          {error && (
            <div className="text-sm text-destructive px-3 py-2">{error}</div>
          )}
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-10 text-center text-sm text-muted-foreground">
              Loading source …
            </motion.div>
          )}
          <div className="flex justify-center">
            <div ref={canvasContainerRef} className="relative inline-block">
              <canvas ref={canvasRef} className="rounded-lg shadow-sm bg-background" />
              <div
                className="pointer-events-none absolute inset-0"
                style={
                  viewportSize
                    ? {
                        width: `${viewportSize.width}px`,
                        height: `${viewportSize.height}px`,
                        zIndex: 0,
                      }
                    : undefined
                }
              >
                {overlayRects.map((rect) => {
                  const isText = rect.kind === "text";
                  const className = isText
                    ? "pointer-events-none absolute rounded-sm mix-blend-multiply"
                    : "pointer-events-none absolute rounded-md ring-2 ring-primary/80 bg-primary/10 shadow-sm";
                  const style: CSSProperties = {
                    left: `${rect.style.left}px`,
                    top: `${rect.style.top}px`,
                    width: `${rect.style.width}px`,
                    height: `${rect.style.height}px`,
                    backgroundColor: rect.color,
                    boxShadow: isText ? "0 1px 6px rgba(17, 24, 39, 0.12)" : undefined,
                  };
                  return (
                    <div key={rect.key} className={className} style={style}>
                      {rect.label ? (
                        <span
                          className={`pointer-events-none absolute rounded px-1.5 py-0.5 text-[11px] font-medium leading-none shadow ${
                            isText
                              ? "-top-5 left-0 bg-primary text-primary-foreground"
                              : "bottom-1 left-1 bg-primary/95 text-primary-foreground"
                          }`}
                        >
                          {rect.label}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div
                ref={textLayerContainerRef}
                className="absolute inset-0"
                style={
                  viewportSize
                    ? {
                        width: `${viewportSize.width}px`,
                        height: `${viewportSize.height}px`,
                        pointerEvents: "auto",
                        zIndex: 1,
                      }
                    : { pointerEvents: "auto", zIndex: 1 }
                }
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
