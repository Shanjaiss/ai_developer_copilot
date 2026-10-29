import { useState } from 'react';
import type { TreeNode } from '../../../types/repository';

export interface RepositoryFileTreeProps {
  tree: TreeNode[];
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
}

interface TreeNodeItemProps {
  node: TreeNode;
  selectedFilePath: string | null;
  onSelectFile: (path: string) => void;
  level?: number;
}

function TreeNodeItem({
  node,
  selectedFilePath,
  onSelectFile,
  level = 0,
}: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const isSelected = selectedFilePath === node.path;
  const isDir = node.type === 'directory';

  const handleClick = () => {
    if (isDir) {
      setIsExpanded((prev) => !prev);
    } else {
      onSelectFile(node.path);
    }
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '4px 8px',
          paddingLeft: `${level * 16 + 8}px`,
          borderRadius: '6px',
          cursor: 'pointer',
          background: isSelected
            ? 'rgba(56, 189, 248, 0.2)'
            : 'transparent',
          color: isSelected ? '#38bdf8' : '#e2e8f0',
          fontSize: '13px',
          fontFamily: 'monospace',
          transition: 'background 0.15s ease',
          userSelect: 'none',
        }}
        aria-label={`${isDir ? 'Directory' : 'File'}: ${node.name}`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <span style={{ fontSize: '14px', flexShrink: 0 }}>
            {isDir ? (isExpanded ? '📂' : '📁') : '📄'}
          </span>
          <span
            style={{
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              fontWeight: isDir ? 600 : 400,
            }}
          >
            {node.name}
          </span>
          {node.is_entry_point && (
            <span
              title="Application Entry Point"
              style={{ fontSize: '10px', color: '#fbbf24', marginLeft: '4px' }}
            >
              ⭐
            </span>
          )}
        </div>

        {!isDir && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {node.language && (
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#94a3b8',
                }}
              >
                {node.language}
              </span>
            )}
            {node.size_bytes !== undefined && (
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {node.size_bytes > 1024
                  ? `${(node.size_bytes / 1024).toFixed(0)}k`
                  : `${node.size_bytes}b`}
              </span>
            )}
          </div>
        )}
      </div>

      {isDir && isExpanded && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.path}
              node={child}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function RepositoryFileTree({
  tree,
  selectedFilePath,
  onSelectFile,
}: RepositoryFileTreeProps) {
  const [filterText, setFilterText] = useState<string>('');

  const filterTree = (nodes: TreeNode[], query: string): TreeNode[] => {
    if (!query) return nodes;
    const lower = query.toLowerCase();
    const result: TreeNode[] = [];

    for (const node of nodes) {
      if (node.type === 'file') {
        if (node.name.toLowerCase().includes(lower) || node.path.toLowerCase().includes(lower)) {
          result.push(node);
        }
      } else if (node.type === 'directory' && node.children) {
        const matchingChildren = filterTree(node.children, query);
        if (
          matchingChildren.length > 0 ||
          node.name.toLowerCase().includes(lower) ||
          node.path.toLowerCase().includes(lower)
        ) {
          result.push({
            ...node,
            children: matchingChildren.length > 0 ? matchingChildren : node.children,
          });
        }
      }
    }
    return result;
  };

  const filteredTree = filterTree(tree, filterText);

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '520px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
          Repository File Tree
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Click file to view dependencies
        </span>
      </div>

      <input
        type="text"
        placeholder="Filter files by name..."
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        aria-label="Filter repository file tree"
        style={{
          background: 'rgba(30, 41, 59, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '12px',
          color: '#f8fafc',
          marginBottom: '12px',
          outline: 'none',
        }}
      />

      <div
        style={{
          overflowY: 'auto',
          flex: 1,
          paddingRight: '4px',
        }}
      >
        {filteredTree.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
            No files matched &apos;{filterText}&apos;
          </div>
        ) : (
          filteredTree.map((node) => (
            <TreeNodeItem
              key={node.path}
              node={node}
              selectedFilePath={selectedFilePath}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>
    </div>
  );
}

