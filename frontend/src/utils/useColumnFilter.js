// Custom hook to manage column visibility and order for tables
// Uses localStorage to persist state across sessions
import { useState, useEffect } from 'react';

const useColumnFilter = (columns, storageKey) => {
  // Initialize visibleColumns from localStorage or default to all true
  // If no saved state, all columns are visible by default
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved).visibleColumns : columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {});
  });

  // Initialize order from localStorage or original columns sequence
  // Ensures order is always an array, even if localStorage is empty
  const [order, setOrder] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    const savedOrder = saved ? JSON.parse(saved).order : null;
    return Array.isArray(savedOrder) ? savedOrder : columns.map(col => col.key);
  });

  // Save visibleColumns and order to localStorage on change
  // Ensures state persists even after browser refresh
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ visibleColumns, order }));
  }, [visibleColumns, order]);

  // Toggle a column's visibility
  // Updates the visibleColumns state and triggers localStorage save
  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Reorder columns based on drag-and-drop result
  // Takes the source and destination indices from drag event
  const reorderColumns = (startIndex, endIndex) => {
    const newOrder = Array.isArray(order) ? [...order] : columns.map(col => col.key); // Fallback if order is invalid
    const [movedItem] = newOrder.splice(startIndex, 1);
    newOrder.splice(endIndex, 0, movedItem);
    setOrder(newOrder);
  };

  // Reset to all columns visible (order remains unchanged)
  // Useful for reverting to default visibility
  const resetColumns = () => {
    setVisibleColumns(columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {}));
  };

  return { visibleColumns, toggleColumn, resetColumns, order, reorderColumns };
};

export default useColumnFilter;