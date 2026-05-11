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
}

interface GraphLink {
  source: string;
  target: string;
  amount: number;
}

export function GraphTab({ balances, transfers }: GraphTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<{ d3ReheatSimulation: () => void } | undefined>(undefined);
  const [dimensions, setDimensions] = useState({ width: 400, height: 360 });

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
        height: 360,
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
        <p>Add expenses to see the debt graph.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        ref={containerRef}
        className="card"
        style={{ padding: 0, overflow: 'hidden', height: '360px', borderColor: 'var(--border)' }}
      >
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={dimensions.width}
          height={360}
          backgroundColor="transparent"
          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.name;
            const radius = 20 / globalScale;
            const fontSize = 11 / globalScale;

            // Glow effect
            const gradient = ctx.createRadialGradient(
              node.x!, node.y!, radius * 0.5,
              node.x!, node.y!, radius * 1.8
            );
            const color = node.balance > 0 ? '#4ade80' : node.balance < 0 ? '#f87171' : '#71717a';
            gradient.addColorStop(0, `${color}30`);
            gradient.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius * 1.8, 0, 2 * Math.PI);
            ctx.fillStyle = gradient;
            ctx.fill();

            // Node circle
            ctx.beginPath();
            ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
            ctx.fillStyle = node.balance > 0 ? '#18181b' : '#18181b';
            ctx.fill();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2 / globalScale;
            ctx.stroke();

            // Name
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fafafa';
            ctx.fillText(label, node.x!, node.y! - fontSize * 0.3);

            // Balance below name
            const balStr = `${node.balance > 0 ? '+' : ''}₹${Math.abs(node.balance).toLocaleString()}`;
            ctx.font = `${fontSize * 0.75}px Inter, sans-serif`;
            ctx.fillStyle = color;
            ctx.fillText(balStr, node.x!, node.y! + fontSize * 0.8);
          }}
          linkDirectionalArrowLength={8}
          linkDirectionalArrowRelPos={0.75}
          linkColor={() => '#a78bfa50'}
          linkWidth={1.5}
          linkLineDash={[4, 2]}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const src = link.source as unknown as GraphNode;
            const tgt = link.target as unknown as GraphNode;
            if (!src.x || !tgt.x) return;

            const midX = (src.x + tgt.x) / 2;
            const midY = (src.y! + tgt.y!) / 2;
            const fontSize = 9 / globalScale;

            // Background pill
            const text = `₹${link.amount.toLocaleString()}`;
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            const textWidth = ctx.measureText(text).width;
            const padding = 3 / globalScale;

            ctx.beginPath();
            ctx.roundRect(
              midX - textWidth / 2 - padding,
              midY - fontSize / 2 - padding,
              textWidth + padding * 2,
              fontSize + padding * 2,
              2 / globalScale
            );
            ctx.fillStyle = '#18181b';
            ctx.fill();
            ctx.strokeStyle = '#a78bfa40';
            ctx.lineWidth = 0.5 / globalScale;
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fbbf24';
            ctx.fillText(text, midX, midY);
          }}
          cooldownTicks={80}
          d3VelocityDecay={0.3}
        />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }} />
          Gets back
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f87171' }} />
          Owes
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
          <div style={{ width: '16px', height: '2px', background: '#a78bfa', borderRadius: '1px' }} />
          Transfers
        </div>
      </div>
    </div>
  );
}
