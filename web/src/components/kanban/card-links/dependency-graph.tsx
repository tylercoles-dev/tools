'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  GitBranch,
  ArrowRight,
  AlertTriangle,
  ExternalLink,
  Filter,
  Maximize2
} from 'lucide-react';
import type { CardLink } from './card-link-manager';

interface DependencyNode {
  id: string;
  title: string;
  column: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isCompleted: boolean;
  x: number;
  y: number;
  level: number;
  dependencies: string[];
  dependents: string[];
  isBlocked: boolean;
  isBlocking: boolean;
}

interface DependencyGraphProps {
  boardId: string;
  cards: Array<{
    id: string;
    title: string;
    column: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    isCompleted: boolean;
  }>;
  links: CardLink[];
  onCardClick?: (cardId: string) => void;
  focusCardId?: string;
}

const priorityColors = {
  low: '#94a3b8',
  medium: '#3b82f6',
  high: '#f59e0b',
  urgent: '#ef4444',
};

export function DependencyGraph({
  boardId,
  cards,
  links,
  onCardClick,
  focusCardId,
}: DependencyGraphProps) {
  const { nodes, edges, stats } = useMemo(() => {
    // Build dependency graph
    const nodeMap = new Map<string, DependencyNode>();
    
    // Initialize nodes
    cards.forEach(card => {
      nodeMap.set(card.id, {
        id: card.id,
        title: card.title,
        column: card.column,
        priority: card.priority,
        isCompleted: card.isCompleted,
        x: 0,
        y: 0,
        level: 0,
        dependencies: [],
        dependents: [],
        isBlocked: false,
        isBlocking: false,
      });
    });

    // Process links to build dependencies
    const blockingLinks = links.filter(link => link.link_type === 'blocks');
    const edges: Array<{ source: string; target: string; type: string }> = [];

    blockingLinks.forEach(link => {
      const sourceNode = nodeMap.get(link.source_card_id);
      const targetNode = nodeMap.get(link.target_card_id);
      
      if (sourceNode && targetNode) {
        sourceNode.dependents.push(link.target_card_id);
        targetNode.dependencies.push(link.source_card_id);
        sourceNode.isBlocking = true;
        targetNode.isBlocked = true;
        
        edges.push({
          source: link.source_card_id,
          target: link.target_card_id,
          type: 'blocks',
        });
      }
    });

    // Add other relationship types
    links.filter(link => link.link_type !== 'blocks').forEach(link => {
      edges.push({
        source: link.source_card_id,
        target: link.target_card_id,
        type: link.link_type,
      });
    });

    // Calculate layout using topological sort for blocking relationships
    const calculateLevels = () => {
      const visited = new Set<string>();
      const levels = new Map<string, number>();
      
      const dfs = (nodeId: string, level: number = 0): number => {
        if (visited.has(nodeId)) {
          return levels.get(nodeId) || 0;
        }
        
        visited.add(nodeId);
        const node = nodeMap.get(nodeId);
        if (!node) return level;
        
        let maxLevel = level;
        node.dependencies.forEach(depId => {
          const depLevel = dfs(depId, level);
          maxLevel = Math.max(maxLevel, depLevel + 1);
        });
        
        levels.set(nodeId, maxLevel);
        node.level = maxLevel;
        return maxLevel;
      };
      
      Array.from(nodeMap.keys()).forEach(nodeId => {
        if (!visited.has(nodeId)) {
          dfs(nodeId);
        }
      });
      
      return levels;
    };

    calculateLevels();

    // Position nodes in a hierarchical layout
    const levelGroups = new Map<number, string[]>();
    Array.from(nodeMap.values()).forEach(node => {
      const level = node.level;
      if (!levelGroups.has(level)) {
        levelGroups.set(level, []);
      }
      levelGroups.get(level)!.push(node.id);
    });

    const nodeWidth = 200;
    const nodeHeight = 80;
    const levelSpacing = 250;
    const nodeSpacing = 100;

    levelGroups.forEach((nodeIds, level) => {
      const y = level * levelSpacing + 50;
      const totalWidth = (nodeIds.length - 1) * (nodeWidth + nodeSpacing);
      const startX = Math.max(50, (800 - totalWidth) / 2); // Center horizontally
      
      nodeIds.forEach((nodeId, index) => {
        const node = nodeMap.get(nodeId);
        if (node) {
          node.x = startX + index * (nodeWidth + nodeSpacing);
          node.y = y;
        }
      });
    });

    // Calculate stats
    const totalCards = cards.length;
    const blockedCards = Array.from(nodeMap.values()).filter(n => n.isBlocked).length;
    const blockingCards = Array.from(nodeMap.values()).filter(n => n.isBlocking).length;
    const criticalPath = Math.max(...Array.from(nodeMap.values()).map(n => n.level)) + 1;

    return {
      nodes: Array.from(nodeMap.values()),
      edges,
      stats: {
        totalCards,
        blockedCards,
        blockingCards,
        criticalPath,
        totalLinks: links.length,
      },
    };
  }, [cards, links]);

  const renderNode = (node: DependencyNode) => {
    const isFocused = focusCardId === node.id;
    const isRelatedToFocus = focusCardId && (
      node.dependencies.includes(focusCardId) || 
      node.dependents.includes(focusCardId)
    );

    return (
      <div
        key={node.id}
        className={`absolute cursor-pointer transition-all duration-200 ${
          isFocused ? 'z-20 scale-105' : isRelatedToFocus ? 'z-10' : 'z-0'
        }`}
        style={{
          left: node.x,
          top: node.y,
          width: 200,
          height: 80,
        }}
        onClick={() => onCardClick?.(node.id)}
      >
        <div
          className={`w-full h-full rounded-lg border-2 shadow-sm hover:shadow-md transition-all ${
            isFocused 
              ? 'border-blue-500 bg-blue-50' 
              : isRelatedToFocus 
              ? 'border-orange-300 bg-orange-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          } ${node.isCompleted ? 'opacity-60' : ''}`}
        >
          <div className="p-3 h-full flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <h4 className={`text-sm font-medium truncate flex-1 ${
                node.isCompleted ? 'line-through text-gray-500' : ''
              }`}>
                {node.title}
              </h4>
              <div
                className="w-3 h-3 rounded-full ml-2 flex-shrink-0"
                style={{ backgroundColor: priorityColors[node.priority] }}
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span className="truncate">{node.column}</span>
              {node.isBlocked && (
                <Badge className="bg-red-100 text-red-700 text-xs">
                  Blocked
                </Badge>
              )}
              {node.isBlocking && !node.isBlocked && (
                <Badge className="bg-orange-100 text-orange-700 text-xs">
                  Blocking
                </Badge>
              )}
            </div>
            
            {(node.dependencies.length > 0 || node.dependents.length > 0) && (
              <div className="text-xs text-gray-400 flex items-center space-x-2">
                {node.dependencies.length > 0 && (
                  <span>↑{node.dependencies.length}</span>
                )}
                {node.dependents.length > 0 && (
                  <span>↓{node.dependents.length}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderEdge = (edge: { source: string; target: string; type: string }) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) return null;

    const sourceX = sourceNode.x + 100; // Center of source node
    const sourceY = sourceNode.y + 80;  // Bottom of source node
    const targetX = targetNode.x + 100; // Center of target node
    const targetY = targetNode.y;       // Top of target node

    const isBlocking = edge.type === 'blocks';
    const strokeColor = isBlocking ? '#ef4444' : '#94a3b8';
    const strokeWidth = isBlocking ? 2 : 1;

    return (
      <line
        key={`${edge.source}-${edge.target}`}
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isBlocking ? 'none' : '5,5'}
        markerEnd="url(#arrowhead)"
      />
    );
  };

  if (cards.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <GitBranch className="w-5 h-5 mr-2" />
            Dependency Graph
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No cards to visualize</p>
            <p className="text-sm">Create some cards and link them to see the dependency graph</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxX = Math.max(...nodes.map(n => n.x + 200));
  const maxY = Math.max(...nodes.map(n => n.y + 80));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <GitBranch className="w-5 h-5 mr-2" />
            Dependency Graph
          </CardTitle>
          <div className="flex items-center space-x-4">
            {/* Stats */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Badge variant="outline">{stats.totalCards} cards</Badge>
              <Badge variant="outline">{stats.totalLinks} links</Badge>
              {stats.blockedCards > 0 && (
                <Badge className="bg-red-100 text-red-800">
                  {stats.blockedCards} blocked
                </Badge>
              )}
              {stats.blockingCards > 0 && (
                <Badge className="bg-orange-100 text-orange-800">
                  {stats.blockingCards} blocking
                </Badge>
              )}
            </div>
            <Button size="sm" variant="outline">
              <Maximize2 className="w-4 h-4 mr-2" />
              Full Screen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative border rounded-lg bg-gray-50 overflow-auto" style={{ height: '600px' }}>
          <svg
            width={Math.max(800, maxX + 50)}
            height={Math.max(400, maxY + 50)}
            className="absolute inset-0"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#ef4444"
                />
              </marker>
            </defs>
            {edges.map(renderEdge)}
          </svg>
          
          {nodes.map(renderNode)}
          
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No dependencies to visualize</p>
                <p className="text-sm">Link cards with "blocks" relationship to see dependencies</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-red-500"></div>
              <span>Blocks</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-1 bg-gray-400" style={{ strokeDasharray: '2,2' }}></div>
              <span>Other links</span>
            </div>
          </div>
          <div className="text-xs">
            Critical path: {stats.criticalPath} level{stats.criticalPath !== 1 ? 's' : ''}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}