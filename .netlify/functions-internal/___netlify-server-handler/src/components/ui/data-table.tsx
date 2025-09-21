import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { Badge } from './badge';

interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, row: T, index: number) => React.ReactNode;
  accessor?: (row: T) => any;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  sortable?: boolean;
  selectable?: boolean;
  onRowSelect?: (selectedRows: T[]) => void;
  onRowClick?: (row: T, index: number) => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = false,
  filterable = false,
  pagination = false,
  pageSize = 10,
  sortable = true,
  selectable = false,
  onRowSelect,
  onRowClick,
  className = '',
  emptyMessage = 'No data available',
  loading = false,
  striped = true,
  hoverable = true,
  compact = false
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Filter and search data
  const filteredData = useMemo(() => {
    let filtered = [...data];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        filtered = filtered.filter(row => {
          const column = columns.find(col => col.key === key);
          const cellValue = column?.accessor ? column.accessor(row) : row[key];
          return String(cellValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    return filtered;
  }, [data, searchTerm, filters, columns]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const column = columns.find(col => col.key === sortConfig.key);
      const aValue = column?.accessor ? column.accessor(a) : a[sortConfig.key];
      const bValue = column?.accessor ? column.accessor(b) : b[sortConfig.key];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig, columns]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  const handleSort = (key: string) => {
    if (!sortable) return;

    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') {
          return { key, direction: 'desc' };
        } else {
          return null; // Remove sort
        }
      }
      return { key, direction: 'asc' };
    });
  };

  const handleSelectRow = (index: number) => {
    if (!selectable) return;

    const newSelected = new Set(selectedRows);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRows(newSelected);
    
    const selectedData = Array.from(newSelected).map(i => sortedData[i]);
    onRowSelect?.(selectedData);
  };

  const handleSelectAll = () => {
    if (!selectable) return;

    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onRowSelect?.([]);
    } else {
      const allIndices = new Set(paginatedData.map((_, index) => index));
      setSelectedRows(allIndices);
      onRowSelect?.(paginatedData);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filters */}
      {(searchable || filterable) && (
        <div className="flex flex-col sm:flex-row gap-4">
          {searchable && (
            <div className="flex-1">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          )}
          {filterable && (
            <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
              Filters
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {selectable && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={`${String(column.key)}-${index}`}
                  className={`
                    px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider
                    ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                    ${column.sortable !== false && sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                  `}
                  style={{ width: column.width }}
                  onClick={() => column.sortable !== false && handleSort(String(column.key))}
                >
                  <div className="flex items-center gap-1">
                    <span>{column.title}</span>
                    {column.sortable !== false && sortable && (
                      <span className="flex flex-col">
                        {sortConfig?.key === column.key ? (
                          sortConfig.direction === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`
                    ${striped && rowIndex % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}
                    ${hoverable ? 'hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                    ${onRowClick ? 'cursor-pointer' : ''}
                    ${compact ? 'h-10' : 'h-12'}
                    transition-colors
                  `}
                  onClick={() => onRowClick?.(row, rowIndex)}
                >
                  {selectable && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rowIndex)}
                        onChange={() => handleSelectRow(rowIndex)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((column, colIndex) => {
                    const value = column.accessor ? column.accessor(row) : row[column.key as keyof T];
                    return (
                      <td
                        key={`${String(column.key)}-${colIndex}`}
                        className={`
                          px-4 py-3 text-sm text-gray-900 dark:text-gray-100
                          ${column.align === 'center' ? 'text-center' : column.align === 'right' ? 'text-right' : 'text-left'}
                        `}
                      >
                        {column.render ? column.render(value, row, rowIndex) : String(value || '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length} results
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}