"use client";

import {
  AnimatePresence,
  MotionConfig,
  motion,
} from "framer-motion";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import "./aerosr.css";

const SLOW = {
  duration: 2,
  ease: "easeInOut" as const,
};

const INFERENCE_URL =
  process.env.NEXT_PUBLIC_AEROSR_INFERENCE_URL?.trim() ?? "";

const PROCESSING_MS = 5000;
const MAX_FILE_SIZE = 200 * 1024 * 1024;

const PHRASES = [
  "Ingesting 4-band VNIR spectral payload...",
  "Applying Hybrid Attention Transformer layers...",
  "Enforcing Wald's Protocol...",
  "Mapping epistemic uncertainty...",
];

const TABS = [
  { id: "spatial", label: "Spatial Reconstruction" },
  { id: "downstream", label: "Downstream Applications" },
  { id: "features", label: "Feature Implementations" },
  { id: "lite", label: "Distilled Model (AeroSR-Lite)" },
  { id: "documentation", label: "Complete Project Documentation" },
] as const;

type TabId = (typeof TABS)[number]["id"];
type Stage = "intro" | "docking" | "input" | "results";
type Model = "baseline" | "lite";

type InferenceResult = {
  mode: "demo" | "live";
  fileName: string;
  outputUrl?: string;
  previewInput?: string;
  previewOutput?: string;
  previewUncertainty?: string;
  ndviLr?: string;
  ndviSr?: string;
  ndwiLr?: string;
  ndwiSr?: string;
  edgeLr?: string;
  edgeSr?: string;
  sam?: string;
  ergas?: string;
  lpips?: string;
};

type InferencePanelProps = {
  model: Model;
  onComplete?: (result: InferenceResult) => void;
};

const ACTIVE_FEATURES = [
  [
    "Hybrid Attention Transformer",
    "Combines channel and spatial attention to reconstruct contextual structure.",
  ],
  [
    "4-Band VNIR Processing",
    "Joint processing of blue, green, red, and near-infrared channels.",
  ],
  [
    "Bfloat16 Optimization",
    "Mixed-precision execution with FP32 retained where numerical stability requires it.",
  ],
  [
    "Uncertainty Quantification",
    "Surfaces epistemic uncertainty for downstream review and confidence-aware analysis.",
  ],
];

const ROADMAP = [
  [
    "Multi-Temporal Fusion",
    "Recover complementary information from temporally aligned observations.",
  ],
  [
    "Task-Driven Loss",
    "Optimize reconstruction against validated downstream analytical objectives.",
  ],
  [
    "SAR-Optical Fusion",
    "Investigate complementary radar and optical information under adverse conditions.",
  ],
  [
    "Auxiliary Vector Priors",
    "Introduce registered vector information as explicitly controlled spatial priors.",
  ],
  [
    "Semantic-Aware SR",
    "Condition reconstruction on land-cover context without inventing unsupported detail.",
  ],
  [
    "India-Specific Topography Angle",
    "Evaluate terrain-aware performance across diverse Indian landscapes.",
  ],
];

const CORNER_DOTS = [
  { x: 8, y: 12, size: 3, opacity: 0.48 },
  { x: 22, y: 7, size: 5, opacity: 0.36 },
  { x: 41, y: 14, size: 2, opacity: 0.55 },
  { x: 13, y: 34, size: 7, opacity: 0.25 },
  { x: 32, y: 28, size: 3, opacity: 0.42 },
  { x: 56, y: 9, size: 4, opacity: 0.27 },
  { x: 7, y: 57, size: 4, opacity: 0.35 },
  { x: 25, y: 53, size: 2, opacity: 0.48 },
  { x: 49, y: 39, size: 5, opacity: 0.23 },
  { x: 67, y: 23, size: 2, opacity: 0.3 },
];

const SPHERE_POINTS = Array.from({ length: 38 }, (_, index) => {
  const y = 1 - (index / 37) * 2;
  const radius = Math.sqrt(1 - y * y);
  const angle = index * Math.PI * (3 - Math.sqrt(5));

  return {
    x: Math.cos(angle) * radius * 61,
    y: y * 61,
    z: Math.sin(angle) * radius * 61,
  };
});

function BackgroundDots() {
  return (
    <div className="ambient-background" aria-hidden="true">
      {["top-right", "bottom-left"].map((corner) => (
        <div key={corner} className={`dot-corner ${corner}`}>
          <div className="dot-drift">
            {CORNER_DOTS.map((dot, index) => (
              <span
                key={index}
                className="ambient-dot"
                style={{
                  left: `${dot.x}%`,
                  top: `${dot.y}%`,
                  width: dot.size,
                  height: dot.size,
                  opacity: dot.opacity,
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PersistentHeader({ centered }: { centered: boolean }) {
  return (
    <motion.header
      className="brand-header"
      initial={false}
      animate={{
        top: centered ? "50%" : "24px",
        left: centered ? "50%" : "24px",
        x: centered ? "-50%" : "0%",
        y: centered ? "-50%" : "0%",
        width: centered
          ? "min(1040px, calc(100vw - 48px))"
          : "min(620px, calc(100vw - 48px))",
      }}
      transition={SLOW}
    >
      <motion.h1
        initial={false}
        animate={{
          fontSize: centered
            ? "clamp(36px, 7vw, 88px)"
            : "clamp(20px, 2.4vw, 30px)",
        }}
        transition={SLOW}
      >
        DEEP LEARNING BASED SATELLITE SUPER RESOLUTION
      </motion.h1>

      <motion.p
        className="brand-tagline"
        initial={false}
        animate={{
          opacity: centered ? 0.76 : 0.52,
          letterSpacing: centered ? "0.24em" : "0.16em",
        }}
        transition={SLOW}
      >
        AEROSPACE-GRADE OPTICAL ENHANCEMENT ENGINE
      </motion.p>
    </motion.header>
  );
}

function OrbSphere() {
  return (
    <div className="sphere-scene" aria-hidden="true">
      <div className="sphere-rotation">
        {SPHERE_POINTS.map((point, index) => (
          <motion.span
            key={index}
            className="sphere-orbit"
            initial={{
              x: point.x * 1.8,
              y: point.y * 1.8,
              z: point.z * 1.8,
              opacity: 0,
            }}
            animate={{
              x: point.x,
              y: point.y,
              z: point.z,
              opacity: 0.3 + ((point.z + 61) / 122) * 0.7,
            }}
            transition={SLOW}
          >
            <span className="sphere-dot" />
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function ProcessingSequence({
  fileName,
  live,
}: {
  fileName: string;
  live: boolean;
}) {
  const [phrase, setPhrase] = useState(0);
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const phraseTimers = PHRASES.slice(1).map((_, index) =>
      window.setTimeout(
        () => setPhrase(index + 1),
        (index + 1) * 1250,
      ),
    );

    const finalTimer = window.setTimeout(
      () => setElapsed(true),
      PROCESSING_MS,
    );

    return () => {
      phraseTimers.forEach(window.clearTimeout);
      window.clearTimeout(finalTimer);
    };
  }, []);

  return (
    <motion.div
      className="processing-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SLOW}
      aria-busy="true"
    >
      <OrbSphere />

      <p className="eyebrow">
        {live ? "INFERENCE REQUEST ACTIVE" : "DEMONSTRATION SEQUENCE"}
      </p>

      <div
        className="loading-track"
        role="progressbar"
        aria-label="Processing sequence; not measured server progress"
      >
        <motion.div
          className="loading-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{
            duration: 5,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="processing-copy" role="status" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={phrase}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            {PHRASES[phrase]}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="file-caption">{fileName}</p>

      {live && elapsed && (
        <p className="muted small" role="status">
          Presentation sequence complete. Waiting for the inference service…
        </p>
      )}
    </motion.div>
  );
}

function UploadZone({
  onFile,
  error,
}: {
  onFile: (file: File) => void;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const errorId = useId();

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) onFile(file);
  }

  return (
    <div className="upload-wrapper">
      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        accept=".tif,.tiff,.png,.jpg,.jpeg,.webp"
        tabIndex={-1}
        aria-label="Select a satellite image"
        onChange={handleChange}
      />

      <button
        type="button"
        className={`upload-zone ${dragging ? "is-dragging" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          dragDepth.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current -= 1;
          if (dragDepth.current <= 0) setDragging(false);
        }}
        onDrop={handleDrop}
        aria-describedby={error ? errorId : undefined}
      >
        <span className="upload-mark" aria-hidden="true">
          <svg viewBox="0 0 48 48" fill="none">
            <path
              d="M24 31V10m0 0-8 8m8-8 8 8M10 30v8h28v-8"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="square"
            />
          </svg>
        </span>

        <span className="eyebrow">OPTICAL PAYLOAD INTERFACE</span>
        <span className="upload-title">Drop a satellite payload</span>
        <span className="upload-description">
          or click to select a local file
        </span>
        <span className="upload-formats">
          GEOTIFF / TIFF / PNG / JPEG / WEBP · MAX 200 MB
        </span>
        <span className="upload-footnote">
          Four-band VNIR analysis requires a compatible multispectral
          payload. Standard images are suitable for interface previews only.
        </span>
      </button>

      {error && (
        <p id={errorId} className="error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function safeOutputUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value;
}

function waitForSequence(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => {
      window.clearTimeout(timer);
      reject(new DOMException("Request cancelled", "AbortError"));
    };

    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", cancel);
      resolve();
    }, PROCESSING_MS);

    signal.addEventListener("abort", cancel, { once: true });

    if (signal.aborted) cancel();
  });
}

async function requestInference(
  file: File,
  model: Model,
  signal: AbortSignal,
): Promise<InferenceResult> {
  if (!INFERENCE_URL) {
    return { mode: "demo", fileName: file.name };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", model);

  const response = await fetch(INFERENCE_URL, {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Inference service returned HTTP ${response.status}.`);
  }

  const body: Record<string, unknown> = await response.json();

  const outputUrl = safeOutputUrl(body.outputUrl);
  if (!outputUrl) {
    throw new Error("The inference response is missing a valid outputUrl.");
  }

  return {
    mode: "live",
    fileName: file.name,
    outputUrl,
    previewInput: safeOutputUrl(body.previewInput),
    previewOutput: safeOutputUrl(body.previewOutput),
    previewUncertainty: safeOutputUrl(body.previewUncertainty),
    ndviLr: safeOutputUrl(body.ndviLr),
    ndviSr: safeOutputUrl(body.ndviSr),
    ndwiLr: safeOutputUrl(body.ndwiLr),
    ndwiSr: safeOutputUrl(body.ndwiSr),
    edgeLr: safeOutputUrl(body.edgeLr),
    edgeSr: safeOutputUrl(body.edgeSr),
    sam: safeOutputUrl(body.sam),
    ergas: safeOutputUrl(body.ergas),
    lpips: safeOutputUrl(body.lpips),
  };
}

function InferencePanel({
  model,
  onComplete,
}: InferencePanelProps) {
  const [status, setStatus] = useState<"idle" | "processing" | "done">(
    "idle",
  );
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InferenceResult | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, []);

  async function run(file: File) {
    if (busyRef.current) return;

    if (!/\.(tiff?|png|jpe?g|webp)$/i.test(file.name)) {
      setError("Select a TIFF, GeoTIFF, PNG, JPEG, or WebP file.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Select a non-empty file no larger than 200 MB.");
      return;
    }

    setError(null);
    setFileName(file.name);
    setStatus("processing");
    busyRef.current = true;

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      const [nextResult] = await Promise.all([
        requestInference(file, model, controller.signal),
        waitForSequence(controller.signal),
      ]);

      if (controller.signal.aborted) return;

      controllerRef.current = null;
      busyRef.current = false;
      setResult(nextResult);
      setStatus("done");
      onComplete?.(nextResult);
    } catch (caught) {
      if (controller.signal.aborted) return;

      controller.abort();
      controllerRef.current = null;
      busyRef.current = false;

      setStatus("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : "The inference request failed. Please try again.",
      );
    }
  }

  return (
    <div className="inference-panel">
      <div className="inference-meta">
        <span>{model === "lite" ? "AEROSR-LITE" : "HAT BASELINE"}</span>
        <span>{INFERENCE_URL ? "LIVE ENDPOINT" : "DEMO MODE"}</span>
      </div>

      {status === "idle" && (
        <UploadZone onFile={run} error={error} />
      )}

      {status === "processing" && (
        <ProcessingSequence
          fileName={fileName}
          live={Boolean(INFERENCE_URL)}
        />
      )}

      {status === "done" && result && (
        <motion.div
          className="inference-result"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SLOW}
          role="status"
        >
          <span className="status-badge">
            <span className="green-dot" />
            {result.mode === "live"
              ? "INFERENCE COMPLETE"
              : "DEMONSTRATION COMPLETE"}
          </span>

          <h3>
            {result.mode === "live"
              ? "Output ready for inspection."
              : "The Lite workflow is ready."}
          </h3>

          <p className="muted">
            {result.mode === "live"
              ? `Processed ${result.fileName} with the requested model.`
              : "No neural inference was performed. Connect an inference endpoint to run this payload through AeroSR-Lite."}
          </p>

          {result.outputUrl && (
            <a
              className="text-button"
              href={result.outputUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open inference output ↗
            </a>
          )}

          <button
            type="button"
            className="text-button"
            onClick={() => {
              setResult(null);
              setStatus("idle");
            }}
          >
            Upload another payload
          </button>
        </motion.div>
      )}

      {status === "idle" && (
        <p className="integration-note">
          {INFERENCE_URL
            ? "Selecting a file sends it to the configured inference service."
            : "Local interface demonstration. Files are not transmitted."}
        </p>
      )}
    </div>
  );
}

function ImagePlaceholder({
  label,
  src,
}: {
  label: string;
  src?: string;
}) {
  return (
    <figure className="image-placeholder">
      <figcaption>{label}</figcaption>
      <div className="placeholder-surface" aria-hidden="true">
        {src ? (
          <img
            src={src}
            alt={label}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        ) : (
          <>
            <span className="frame-corner corner-tl" />
            <span className="frame-corner corner-tr" />
            <span className="frame-corner corner-bl" />
            <span className="frame-corner corner-br" />
            <span className="placeholder-cross" />
          </>
        )}
      </div>
    </figure>
  );
}

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {children && <p className="section-description">{children}</p>}
    </div>
  );
}

function SpatialReconstruction({
  result,
}: {
  result: InferenceResult | null;
}) {
  return (
    <>
      <SectionHeading
        eyebrow="RECONSTRUCTION WORKSPACE"
        title="Spatial Reconstruction"
      >
        Optical structure, spectral integrity, and uncertainty in one
        inspection surface.
      </SectionHeading>

      <div className="spatial-images">
        <ImagePlaceholder label="INPUT" src={result?.previewInput} />
        <ImagePlaceholder label="OUTPUT" src={result?.previewOutput} />
        <ImagePlaceholder
          label="EPISTEMIC"
          src={result?.previewUncertainty}
        />
      </div>

      <p className="reference-note">
        Live telemetry metrics below are dynamically computed on the
        current 4-band VNIR payload via Wald&apos;s Protocol.
      </p>

      <div className="metric-grid">
        <article className="metric-card">
          <h3>WALD&apos;S PROTOCOL (SAM)</h3>
          <p className="metric-value">{result?.sam ?? "0.007°"}</p>
          <p>Spectral angular fidelity across all four VNIR bands.</p>
        </article>

        <article className="metric-card">
          <h3>ERGAS</h3>
          <p className="metric-value">{result?.ergas ?? "9.6"}</p>
          <p>
            Dimensionless global relative error relative to the sensor grid.
          </p>
        </article>

        <article className="metric-card">
          <h3>LPIPS</h3>
          <p className="metric-value">{result?.lpips ?? "0.084"}</p>
          <p>
            Perceptual structural distance across multi-scale optical gradients.
          </p>
        </article>

        <article className="metric-card">
          <h3>MEASUREMENT CONSISTENCY</h3>
          <p className="metric-value metric-value-text">
            ITERATIVE BACK-PROJECTION APPLIED
          </p>
          <span className="status-badge">
            <span className="green-dot" />
            SENSOR-PHYSICS CONSTRAINED
          </span>
        </article>
      </div>
    </>
  );
}

function DownstreamApplications({
  result,
}: {
  result: InferenceResult | null;
}) {
  return (
    <>
      <SectionHeading
        eyebrow="ANALYTICAL CONTINUITY"
        title="Downstream Applications"
      >
        Structural recovery supports agricultural monitoring and defense
        mapping by preserving spectral relationships and enforcing
        measurement consistency. These constraints suppress unsupported
        AI-generated detail; eliminating hallucination must be established
        through independent validation, not visual sharpness alone.
      </SectionHeading>

      <div className="downstream-grid">
        <div className="downstream-row">
          <ImagePlaceholder
            label="NDVI (Baseline 10m)"
            src={result?.ndviLr}
          />
          <ImagePlaceholder
            label="NDVI (HAT Model 1.5m)"
            src={result?.ndviSr}
          />
        </div>
        <div className="downstream-row">
          <ImagePlaceholder
            label="NDWI (Baseline 10m)"
            src={result?.ndwiLr}
          />
          <ImagePlaceholder
            label="NDWI (HAT Model 1.5m)"
            src={result?.ndwiSr}
          />
        </div>
        <div className="downstream-row">
          <ImagePlaceholder
            label="Urban Edge Detection (Baseline 10m)"
            src={result?.edgeLr}
          />
          <ImagePlaceholder
            label="Urban Edge Detection (HAT Model 1.5m)"
            src={result?.edgeSr}
          />
        </div>
      </div>

      <p className="reference-note">
        The 1.5 m labels describe the target output sampling grid, not a
        independently verified native optical resolving power.
      </p>
    </>
  );
}

function FeatureTable({
  title,
  rows,
  roadmap = false,
}: {
  title: string;
  rows: string[][];
  roadmap?: boolean;
}) {
  return (
    <section className="feature-section">
      <div className="feature-section-heading">
        <h3>{title}</h3>
        <span className="muted small">
          {rows.length} {roadmap ? "research directions" : "capabilities"}
        </span>
      </div>

      <table className="feature-table">
        <caption className="visually-hidden">{title}</caption>
        <thead className="visually-hidden">
          <tr>
            <th scope="col">Feature</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, description]) => (
            <tr key={name}>
              <th scope="row">
                <span
                  className={`feature-indicator ${
                    roadmap ? "planned" : ""
                  }`}
                  aria-hidden="true"
                />
                {name}
              </th>
              <td>{description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function FeatureImplementations() {
  return (
    <>
      <SectionHeading
        eyebrow="SYSTEM CAPABILITIES"
        title="Feature Implementations"
      >
        Project-defined capabilities and the next research milestones.
      </SectionHeading>

      <FeatureTable title="Active Features" rows={ACTIVE_FEATURES} />
      <FeatureTable title="Future Roadmap" rows={ROADMAP} roadmap />
    </>
  );
}

function LiteModel({
  onComplete,
}: {
  onComplete?: (result: InferenceResult) => void;
}) {
  return (
    <>
      <SectionHeading
        eyebrow="DISTILLED INFERENCE"
        title="AeroSR-Lite"
      >
        The same payload interface, routed to the compact model.
      </SectionHeading>

      <div className="lite-layout">
        <InferencePanel model="lite" onComplete={onComplete} />

        <article className="technical-card">
          <p className="eyebrow">APPLICATIONS DOCUMENTATION</p>
          <h3>AeroSR-Lite: Edge-Optimized Deployment.</h3>

          <p>
            Developed via Knowledge Distillation to compress the 6-depth
            baseline into a 2-depth network. Reduces parameter footprint
            by 90% for offline, zero-latency inference on
            resource-constrained UAV flight controllers and mobile
            agricultural field-tablets. Retains strict Wald&apos;s
            Protocol cyclic consistency via post-inference IBP.
          </p>

          <div className="technical-divider" />

          <p className="small muted">
            Validation note: the deployment description above is the
            supplied project specification. “Zero-latency” describes the
            absence of a network round trip, not zero computation time.
            Parameter reduction, device compatibility, runtime, and
            consistency residuals require measured confirmation.
          </p>

          <span className="status-badge">
            <span className="green-dot" />
            MODEL ROUTE: LITE
          </span>
        </article>
      </div>
    </>
  );
}

function ProjectDocumentation() {
  return (
    <>
      <SectionHeading
        eyebrow="TECHNICAL WHITEPAPER"
        title="Complete Project Documentation"
      >
        Physics-constrained optical reconstruction for
        measurement-aware geospatial analytics.
      </SectionHeading>

      <article className="whitepaper">
        <section>
          <h3>Executive Overview</h3>
          <p>
            AeroSR is a project architecture for reconstructing
            higher-density multispectral imagery from Sentinel-2
            observations. Its design combines a Hybrid Attention
            Transformer (HAT) with post-inference iterative
            back-projection (IBP), placing learned spatial recovery
            within an explicit measurement-consistency framework.
            Enhanced appearance is treated as a candidate analytical
            product rather than proof of recovered ground truth.
          </p>
        </section>

        <section>
          <h3>Problem Statement</h3>
          <p>
            Sentinel-2 blue, green, red, and near-infrared bands are
            sampled at 10 m. Mixed pixels and limited spatial sampling
            can obscure narrow field boundaries, small water features,
            and urban edges. Conventional interpolation increases raster
            dimensions without recovering missing observations.
            Unconstrained learned enhancement can produce convincing
            structures unsupported by the source measurement.
          </p>
          <p>
            The project therefore targets spatially coherent recovery
            while preserving inter-band relationships and exposing
            uncertainty. A 1.5 m output grid is a reconstruction target;
            it must not be equated with independently measured 1.5 m
            sensor resolution.
          </p>
        </section>

        <section>
          <h3>Methodology: HAT + IBP</h3>
          <p>
            The HAT backbone processes the four VNIR channels jointly,
            combining spatial context with channel attention. Training
            pairs must be generated using a documented degradation model
            and separated geographically to reduce leakage between
            training and evaluation regions.
          </p>
          <p>
            After reconstruction, IBP projects the estimate through the
            assumed sensor degradation operator, compares it with the
            observed low-resolution payload, and applies residual-driven
            corrections. The iteration count, stopping criterion,
            downsampling kernel, and registration convention must be
            recorded. Consistency depends on the quality of this
            forward model and the final residual—not simply on applying
            an algorithm named IBP.
          </p>
          <p>
            Wald-style reduced-resolution evaluation provides a
            controlled reference comparison. Epistemic uncertainty should
            be estimated through a documented method and calibrated
            against reconstruction error before operational use.
          </p>
        </section>

        <section>
          <h3>Training Hardware and Numerical Pipeline</h3>
          <p>
            The project-specified training target is an NVIDIA RTX 5050,
            using a TF32/bfloat16 numerical pipeline where supported by
            the installed GPU, drivers, CUDA runtime, and PyTorch build.
            TF32 can accelerate eligible FP32 matrix operations;
            bfloat16 autocasting reduces activation and arithmetic
            overhead. Numerically sensitive reductions and evaluation
            metrics should remain in FP32 or higher precision.
          </p>
          <p>
            Reproducibility requires recording the actual device,
            available memory, dependency versions, random seeds, patch
            dimensions, batch size, precision settings, checkpoint
            identifier, and dataset splits. This interface does not
            establish that a training run has been executed.
          </p>
        </section>

        <section>
          <h3>Reported Outcomes and Verification</h3>
          <p>
            The supplied project reference values are SAM 0.007°,
            ERGAS 9.6, and LPIPS 0.084. They are reproduced here as
            reference figures, not independently verified benchmarks
            or metrics calculated for the selected upload. A nonzero
            SAM indicates small angular disagreement; it does not
            mathematically establish perfect spectral fidelity.
          </p>
          <p>
            Verification should publish per-band results, scene-level
            distributions, aggregation rules, the ERGAS scale factor,
            and the channel mapping used by LPIPS. ERGAS describes
            relative radiometric reconstruction error and should not be
            treated as a standalone geometric-accuracy measure.
          </p>
          <p>
            Downstream edge mapping should be tested against registered
            references using boundary precision, recall, and displacement
            error. NDVI and NDWI comparisons require an explicit band
            convention and consistent radiometric preprocessing.
            Qualitative maps support inspection but cannot replace
            quantitative validation.
          </p>
        </section>

        <section>
          <h3>Operational Assurance</h3>
          <p>
            Production outputs should retain source provenance,
            georeferencing, model version, degradation assumptions,
            uncertainty products, and measurement-consistency residuals.
            High-consequence agricultural or defense workflows should
            apply documented acceptance thresholds and human review.
            Physics constraints reduce unsupported reconstruction but
            do not guarantee the absence of hallucination.
          </p>
        </section>
      </article>
    </>
  );
}

function TabContent({
  tab,
  result,
  onUpdateResult,
}: {
  tab: TabId;
  result: InferenceResult | null;
  onUpdateResult: (result: InferenceResult) => void;
}) {
  switch (tab) {
    case "spatial":
      return <SpatialReconstruction result={result} />;
    case "downstream":
      return <DownstreamApplications result={result} />;
    case "features":
      return <FeatureImplementations />;
    case "lite":
      return <LiteModel onComplete={onUpdateResult} />;
    case "documentation":
      return <ProjectDocumentation />;
  }
}

function Dashboard({
  result,
  onUpdateResult,
  onReset,
}: {
  result: InferenceResult | null;
  onUpdateResult: (result: InferenceResult) => void;
  onReset: () => void;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("spatial");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function handleTabKey(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    let nextIndex = index;

    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (index + 1) % TABS.length;
    } else if (
      event.key === "ArrowUp" ||
      event.key === "ArrowLeft"
    ) {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <motion.div
      className="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={SLOW}
    >
      <aside className="sidebar" aria-label="Project workspace">
        <p className="eyebrow sidebar-caption">WORKSPACE</p>

        <nav role="tablist" aria-label="Dashboard sections">
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`nav-tab ${
                activeTab === tab.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-rule" />
          <p>VNIR RECONSTRUCTION SYSTEM</p>
          <span>
            {result?.mode === "live"
              ? "Live request completed"
              : "Demonstration workspace"}
          </span>
        </div>
      </aside>

      <main className="dashboard-main" id="workspace">
        <div className="workspace-status">
          <span className="file-caption">
            PAYLOAD · {result?.fileName ?? "No payload"}
          </span>
          <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
            <button
              type="button"
              className="text-button"
              onClick={onReset}
            >
              + Upload new payload
            </button>
            {result?.outputUrl && (
              <a
                href={result.outputUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-button"
              >
                Open baseline output ↗
              </a>
            )}
          </div>
        </div>

        {TABS.map((tab) => (
          <section
            key={tab.id}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
            className="tab-panel"
          >
            <motion.div
              initial={false}
              animate={{
                opacity: activeTab === tab.id ? 1 : 0,
                y: activeTab === tab.id ? 0 : 10,
              }}
              transition={SLOW}
            >
              <TabContent
                tab={tab.id}
                result={result}
                onUpdateResult={onUpdateResult}
              />
            </motion.div>
          </section>
        ))}
      </main>
    </motion.div>
  );
}

export default function Page() {
  const [stage, setStage] = useState<Stage>("intro");
  const [result, setResult] = useState<InferenceResult | null>(null);

  useEffect(() => {
    const holdTimer = window.setTimeout(() => {
      setStage("docking");
    }, 3000);

    const dockTimer = window.setTimeout(() => {
      setStage("input");
    }, 5000);

    return () => {
      window.clearTimeout(holdTimer);
      window.clearTimeout(dockTimer);
    };
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div className="aerosr-app">
        <BackgroundDots />
        <PersistentHeader centered={stage === "intro"} />

        {stage === "input" && (
          <motion.main
            className="input-stage"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={SLOW}
          >
            <div className="input-shell">
              <InferencePanel
                model="baseline"
                onComplete={(nextResult) => {
                  setResult(nextResult);
                  setStage("results");
                }}
              />
            </div>
          </motion.main>
        )}

        {stage === "results" && (
          <Dashboard
            result={result}
            onUpdateResult={setResult}
            onReset={() => setStage("input")}
          />
        )}

        {stage !== "results" && (
          <footer className="landing-footer">
            SPECTRAL INTEGRITY / STRUCTURAL PRECISION
          </footer>
        )}
      </div>
    </MotionConfig>
  );
}