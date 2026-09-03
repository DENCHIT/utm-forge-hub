import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type {
  BulletsContent,
  ChartContent,
  EmbedContent,
  ImageContent,
  QuoteContent,
  TableContent,
  TextContent,
  TitleContent,
  VideoContent,
} from "@/lib/types";

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const stagger = {
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.12 } },
};

export function Heading({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <motion.h2
      variants={rise}
      initial="hidden"
      animate="show"
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="font-display text-[2.4em] font-bold leading-[1.05] tracking-tight"
    >
      {children}
    </motion.h2>
  );
}

export function TitleSlide({ content }: { content: TitleContent }) {
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
      {content.background?.url && (
        <img
          src={content.background.url}
          alt={content.background.alt ?? ""}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-brand/25 via-transparent to-accent/25" />
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-[80%] text-center"
      >
        {content.eyebrow && (
          <motion.p
            variants={rise}
            className="mb-[0.8em] text-[0.85em] font-semibold uppercase tracking-[0.32em] text-brand"
          >
            {content.eyebrow}
          </motion.p>
        )}
        <motion.h1
          variants={rise}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-[3.6em] font-black leading-[0.98] tracking-tight"
        >
          {content.heading}
        </motion.h1>
        {content.subheading && (
          <motion.p variants={rise} className="mt-[0.7em] text-[1.35em] text-muted">
            {content.subheading}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export function TextSlide({ content }: { content: TextContent }) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col justify-center gap-[0.8em] px-[6%]",
        content.align === "centre" && "items-center text-center",
      )}
    >
      <Heading>{content.heading}</Heading>
      <motion.div
        variants={rise}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.5, delay: 0.1 }}
        className="max-w-[36ch] text-[1.5em] leading-[1.45] text-muted"
      >
        {content.body.split("\n\n").map((paragraph, i) => (
          <p key={i} className="mb-[0.6em] last:mb-0">
            {paragraph}
          </p>
        ))}
      </motion.div>
    </div>
  );
}

export function BulletsSlide({
  content,
  revealed,
}: {
  content: BulletsContent;
  /** How many bullets to show. Ignored unless content.reveal is set. */
  revealed?: number;
}) {
  const limit = content.reveal ? (revealed ?? content.items.length) : content.items.length;

  return (
    <div className="flex h-full w-full flex-col justify-center gap-[1em] px-[6%]">
      <Heading>{content.heading}</Heading>
      <motion.ul variants={stagger} initial="hidden" animate="show" className="space-y-[0.7em]">
        {content.items.slice(0, limit).map((item) => (
          <motion.li
            key={item}
            variants={rise}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-start gap-[0.6em] text-[1.5em] leading-[1.35]"
          >
            <span className="mt-[0.45em] h-[0.3em] w-[0.3em] shrink-0 rounded-full bg-brand" />
            <span>{item}</span>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
}

export function QuoteSlide({ content }: { content: QuoteContent }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-[10%] text-center">
      <motion.blockquote
        variants={rise}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.6 }}
        className="font-display text-[2.6em] font-semibold leading-[1.2]"
      >
        <span className="text-brand">&ldquo;</span>
        {content.quote}
        <span className="text-brand">&rdquo;</span>
      </motion.blockquote>
      {content.attribution && (
        <motion.cite
          variants={rise}
          initial="hidden"
          animate="show"
          transition={{ duration: 0.5, delay: 0.25 }}
          className="mt-[1em] text-[1.1em] not-italic text-muted"
        >
          {content.attribution}
        </motion.cite>
      )}
    </div>
  );
}

export function TableSlide({ content }: { content: TableContent }) {
  return (
    <div className="flex h-full w-full flex-col justify-center gap-[1em] px-[5%]">
      <Heading>{content.heading}</Heading>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[1.05em]">
          <thead>
            <tr className="border-b border-line">
              {content.columns.map((column, i) => (
                <th
                  key={column}
                  className={cn(
                    "px-[0.8em] py-[0.6em] text-left font-semibold uppercase tracking-wider text-muted",
                    i === content.highlightColumn && "text-brand",
                  )}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {content.rows.map((row, rowIndex) => (
              <motion.tr
                key={rowIndex}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + rowIndex * 0.06, duration: 0.4 }}
                className="border-b border-line/60"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={cn(
                      "px-[0.8em] py-[0.7em] tabular-nums",
                      cellIndex === content.highlightColumn && "font-bold text-brand",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Series colours fall back to the brand ramp so an unstyled chart still looks
// deliberate on stage.
const SERIES_COLOURS = [
  "hsl(var(--brand))",
  "hsl(var(--accent))",
  "hsl(var(--positive))",
  "hsl(var(--warning))",
  "hsl(var(--muted))",
];

export function ChartSlide({ content }: { content: ChartContent }) {
  const colourFor = (index: number, override?: string) =>
    override ?? SERIES_COLOURS[index % SERIES_COLOURS.length];

  const axisProps = {
    stroke: "hsl(var(--muted))",
    tick: { fill: "hsl(var(--muted))", fontSize: 14 },
    tickLine: false,
  };

  const tooltip = (
    <Tooltip
      cursor={{ fill: "hsl(var(--surface))" }}
      contentStyle={{
        background: "hsl(var(--surface))",
        border: "1px solid hsl(var(--line))",
        borderRadius: 12,
        color: "hsl(var(--ink))",
      }}
      formatter={(value: number) => `${value}${content.valueSuffix ?? ""}`}
    />
  );

  return (
    <div className="flex h-full w-full flex-col justify-center gap-[0.8em] px-[5%] py-[4%]">
      <Heading>{content.heading}</Heading>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {content.variant === "pie" ? (
            <PieChart>
              <Pie
                data={content.rows}
                dataKey={content.series[0]?.name ?? "value"}
                nameKey={content.categoryKey}
                innerRadius="45%"
                outerRadius="78%"
                paddingAngle={2}
                animationDuration={900}
              >
                {content.rows.map((_, i) => (
                  <Cell key={i} fill={colourFor(i)} />
                ))}
              </Pie>
              {tooltip}
              <Legend wrapperStyle={{ color: "hsl(var(--muted))" }} />
            </PieChart>
          ) : content.variant === "line" ? (
            <LineChart data={content.rows}>
              <CartesianGrid stroke="hsl(var(--line))" vertical={false} />
              <XAxis dataKey={content.categoryKey} {...axisProps} />
              <YAxis {...axisProps} />
              {tooltip}
              {content.series.map((series, i) => (
                <Line
                  key={series.name}
                  type="monotone"
                  dataKey={series.name}
                  stroke={colourFor(i, series.colour)}
                  strokeWidth={3}
                  dot={false}
                  animationDuration={900}
                />
              ))}
            </LineChart>
          ) : content.variant === "area" ? (
            <AreaChart data={content.rows}>
              <CartesianGrid stroke="hsl(var(--line))" vertical={false} />
              <XAxis dataKey={content.categoryKey} {...axisProps} />
              <YAxis {...axisProps} />
              {tooltip}
              {content.series.map((series, i) => (
                <Area
                  key={series.name}
                  type="monotone"
                  dataKey={series.name}
                  stroke={colourFor(i, series.colour)}
                  fill={colourFor(i, series.colour)}
                  fillOpacity={0.22}
                  strokeWidth={3}
                  animationDuration={900}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={content.rows}>
              <CartesianGrid stroke="hsl(var(--line))" vertical={false} />
              <XAxis dataKey={content.categoryKey} {...axisProps} />
              <YAxis {...axisProps} />
              {tooltip}
              {content.series.map((series, i) => (
                <Bar
                  key={series.name}
                  dataKey={series.name}
                  fill={colourFor(i, series.colour)}
                  radius={[8, 8, 0, 0]}
                  animationDuration={900}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      {content.caption && <p className="text-[0.85em] text-muted">{content.caption}</p>}
    </div>
  );
}

export function ImageSlide({ content }: { content: ImageContent }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[0.8em] p-[3%]">
      <Heading>{content.heading}</Heading>
      <motion.img
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        src={content.media.url}
        alt={content.media.alt ?? ""}
        className={cn(
          "min-h-0 flex-1 rounded-card",
          content.fit === "cover" ? "h-full w-full object-cover" : "max-h-full object-contain",
        )}
      />
      {content.caption && <p className="text-[0.85em] text-muted">{content.caption}</p>}
    </div>
  );
}

export function VideoSlide({ content, active }: { content: VideoContent; active: boolean }) {
  // Only the slide currently on screen is allowed to play, so navigating away
  // stops the audio rather than leaving it running behind the next slide.
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-[0.8em] p-[3%]">
      <Heading>{content.heading}</Heading>
      {active && (
        <video
          key={content.url}
          src={content.url}
          poster={content.poster}
          autoPlay={content.autoplay ?? true}
          loop={content.loop}
          muted={content.muted ?? false}
          controls
          playsInline
          className="min-h-0 max-h-full flex-1 rounded-card"
        />
      )}
    </div>
  );
}

export function EmbedSlide({ content, active }: { content: EmbedContent; active: boolean }) {
  return (
    <div className="flex h-full w-full flex-col gap-[0.8em] p-[3%]">
      <Heading>{content.heading}</Heading>
      {active && (
        <iframe
          src={content.url}
          title={content.heading ?? "Embedded content"}
          className="min-h-0 w-full flex-1 rounded-card border border-line"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
