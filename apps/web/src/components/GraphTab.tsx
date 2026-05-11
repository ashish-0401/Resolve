import { useRef, useEffect, useMemo, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Balance, Transfer } from '../api';

interface GraphTabProps {
  balances: Balance[];
  transfers: Transfer[];
}

interface GraphNode {
  id: string;
  name: string;
  balance: number;
  val: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  amount: number;
}

export function GraphTab({ balances, transfers }: GraphTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{ d3ReheatSimulation: () => void } | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 400, height: 340 });

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = balances.map((b) => ({
      id: b.user.id,
      name: b.user.firstName,
      balance: b.balance,
      val: Math.max(Math.abs(b.balance), 10),
    }));

    const links: GraphLink[] = transfers.map((t) => ({
      source: t.from.id,
      target: t.to.id,
      amount: t.amount,
    }));

    return { nodes, links };
  }, [balances, transfers]);

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: 340,
      });
    }
  }, []);

  useEffect(() => {
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData]);

  if (balances.length === 0) {
    return (
      <div className="empty">
        <p style={{ fontSize: '40px', marginBottom: '8px' }}>🕸️</p>
        <p>Add expenses to see who owes who</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Explanation */}
      <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          🔴 Red = owes money &nbsp;·&nbsp; 🟢 Green = gets money back
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>
          Arrows show who needs to pay whom
        </p>
      </div>

      <div
        ref={containerRef}
        className="card"
        style={{ padding: 0, overflow: 'hidden', height: '340px' }}
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={340}
          backgroundColor="transparent"
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            // Guard: skip if position not yet computed by simulation
            if (node.x == null || node.y == null || !isFinite(node.x) || !isFinite(node.y)) return;

            const x = node.x;
            const y = node.y;
            const radius = 22 / globalScale;
            const fontSize = 12 / globalScale;
            const color = node.balance > 0 ? '#4ade80' : node.balance < 0 ? '#f87171' : '#71717a';

            // Filled circle
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = node.balance > 0 ? '#052e16' : node.balance < 0 ? '#450a0a' : '#1c1c1f';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5 / globalScale;
            ctx.stroke();

            // Name inside
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fafafa';
            ctx.fillText(node.name, x, y);

            // Amount below the circle
            const amtText = `₹${Math.abs(node.balance).toLocaleString()}`;
            ctx.font = `${fontSize * 0.8}px Inter, sans-serif`;
            ctx.fillStyle = color;
            ctx.fillText(amtText, x, y + radius + fontSize * 0.9);
          }}
          linkDirectionalArrowLength={0}
          linkColor={() => 'transparent'}
          linkWidth={0}
          linkCanvasObjectMode={() => 'replace'}
          linkCanvasObject={(link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const src = link.source as unknown as GraphNode;
            const tgt = link.target as unknown as GraphNode;
            if (!src.x || !src.y || !tgt.x || !tgt.y) return;
            if (!isFinite(src.x) || !isFinite(tgt.x)) return;

            const nodeRadius = 22 / globalScale;

            // Calculate direction
            const dx = tgt.x - src.x;
            const dy = tgt.y - src.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) return;

            const ux = dx / dist;
            const uy = dy / dist;

            // Start/end offset by node radius
            const startX = src.x + ux * nodeRadius;
            const startY = src.y + uy * nodeRadius;
            const endX = tgt.x - ux * nodeRadius;
            const endY = tgt.y - uy * nodeRadius;

            // Draw line
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 2.5 / globalScale;
            ctx.stroke();

            // Draw arrowhead
            const arrowLen = 14 / globalScale;
            const arrowWidth = 8 / globalScale;
            ctx.beginPath();
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - ux * arrowLen + uy * arrowWidth, endY - uy * arrowLen - ux * arrowWidth);
            ctx.lineTo(endX - ux * arrowLen - uy * arrowWidth, endY - uy * arrowLen + ux * arrowWidth);
            ctx.closePath();
            ctx.fillStyle = '#a78bfa';
            ctx.fill();

            // Amount label at midpoint
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            const fontSize = 10 / globalScale;
            const text = `₹${link.amount.toLocaleString()}`;

            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(text, midX, midY - fontSize);
          }}
          cooldownTicks={100}
          d3VelocityDecay={0.3}
        />
      </div>
    </div>
  );
}
