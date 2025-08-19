import React from 'react';

/**
 * A reusable pagination component.
 * It renders the pagination controls based on the total number of items.
 *
 * @param {object} props - The component props.
 * @param {number} props.currentPage - The currently active page.
 * @param {number} props.totalItems - The total number of items across all pages.
 * @param {number} props.itemsPerPage - The number of items displayed per page.
 * @param {function} props.onPageChange - The function to call when a new page is selected.
 */
function Pagination({ currentPage, totalItems, itemsPerPage, onPageChange }) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // If there's only one page or no items, don't render the pagination controls.
  if (totalPages <= 1) {
    return null;
  }
  
  // A helper function to create page numbers with logic for ellipses (...)
  // to avoid showing too many page numbers.
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Max number of page buttons to show
    const halfPages = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow + 2) {
      // If total pages are few, show all of them.
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Logic for many pages: show first, last, and pages around current.
      pageNumbers.push(1); // Always show the first page

      if (currentPage > halfPages + 2) {
        pageNumbers.push('...');
      }

      let start = Math.max(2, currentPage - halfPages);
      let end = Math.min(totalPages - 1, currentPage + halfPages);

      if (currentPage < halfPages + 2) {
        end = maxPagesToShow;
      }
      if (currentPage > totalPages - (halfPages + 1)) {
        start = totalPages - (maxPagesToShow - 1);
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }

      if (currentPage < totalPages - (halfPages + 1)) {
        pageNumbers.push('...');
      }
      
      pageNumbers.push(totalPages); // Always show the last page
    }

    return pageNumbers;
  };

  return (
    <nav aria-label="Page navigation">
      <ul className="pagination justify-content-end">
        {/* Previous Button */}
        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
        </li>
        
        {/* Page Number Buttons */}
        {getPageNumbers().map((page, index) => (
          <li
            key={index}
            className={`page-item ${page === '...' ? 'disabled' : ''} ${currentPage === page ? 'active' : ''}`}
          >
            <button
              className="page-link"
              onClick={() => page !== '...' && onPageChange(page)}
              disabled={page === '...'}
            >
              {page}
            </button>
          </li>
        ))}

        {/* Next Button */}
        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
          <button
            className="page-link"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default Pagination;