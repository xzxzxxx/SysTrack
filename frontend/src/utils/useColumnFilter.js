import { useState, useEffect } from 'react';

const useColumnFilter = (columns, storageKey) => {
  // Initialize visibleColumns from localStorage or default to all true
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    return columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
  });

  // Save to localStorage when visibleColumns changes
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Toggle a column's visibility
  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Reset to all columns visible
  const resetColumns = () => {
    setVisibleColumns(columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}));
  };

  return { visibleColumns, toggleColumn, resetColumns };
};

export default useColumnFilter;