import { useRef, useEffect, useMemo } from 'react';
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
    if (fgRef.current) {
      fgRef.current.d3ReheatSimulation();
    }
  }, [graphData]);

  if (balances.length === 0) {
    return (
      <div className="empty">
        <p>Add expenses to see the debt graph.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="card" style={{ padding: 0, overflow: 'hidden', height: '360px' }}>
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        width={containerRef.current?.clientWidth ?? 440}
        height={360}
        backgroundColor="transparent"
        nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px sans-serif`;
          const radius = 16 / globalScale;

          // Node circle
          ctx.beginPath();
          ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
          ctx.fillStyle = node.balance > 0 ? '#22c55e' : node.balance < 0 ? '#ef4444' : '#64748b';
          ctx.fill();

          // Label
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#fff';
          ctx.fillText(label, node.x!, node.y!);

          // Balance below
          const balLabel = `${node.balance > 0 ? '+' : ''}${node.balance.toFixed(0)}`;
          ctx.font = `${fontSize * 0.8}px sans-serif`;
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(balLabel, node.x!, node.y! + radius + fontSize * 0.6);
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={0.8}
        linkColor={() => '#475569'}
        linkWidth={2}
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const src = link.source as unknown as GraphNode;
          const tgt = link.target as unknown as GraphNode;
          if (!src.x || !tgt.x) return;

          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y! + tgt.y!) / 2;
          const fontSize = 10 / globalScale;

          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f59e0b';
          ctx.fillText(`${link.amount.toFixed(0)}`, midX, midY - fontSize * 0.8);
        }}
        cooldownTicks={50}
      />
    </div>
  );
}
