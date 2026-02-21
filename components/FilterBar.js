'use client'

export default function FilterBar({ filters, onFilterChange }) {
  return (
    <div 
      className="filter-bar"
      style={{
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1.5rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }}
    >
      <div style={{ fontWeight: '500', color: '#333', width: '100%', marginBottom: '0.5rem' }}>Filters:</div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 150px', minWidth: '150px' }}>
        <label style={{ fontSize: '0.75rem', color: '#666' }}>Vehicle Type</label>
        <select
          value={filters.vehicleType || ''}
          onChange={(e) => onFilterChange({ ...filters, vehicleType: e.target.value })}
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.875rem',
            width: '100%'
          }}
        >
          <option value="">All Types</option>
          <option value="TRUCK">Truck</option>
          <option value="VAN">Van</option>
          <option value="BIKE">Bike</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 150px', minWidth: '150px' }}>
        <label style={{ fontSize: '0.75rem', color: '#666' }}>Status</label>
        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.875rem',
            width: '100%'
          }}
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_TRIP">On Trip</option>
          <option value="IN_SHOP">In Shop</option>
          <option value="OUT_OF_SERVICE">Out of Service</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 150px', minWidth: '150px' }}>
        <label style={{ fontSize: '0.75rem', color: '#666' }}>Region</label>
        <input
          type="text"
          value={filters.region || ''}
          onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}
          placeholder="Enter region"
          style={{
            padding: '0.5rem',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '0.875rem',
            width: '100%'
          }}
        />
      </div>

      {(filters.vehicleType || filters.status || filters.region) && (
        <button
          onClick={() => onFilterChange({ vehicleType: '', status: '', region: '' })}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.875rem',
            flex: '0 1 auto',
            whiteSpace: 'nowrap'
          }}
        >
          Clear Filters
        </button>
      )}
    </div>
  )
}
