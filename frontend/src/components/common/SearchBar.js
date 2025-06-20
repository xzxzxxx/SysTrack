import React from 'react';

function SearchBar({ value, onChange, placeholder, isSearching }) {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="input-group">
      <input
        type="text"
        className="form-control"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
      {value && (
        <div className="input-group-append">
          <button className="btn btn-outline-secondary" type="button" onClick={handleClear}>
            ×
          </button>
        </div>
      )}
      {isSearching && <small className="text-muted mt-1">Searching...</small>}
    </div>
  );
}

export default SearchBar;