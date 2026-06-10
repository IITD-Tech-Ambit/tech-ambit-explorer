import { useEffect, useRef, useState } from "react";
import {
    forceSimulation,
    forceManyBody,
    forceLink,
    forceCenter,
    forceCollide,
    forceX,
    forceY,
    type Simulation,
    type SimulationNodeDatum,
    type SimulationLinkDatum,
    type ForceLink,
} from "d3-force";
import { Search } from "lucide-react";

const STATUS_MESSAGES = [
    "Establishing connections…",
    "Cross-referencing authors…",
    "Mapping citation network…",
    "Isolating relevant nodes…",
    "Ranking by relevance…",
    "Compiling results…",
];

const RETICLE_LABELS = ["MATCH FOUND", "ANALYZING", "LINKED", "RELEVANT", "CROSS-REF", "MAPPED"];

interface GNode extends SimulationNodeDatum {
    id: number;
    r: number;
    born: number;
    tone: 0 | 1; // 0 = primary, 1 = accent
}
type GLink = SimulationLinkDatum<GNode>;

const heightFor = (w: number) => (w < 480 ? 280 : w < 768 ? 320 : 380);
const capFor = (w: number) => (w < 480 ? 26 : w < 768 ? 40 : 56);

const randHex = (len: number) =>
    Array.from({ length: len }, () => "0123456789ABCDEF"[Math.floor(Math.random() * 16)]).join("");

const readVar = (name: string) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return (alpha = 1) => `hsl(${raw || "0 0% 50%"} / ${alpha})`;
};

const ExploreSearchLoader = ({ query }: { query?: string }) => {
    const [messageIdx, setMessageIdx] = useState(0);
    const [nodeCount, setNodeCount] = useState(3);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const msg = setInterval(() => {
            setMessageIdx((prev) => (prev + 1) % STATUS_MESSAGES.length);
        }, 1800);
        return () => clearInterval(msg);
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const wrap = wrapRef.current;
        if (!canvas || !wrap) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const isDark = document.documentElement.classList.contains("dark");

        const A = {
            grid: isDark ? 0.08 : 0.05,
            edge: isDark ? 0.5 : 0.32,
            node: isDark ? 0.95 : 0.85,
            pulse: 1,
        };
        const nodeGlow = isDark ? 12 : 7;

        const cPrimary = readVar("--primary");
        const cAccent = readVar("--accent");
        const cMuted = readVar("--muted-foreground");
        const tone = (t: 0 | 1) => (t === 0 ? cPrimary : cAccent);

        let width = wrap.clientWidth;
        let height = heightFor(width);
        let dpr = Math.min(window.devicePixelRatio || 1, 2);
        let compact = width < 480;
        const cap = capFor(width);

        const resize = () => {
            width = wrap.clientWidth;
            height = heightFor(width);
            compact = width < 480;
            dpr = Math.min(window.devicePixelRatio || 1, 2);
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            wrap.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        };
        resize();

        const start = performance.now();

        let nextId = 0;
        const makeNode = (x: number, y: number, core = false): GNode => ({
            id: nextId++,
            r: core ? 8 : 2.5 + Math.random() * 3,
            born: performance.now(),
            tone: core ? 0 : Math.random() < 0.34 ? 1 : 0,
            x,
            y,
        });

        // Seed graph
        const nodes: GNode[] = [makeNode(width / 2, height / 2, true)];
        for (let i = 0; i < 2; i++) {
            nodes.push(makeNode(width / 2 + (Math.random() - 0.5) * 80, height / 2 + (Math.random() - 0.5) * 80));
        }
        const links: GLink[] = [
            { source: nodes[1], target: nodes[0] },
            { source: nodes[2], target: nodes[0] },
        ];

        const sim: Simulation<GNode, GLink> = forceSimulation(nodes)
            .force("charge", forceManyBody().strength(-58))
            .force("link", forceLink<GNode, GLink>(links).distance(58).strength(0.14))
            .force("center", forceCenter(width / 2, height / 2))
            .force("collide", forceCollide<GNode>().radius((d) => d.r + 7))
            .force("x", forceX(width / 2).strength(0.035))
            .force("y", forceY(height / 2).strength(0.035))
            .alphaDecay(0)
            .alphaTarget(0.14)
            .velocityDecay(0.9);

        const linkForce = sim.force("link") as ForceLink<GNode, GLink>;

        // Continuous growth: keep discovering papers + drawing new links.
        const spawn = () => {
            if (nodes.length < cap) {
                const parent = nodes[Math.floor(Math.random() * nodes.length)];
                const n = makeNode(
                    (parent.x ?? width / 2) + (Math.random() - 0.5) * 50,
                    (parent.y ?? height / 2) + (Math.random() - 0.5) * 50,
                );
                nodes.push(n);
                links.push({ source: n, target: parent });
                // occasional extra cross-link to a different existing node
                if (Math.random() < 0.5 && nodes.length > 4) {
                    const other = nodes[Math.floor(Math.random() * (nodes.length - 1))];
                    if (other.id !== n.id) links.push({ source: n, target: other });
                }
            } else {
                // graph full — keep establishing connections between existing nodes
                const a = nodes[Math.floor(Math.random() * nodes.length)];
                const b = nodes[Math.floor(Math.random() * nodes.length)];
                if (a.id !== b.id) links.push({ source: a, target: b, _born: performance.now() } as GLink);
            }
            sim.nodes(nodes);
            linkForce.links(links);
            sim.alpha(0.5).restart();
            setNodeCount(nodes.length);
        };
        const spawnTimer = reduceMotion ? null : setInterval(spawn, 620);

        const linkBornAt = (l: GLink, i: number) =>
            (l as GLink & { _born?: number })._born ?? (i < 2 ? start : start);

        let targetIdx = 0;
        let targetSince = start;
        let targetLabel = RETICLE_LABELS[0];
        let targetId = randHex(4);

        const pickTarget = (now: number) => {
            targetIdx = Math.floor(Math.random() * nodes.length);
            targetSince = now;
            targetLabel = RETICLE_LABELS[Math.floor(Math.random() * RETICLE_LABELS.length)];
            targetId = randHex(4);
        };

        const drawReticle = (
            x: number, y: number, size: number, color: (a: number) => string, alpha: number, lw = 1.5,
        ) => {
            const h = size / 2;
            const arm = size * 0.32;
            ctx.strokeStyle = color(alpha);
            ctx.lineWidth = lw;
            ([[-h, -h, 1, 1], [h, -h, -1, 1], [-h, h, 1, -1], [h, h, -1, -1]] as const).forEach(
                ([cx, cy, sx, sy]) => {
                    ctx.beginPath();
                    ctx.moveTo(x + cx, y + cy + sy * arm);
                    ctx.lineTo(x + cx, y + cy);
                    ctx.lineTo(x + cx + sx * arm, y + cy);
                    ctx.stroke();
                },
            );
        };

        let raf = 0;
        const render = () => {
            const now = performance.now();
            const elapsed = now - start;

            ctx.clearRect(0, 0, width, height);

            // Depth: soft primary glow center + corner vignette
            const bg = ctx.createRadialGradient(
                width / 2, height * 0.45, 0, width / 2, height * 0.45, Math.max(width, height) * 0.62,
            );
            bg.addColorStop(0, cPrimary(isDark ? 0.1 : 0.06));
            bg.addColorStop(0.6, cPrimary(0));
            bg.addColorStop(1, cMuted(isDark ? 0.12 : 0.05));
            ctx.fillStyle = bg;
            ctx.fillRect(0, 0, width, height);

            // Grid
            ctx.strokeStyle = cMuted(A.grid);
            ctx.lineWidth = 1;
            const grid = 36;
            for (let gx = 0; gx <= width; gx += grid) {
                ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke();
            }
            for (let gy = 0; gy <= height; gy += grid) {
                ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
            }

            for (const n of nodes) {
                n.x = Math.max(14, Math.min(width - 14, n.x ?? width / 2));
                n.y = Math.max(14, Math.min(height - 14, n.y ?? height / 2));
            }

            // Edges — gradient primary→accent, draw-in, with traveling pulse
            links.forEach((l, i) => {
                const s = l.source as GNode;
                const t = l.target as GNode;
                if (!s || !t || s.x == null || t.x == null) return;
                const appear = Math.min(1, Math.max(0, (now - linkBornAt(l, i)) / 600));
                if (appear <= 0) return;
                const ex = s.x + (t.x! - s.x) * appear;
                const ey = s.y! + (t.y! - s.y!) * appear;
                const g = ctx.createLinearGradient(s.x, s.y!, ex, ey);
                g.addColorStop(0, cPrimary(A.edge * appear));
                g.addColorStop(1, cAccent(A.edge * appear));
                ctx.strokeStyle = g;
                ctx.lineWidth = 1.1;
                ctx.beginPath();
                ctx.moveTo(s.x, s.y!);
                ctx.lineTo(ex, ey);
                ctx.stroke();

                if (appear >= 1) {
                    const p = (now / 1500 + i * 0.13) % 1;
                    const px = s.x + (t.x! - s.x) * p;
                    const py = s.y! + (t.y! - s.y!) * p;
                    ctx.fillStyle = cAccent(A.pulse * (1 - Math.abs(0.5 - p) * 2));
                    ctx.beginPath();
                    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Nodes — colored + glow, materialize with a flash ring
            nodes.forEach((n) => {
                const age = now - n.born;
                const appear = Math.min(1, age / 420);
                const isCore = n.r >= 7;
                const col = tone(n.tone);

                if (age < 520) {
                    const fr = (age / 520) * 18;
                    ctx.strokeStyle = col(0.55 * (1 - age / 520));
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.arc(n.x!, n.y!, fr, 0, Math.PI * 2);
                    ctx.stroke();
                }

                ctx.shadowColor = col(0.9);
                ctx.shadowBlur = nodeGlow * appear;
                if (isCore) {
                    const cg = ctx.createRadialGradient(n.x!, n.y!, 0, n.x!, n.y!, n.r);
                    cg.addColorStop(0, cPrimary(appear));
                    cg.addColorStop(1, cAccent(appear));
                    ctx.fillStyle = cg;
                } else {
                    ctx.fillStyle = col(A.node * appear);
                }
                ctx.beginPath();
                ctx.arc(n.x!, n.y!, n.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                if (isCore) {
                    ctx.strokeStyle = cPrimary(0.45 * appear);
                    ctx.lineWidth = 1.2;
                    ctx.beginPath();
                    ctx.arc(n.x!, n.y!, n.r + 6 + Math.sin(now / 320) * 2.5, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });

            // Primary target reticle (accent pop) + crosshair + label
            if (elapsed > 1400 && nodes.length > 2) {
                if (now - targetSince > 2000) pickTarget(now);
                const n = nodes[Math.min(targetIdx, nodes.length - 1)];
                const since = now - targetSince;
                const snap = Math.min(1, since / 360);
                const ease = 1 - Math.pow(1 - snap, 3);
                const size = 58 - 26 * ease;
                const alpha = 0.95 * Math.min(1, snap * 1.2);

                ctx.strokeStyle = cAccent(0.16 * ease);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(0, n.y!); ctx.lineTo(width, n.y!);
                ctx.moveTo(n.x!, 0); ctx.lineTo(n.x!, height);
                ctx.stroke();

                drawReticle(n.x!, n.y!, size, cAccent, alpha, 1.6);

                if (snap > 0.6 && !compact) {
                    ctx.font = "600 10px ui-monospace, SFMono-Regular, Menlo, monospace";
                    const flip = n.x! + size / 2 + 92 > width;
                    const lx = flip ? n.x! - size / 2 - 84 : n.x! + size / 2 + 8;
                    const ly = n.y! - size / 2;
                    ctx.fillStyle = cAccent(0.95);
                    ctx.fillText(targetLabel, lx, ly);
                    ctx.fillStyle = cMuted(0.85);
                    ctx.fillText(`PAPER 0x${targetId}`, lx, ly + 13);
                    ctx.fillText(`REL ${(0.6 + Math.random() * 0.4).toFixed(2)}`, lx, ly + 26);
                }
            }

            // Scan sweep
            const scanY = ((now / 2800) % 1) * height;
            const sg = ctx.createLinearGradient(0, scanY - 44, 0, scanY + 44);
            sg.addColorStop(0, cPrimary(0));
            sg.addColorStop(0.5, cPrimary(isDark ? 0.14 : 0.09));
            sg.addColorStop(1, cPrimary(0));
            ctx.fillStyle = sg;
            ctx.fillRect(0, scanY - 44, width, 88);
            ctx.strokeStyle = cPrimary(isDark ? 0.5 : 0.38);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, scanY); ctx.lineTo(width, scanY); ctx.stroke();

            if (!reduceMotion) raf = requestAnimationFrame(render);
        };

        render();

        const ro = new ResizeObserver(() => {
            resize();
            sim.force("center", forceCenter(width / 2, height / 2));
            sim.alpha(0.4).restart();
        });
        ro.observe(wrap);

        return () => {
            cancelAnimationFrame(raf);
            if (spawnTimer) clearInterval(spawnTimer);
            sim.stop();
            ro.disconnect();
        };
    }, []);

    const trimmedQuery = query?.trim();

    return (
        <div className="flex flex-col items-center py-8 sm:py-10">
            <div
                ref={wrapRef}
                className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-primary/25 bg-card/40 shadow-lg"
                style={{ height: 380 }}
            >
                <canvas ref={canvasRef} className="absolute inset-0" />

                {/* HUD */}
                <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4 flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-primary/85">
                    <span className="text-sm leading-none">◢</span> Scanning papers
                </div>

                <div className="pointer-events-none absolute right-3 top-3 sm:right-4 sm:top-4 flex items-center gap-1.5 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/75">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Searching
                </div>

                <div className="pointer-events-none absolute bottom-3 right-3 sm:bottom-4 sm:right-4 font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-muted-foreground/65">
                    {nodeCount} nodes linked
                </div>

                {/* corner ticks */}
                <div className="pointer-events-none absolute left-2 top-2 h-4 w-4 border-l-2 border-t-2 border-primary/40" />
                <div className="pointer-events-none absolute right-2 top-2 h-4 w-4 border-r-2 border-t-2 border-primary/40" />
                <div className="pointer-events-none absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-primary/40" />
                <div className="pointer-events-none absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-primary/40" />
            </div>

            {trimmedQuery && (
                <div className="mt-6 flex max-w-md items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 shadow-sm">
                    <Search className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate text-sm text-muted-foreground">
                        Searching for{" "}
                        <span className="font-semibold text-foreground">&ldquo;{trimmedQuery}&rdquo;</span>
                    </span>
                </div>
            )}

            <div className="mt-3 h-6 px-4 text-center">
                <p
                    key={messageIdx}
                    className="loader-gradient-text font-mono text-xs sm:text-sm font-semibold uppercase tracking-wider"
                    style={{ animation: "loader-message-in 0.4s ease-out, gradient-pan 3s linear infinite" }}
                >
                    {STATUS_MESSAGES[messageIdx]}
                </p>
            </div>

            <div className="mt-3 flex items-center gap-2">
                {STATUS_MESSAGES.map((_, i) => (
                    <span
                        key={i}
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                            width: i === messageIdx ? 20 : 6,
                            backgroundColor:
                                i === messageIdx ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default ExploreSearchLoader;
