import React, { useState } from 'react';
import '../styles/AdminPanel.css';

/**
 * Ultra-premium full-screen Admin Panel
 * - Deep aurora overlay (separate from regular modals)
 * - Left glass sidebar navigation
 * - Right glass content pane with cards/tables
 *
 * Props:
 *  - isOpen
 *  - onClose
 *  - user
 *  - rooms
 *  - reservations
 *  - itemsByCategory
 *  - users
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
  const [activeSection, setActiveSection] = useState('reservations');

  if (!isOpen) return null;

  const sections = [
    { key: 'reservations', label: 'Reservations' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'items', label: 'Supply Items' },
    { key: 'banners', label: 'Banner Images' },
    { key: 'users', label: 'Users' },
  ];

  return (
    <div className='admin-overlay' onClick={onClose}>
      <div
        className='admin-shell'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label='Admin Control Center'
      >
        {/* Close button reused from dashboard styles */}
        <button
          className='close-btn admin-close'
          type='button'
          onClick={onClose}
          aria-label='Close admin panel'
        >
          ✕
        </button>

        {/* Header */}
        <header className='admin-header'>
          <div>
            <div className='admin-title'>Admin Control Center</div>
            <div className='admin-subtitle'>
              Signed in as{' '}
              <span className='admin-identity'>
                {user?.fullName || user?.email}
              </span>
            </div>
          </div>
          <div className='admin-header-meta'>
            <span className='admin-chip'>Role: Administrator</span>
          </div>
        </header>

        {/* Main layout: sidebar + content */}
        <div className='admin-main'>
          {/* Sidebar */}
          <nav className='admin-sidebar' aria-label='Admin sections'>
            {sections.map((s) => (
              <button
                key={s.key}
                type='button'
                className={`admin-nav-item ${
                  activeSection === s.key ? 'active' : ''
                }`}
                onClick={() => setActiveSection(s.key)}
              >
                <span className='admin-nav-pill'>
                  <span className='admin-nav-label'>{s.label}</span>
                </span>
              </button>
            ))}
          </nav>

          {/* Content */}
          <section className='admin-content'>
            {activeSection === 'reservations' && (
              <ReservationsSection reservations={reservations} />
            )}
            {activeSection === 'rooms' && <RoomsSection rooms={rooms} />}
            {activeSection === 'items' && (
              <ItemsSection itemsByCategory={itemsByCategory} />
            )}
            {activeSection === 'banners' && <BannersSection />}
            {activeSection === 'users' && <UsersSection users={users} />}
          </section>
        </div>

        {/* Footer */}
        <footer className='admin-footer'>
          <button
            className='btn btn-primary w-full admin-close-btn'
            type='button'
            onClick={onClose}
          >
            Close Admin Panel
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Subsections                                                           */
/* ====================================================================== */

function ReservationsSection({ reservations }) {
  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Reservations</h2>
        <p className='admin-section-subtitle'>
          View and manage all reservations across the kiosk.
        </p>
      </div>

      {(!reservations || reservations.length === 0) && (
        <p className='admin-empty'>No reservations found.</p>
      )}

      {reservations && reservations.length > 0 && (
        <div className='admin-list'>
          {reservations.map((r) => (
            <div key={r.id} className='admin-list-row'>
              <div className='admin-list-main'>
                <div className='admin-list-title'>
                  {r.roomName || r.room || 'Room'}
                </div>
                <div className='admin-list-meta'>
                  <span>{r.date}</span>
                  <span>
                    {r.startTime} – {r.endTime}
                  </span>
                </div>
                <div className='admin-list-meta admin-list-meta-secondary'>
                  <span>{r.userEmail || r.email}</span>
                </div>
              </div>
              <div className='admin-list-actions'>
                <button
                  type='button'
                  className='admin-pill-button admin-pill-danger'
                  onClick={() => {
                    // TODO: wire backend DELETE /api/rooms/reservations/:id
                    // eslint-disable-next-line no-alert
                    alert(`Cancel reservation ${r.id} (hook backend next)`);
                  }}
                >
                  Cancel Reservation
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomsSection({ rooms }) {
  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Rooms</h2>
        <p className='admin-section-subtitle'>
          Add, remove, and configure conference rooms.
        </p>
      </div>

      <div className='admin-section-toolbar'>
        <button
          type='button'
          className='admin-pill-button admin-pill-primary'
          onClick={() => {
            // TODO: open Add Room glass modal
            alert('Open Add Room modal (to implement)');
          }}
        >
          + Add Room
        </button>
      </div>

      {(!rooms || rooms.length === 0) && (
        <p className='admin-empty'>No rooms configured yet.</p>
      )}

      {rooms && rooms.length > 0 && (
        <div className='admin-grid'>
          {rooms.map((room) => (
            <div key={room.id} className='admin-card'>
              <div className='admin-card-header'>
                <div className='admin-card-title'>{room.name}</div>
                <div className='admin-card-tag'>
                  Capacity: {room.capacity ?? '—'}
                </div>
              </div>
              <div className='admin-card-body'>
                <div className='admin-badge-row'>
                  <span className='admin-badge'>
                    Screen: {room.hasScreen ? 'Yes' : 'No'}
                  </span>
                  <span className='admin-badge'>
                    HDMI: {room.hasHdmi ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
              <div className='admin-card-footer'>
                <button
                  type='button'
                  className='admin-pill-button admin-pill-danger'
                  onClick={() =>
                    // TODO: DELETE /api/rooms/:id
                    alert(`Delete room ${room.id} (hook backend next)`)
                  }
                >
                  Delete Room
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemsSection({ itemsByCategory }) {
  const entries = Object.entries(itemsByCategory || {});

  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Supply Items</h2>
        <p className='admin-section-subtitle'>
          Manage the catalog of items shown in the Request Supplies modal.
        </p>
      </div>

      <div className='admin-section-toolbar'>
        <button
          type='button'
          className='admin-pill-button admin-pill-primary'
          onClick={() => {
            // TODO: Add Item glass modal
            alert('Open Add Item modal (to implement)');
          }}
        >
          + Add Item
        </button>
      </div>

      {entries.length === 0 && (
        <p className='admin-empty'>No items loaded from backend.</p>
      )}

      {entries.length > 0 && (
        <div className='admin-list'>
          {entries.map(([category, items]) => (
            <div key={category} className='admin-category-block'>
              <div className='admin-category-header'>
                <div className='admin-category-title'>{category}</div>
                <div className='admin-category-count'>
                  {items?.length || 0} items
                </div>
              </div>

              {items.map((item) => (
                <div key={item.id} className='admin-list-row'>
                  <div className='admin-list-main'>
                    <div className='admin-list-title'>{item.name}</div>
                    <div className='admin-list-meta admin-list-meta-secondary'>
                      <span>{item.category_name || category}</span>
                      {item.image && (
                        <span className='admin-inline-note'>has image</span>
                      )}
                    </div>
                  </div>
                  <div className='admin-list-actions'>
                    <button
                      type='button'
                      className='admin-pill-button admin-pill-subtle'
                      onClick={() =>
                        alert(`Edit item ${item.id} (hook backend next)`)
                      }
                    >
                      Edit
                    </button>
                    <button
                      type='button'
                      className='admin-pill-button admin-pill-danger'
                      onClick={() =>
                        alert(`Delete item ${item.id} (hook backend next)`)
                      }
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BannersSection() {
  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Banner Images</h2>
        <p className='admin-section-subtitle'>
          Configure the hero banner & potential screensaver slideshow. This
          hooks into your Django <code>/api/ui-assets/</code> layer.
        </p>
      </div>

      <div className='admin-section-toolbar'>
        <button
          type='button'
          className='admin-pill-button admin-pill-primary'
          onClick={() => {
            // TODO: open upload banner modal (future)
            alert('Open Upload Banner modal (to implement)');
          }}
        >
          + Upload Banner
        </button>
        <button
          type='button'
          className='admin-pill-button admin-pill-subtle'
          onClick={() => {
            // TODO: reorder banners UI
            alert('Open banner reorder UI (to implement)');
          }}
        >
          Reorder / Screensaver Settings
        </button>
      </div>

      <p className='admin-empty'>
        Banner management UI coming next — this section is reserved and styled
        so we can plug in image previews & drag-and-drop ordering later.
      </p>
    </div>
  );
}

function UsersSection({ users }) {
  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Users</h2>
        <p className='admin-section-subtitle'>
          See who has logged into the kiosk and toggle admin privileges.
        </p>
      </div>

      {(!users || users.length === 0) && (
        <p className='admin-empty'>No users loaded.</p>
      )}

      {users && users.length > 0 && (
        <div className='admin-list'>
          {users.map((u) => (
            <div key={u.id ?? u.email} className='admin-list-row'>
              <div className='admin-list-main'>
                <div className='admin-list-title'>
                  {u.fullName || u.email || 'User'}
                </div>
                <div className='admin-list-meta admin-list-meta-secondary'>
                  <span>{u.email}</span>
                </div>
              </div>
              <div className='admin-list-actions'>
                <span
                  className={`admin-role-chip ${
                    u.isAdmin ? 'admin-role-admin' : 'admin-role-user'
                  }`}
                >
                  {u.isAdmin ? 'Admin' : 'User'}
                </span>
                <button
                  type='button'
                  className='admin-pill-button admin-pill-subtle'
                  onClick={() =>
                    alert(
                      `Toggle admin for ${u.email} (hook backend toggle next)`
                    )
                  }
                >
                  Toggle Admin
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
