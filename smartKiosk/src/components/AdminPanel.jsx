import React, { useState } from 'react';

/**
 * Full-screen Admin Panel overlay.
 * Reuses Dashboard.css modal styles:
 * - modal-overlay
 * - modal-box
 * - close-btn
 * - btn btn-primary w-full
 */
export default function AdminPanel({
  isOpen,
  onClose,
  user,
  rooms = [],
  reservations = [],
  itemsByCategory = {},
  users = [],
}) {
  const [activeTab, setActiveTab] = useState('reservations');

  if (!isOpen) return null;

  const tabs = [
    { key: 'reservations', label: 'Reservations' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'items', label: 'Supply Items' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <div className='modal-overlay' style={{ zIndex: 9999 }} onClick={onClose}>
      <div
        className='modal-box inactivity-modal-enter'
        style={{
          width: '92vw',
          height: '88vh',
          maxWidth: '1400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          padding: '1.5rem 1.6rem',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (same class as inactivity modal) */}
        <button className='close-btn' onClick={onClose}>
          ✕
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '1.35rem', fontWeight: 700 }}>
            Admin Panel
          </div>
          <div style={{ opacity: 0.7 }}>
            Signed in as {user?.fullName || user?.email}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.6rem',
            flexWrap: 'wrap',
            marginTop: '0.25rem',
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              className='btn btn-primary'
              style={{
                padding: '0.5rem 0.9rem',
                borderRadius: '999px',
                opacity: activeTab === t.key ? 1 : 0.6,
                transform: activeTab === t.key ? 'translateY(-1px)' : 'none',
              }}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            paddingRight: '0.25rem',
            marginTop: '0.5rem',
          }}
        >
          {activeTab === 'reservations' && (
            <AdminReservations reservations={reservations} />
          )}

          {activeTab === 'rooms' && <AdminRooms rooms={rooms} />}

          {activeTab === 'items' && (
            <AdminItems itemsByCategory={itemsByCategory} />
          )}

          {activeTab === 'users' && <AdminUsers users={users} />}
        </div>

        {/* Footer actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className='btn btn-primary w-full' onClick={onClose}>
            Close Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Subviews (simple premium tables) ---------------- */

function AdminReservations({ reservations }) {
  if (!reservations?.length) {
    return <p style={{ opacity: 0.7 }}>No reservations found.</p>;
  }

  return (
    <div>
      <h3 style={{ marginBottom: '0.75rem' }}>All Reservations</h3>
      <div className='admin-table'>
        {reservations.map((r) => (
          <div
            key={r.id}
            className='admin-row'
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              marginBottom: '0.6rem',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <div>
              <div style={{ fontWeight: 700 }}>{r.roomName}</div>
              <div style={{ opacity: 0.8, fontSize: '0.95rem' }}>{r.date}</div>
            </div>
            <div>
              {r.startTime} – {r.endTime}
            </div>
            <div style={{ opacity: 0.8 }}>{r.userEmail || r.email}</div>
            <button
              className='btn btn-primary'
              style={{ background: '#d72638' }}
              onClick={() => {
                // We'll wire backend cancel later
                alert(`Cancel reservation ${r.id} (hook backend next)`);
              }}
            >
              Cancel
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminRooms({ rooms }) {
  return (
    <div>
      <h3 style={{ marginBottom: '0.75rem' }}>Rooms</h3>

      <button
        className='btn btn-primary'
        style={{ marginBottom: '1rem' }}
        onClick={() => alert('Open Add Room modal next')}
      >
        + Add Room
      </button>

      {!rooms?.length ? (
        <p style={{ opacity: 0.7 }}>No rooms found.</p>
      ) : (
        rooms.map((room) => (
          <div
            key={room.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 0.7fr 0.7fr auto',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              marginBottom: '0.6rem',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ fontWeight: 700 }}>{room.name}</div>
            <div>Capacity: {room.capacity}</div>
            <div>
              Screen: {room.hasScreen ? 'Yes' : 'No'} / HDMI:{' '}
              {room.hasHdmi ? 'Yes' : 'No'}
            </div>
            <button
              className='btn btn-primary'
              style={{ background: '#d72638' }}
              onClick={() =>
                alert(`Delete room ${room.id} (hook backend next)`)
              }
            >
              Delete
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function AdminItems({ itemsByCategory }) {
  const categories = Object.entries(itemsByCategory || {});
  if (!categories.length) {
    return <p style={{ opacity: 0.7 }}>No items loaded.</p>;
  }

  return (
    <div>
      <h3 style={{ marginBottom: '0.75rem' }}>Supply Items</h3>

      <button
        className='btn btn-primary'
        style={{ marginBottom: '1rem' }}
        onClick={() => alert('Open Add Item modal next')}
      >
        + Add Item
      </button>

      {categories.map(([cat, items]) => (
        <div key={cat} style={{ marginBottom: '1.2rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>{cat}</div>

          {items.map((it) => (
            <div
              key={it.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr auto',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                marginBottom: '0.5rem',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <div>{it.name}</div>
              <div style={{ opacity: 0.8 }}>{it.category_name || cat}</div>
              <button
                className='btn btn-primary'
                style={{ background: '#d72638' }}
                onClick={() =>
                  alert(`Delete item ${it.id} (hook backend next)`)
                }
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function AdminUsers({ users }) {
  return (
    <div>
      <h3 style={{ marginBottom: '0.75rem' }}>Users</h3>

      {!users?.length ? (
        <p style={{ opacity: 0.7 }}>No users loaded.</p>
      ) : (
        users.map((u) => (
          <div
            key={u.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 0.7fr auto',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              marginBottom: '0.6rem',
              background: 'rgba(255,255,255,0.06)',
            }}
          >
            <div style={{ fontWeight: 700 }}>{u.fullName || u.email}</div>
            <div style={{ opacity: 0.8 }}>{u.email}</div>
            <div>{u.isAdmin ? 'Admin' : 'User'}</div>
            <button
              className='btn btn-primary'
              onClick={() =>
                alert(`Toggle admin for ${u.email} (hook backend next)`)
              }
            >
              Toggle Admin
            </button>
          </div>
        ))
      )}
    </div>
  );
}
