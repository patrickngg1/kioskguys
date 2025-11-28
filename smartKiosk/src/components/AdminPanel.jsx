import React, { useState, useEffect } from 'react';
import '../styles/AdminPanel.css';

const to12Hour = (time) => {
  if (!time) return '';

  let [hour, minute] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';

  hour = hour % 12;
  hour = hour || 12;

  return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
};

export default function AdminPanel({
  isOpen,
  onClose,
  user,
  reservations = [],
  itemsByCategory = {},
  rooms = [],
  users = [],
  showToast,
  loadReservations,
}) {
  const [activeSection, setActiveSection] = useState('reservations');
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  if (!isOpen) return null;

  const sections = [
    { key: 'reservations', label: 'Reservations' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'items', label: 'Supply Items' },
    { key: 'banners', label: 'Banner Images' },
    { key: 'users', label: 'Users' },
  ];

  const adminCancelReservation = async (reservationId) => {
    try {
      const res = await fetch(
        `/api/rooms/reservations/${reservationId}/admin-cancel/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'Cancelled by administrator',
          }),
        }
      );

      const data = await res.json();

      if (!data.ok) {
        showToast(
          'Error cancelling reservation: ' + (data.error || 'unknown'),
          'error'
        );
        return;
      }

      showToast('Reservation cancelled successfully', 'success');

      if (typeof loadReservations === 'function') {
        loadReservations();
      }
    } catch (err) {
      console.error(err);
      showToast('Server error while cancelling reservation', 'error');
    }
  };

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
              <ReservationsSection
                reservations={reservations}
                adminCancelReservation={adminCancelReservation}
                setConfirmCancelId={setConfirmCancelId}
              />
            )}

            {activeSection === 'rooms' && (
              <RoomsSection rooms={rooms} showToast={showToast} />
            )}

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

        {/* ----------------------------------------------------------
            Admin Confirmation Modal
        ----------------------------------------------------------- */}
        {confirmCancelId && (
          <div className='modal-overlay'>
            <div className='modal-box'>
              <h2 style={{ marginBottom: '1rem', color: '#fff' }}>
                Cancel Reservation?
              </h2>

              <p style={{ marginBottom: '1.5rem', color: '#cbd5e1' }}>
                This will permanently remove the reservation and notify the
                user. Are you sure you want to continue?
              </p>

              <div
                className='modal-actions'
                style={{
                  display: 'flex',
                  gap: '1rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  className='btn-secondary'
                  onClick={() => setConfirmCancelId(null)}
                >
                  No, Keep
                </button>

                <button
                  className='btn-danger'
                  onClick={() => {
                    adminCancelReservation(confirmCancelId);
                    setConfirmCancelId(null);
                  }}
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ====================================================================== */
/*  Subsections                                                           */
/* ====================================================================== */

function ReservationsSection({
  reservations,
  adminCancelReservation,
  setConfirmCancelId,
}) {
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
                <div className='admin-item-title'>{r.roomName}</div>
                <div className='admin-item-time'>
                  {r.date} — {to12Hour(r.startTime)} to {to12Hour(r.endTime)}
                </div>

                <div className='admin-item-user'>
                  <strong>User:</strong> {r.fullName}
                </div>
                <div className='admin-item-email'>
                  <strong>Email:</strong> {r.email}
                </div>
              </div>

              <div className='admin-list-actions'>
                <button
                  className='admin-pill-button admin-pill-danger'
                  onClick={() => setConfirmCancelId(r.id)}
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

function RoomsSection({ rooms, showToast }) {
  const [roomList, setRoomList] = useState(rooms || []);
  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [roomForm, setRoomForm] = useState({
    id: null,
    name: '',
    capacity: '',
    hasScreen: true,
    hasHdmi: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms/', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast?.(data.error || 'Failed to load rooms', 'error');
        setRoomList([]);
        return;
      }
      setRoomList(data.rooms || []);
    } catch (err) {
      console.error('Load rooms error', err);
      showToast?.('Failed to load rooms', 'error');
      setRoomList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const openAdd = () => {
    setRoomForm({
      id: null,
      name: '',
      capacity: '',
      hasScreen: true,
      hasHdmi: true,
    });
    setShowAddModal(true);
  };

  const openEdit = (room) => {
    setRoomForm({
      id: room.id,
      name: room.name || '',
      capacity: room.capacity ?? '',
      hasScreen: !!room.hasScreen,
      hasHdmi: !!room.hasHdmi,
    });
    setShowEditModal(true);
  };

  const handleFormChange = (field, value) => {
    setRoomForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    // Name required
    if (!roomForm.name.trim()) {
      showToast?.('Room name is required', 'error');
      return;
    }

    // Capacity required and must be >= 1
    const rawCapacity = String(roomForm.capacity ?? '').trim();
    const capacityNumber = Number(rawCapacity);

    if (!rawCapacity || Number.isNaN(capacityNumber) || capacityNumber < 1) {
      showToast?.('Room capacity must be at least 1', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: roomForm.name.trim(),
        capacity: capacityNumber,
        hasScreen: roomForm.hasScreen,
        hasHdmi: roomForm.hasHdmi,
      };

      const isEdit = !!roomForm.id;
      const url = isEdit
        ? `/api/rooms/${roomForm.id}/update/`
        : '/api/rooms/create/';

      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        showToast?.(data.error || 'Unable to save room', 'error');
        return;
      }

      const newRoom = data.room;

      if (isEdit) {
        setRoomList((prev) =>
          prev.map((r) => (r.id === newRoom.id ? newRoom : r))
        );
        showToast?.('Room updated', 'success');
      } else {
        setRoomList((prev) => [...prev, newRoom]);
        showToast?.('Room added', 'success');
      }

      setShowAddModal(false);
      setShowEditModal(false);
    } catch (err) {
      console.error('Save room error', err);
      showToast?.('Unable to save room', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (room) => {
    setDeleteTarget(room);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/rooms/${deleteTarget.id}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        showToast?.(data.error || 'Unable to delete room', 'error');
        return;
      }
      setRoomList((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      showToast?.('Room deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete room error', err);
      showToast?.('Unable to delete room', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Rooms</h2>
        <p className='admin-section-subtitle'>
          Add, rename, and configure conference rooms.
        </p>
      </div>

      <div className='admin-section-toolbar'>
        <button
          type='button'
          className='admin-pill-button admin-pill-primary'
          onClick={openAdd}
        >
          + Add Room
        </button>
      </div>

      {loading && <p className='admin-empty'>Loading rooms…</p>}

      {!loading && (!roomList || roomList.length === 0) && (
        <p className='admin-empty'>No rooms configured yet.</p>
      )}

      {!loading && roomList && roomList.length > 0 && (
        <div className='admin-grid'>
          {roomList.map((room) => (
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
                  className='admin-pill-button admin-pill-subtle'
                  onClick={() => openEdit(room)}
                >
                  Edit
                </button>
                <button
                  type='button'
                  className='admin-pill-button admin-pill-danger'
                  onClick={() => confirmDelete(room)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Room Modal */}
      {(showAddModal || showEditModal) && (
        <div className='modal-overlay'>
          <div className='modal-box' onClick={(e) => e.stopPropagation()}>
            <button
              className='close-btn'
              type='button'
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
            >
              ✕
            </button>

            <h2>{roomForm.id ? 'Edit Room' : 'Add Room'}</h2>

            <div className='form-row' style={{ marginTop: '1rem' }}>
              <div style={{ flex: 2 }}>
                <label>Room Name</label>
                <input
                  type='text'
                  value={roomForm.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder='e.g. Room A'
                />
              </div>
              <div style={{ flex: 1 }}>
                <label>Capacity</label>
                <input
                  type='number'
                  min='1'
                  required
                  value={roomForm.capacity}
                  onChange={(e) => handleFormChange('capacity', e.target.value)}
                  placeholder='8'
                />
              </div>
            </div>

            <div className='form-row'>
              <div>
                <label>Screen</label>
                <select
                  value={roomForm.hasScreen ? 'yes' : 'no'}
                  onChange={(e) =>
                    handleFormChange('hasScreen', e.target.value === 'yes')
                  }
                >
                  <option value='yes'>Yes</option>
                  <option value='no'>No</option>
                </select>
              </div>
              <div>
                <label>HDMI</label>
                <select
                  value={roomForm.hasHdmi ? 'yes' : 'no'}
                  onChange={(e) =>
                    handleFormChange('hasHdmi', e.target.value === 'yes')
                  }
                >
                  <option value='yes'>Yes</option>
                  <option value='no'>No</option>
                </select>
              </div>
            </div>

            <button
              type='button'
              className='btn btn-primary w-full'
              style={{ marginTop: '1.5rem' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? roomForm.id
                  ? 'Saving...'
                  : 'Creating...'
                : roomForm.id
                ? 'Save Changes'
                : 'Create Room'}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className='modal-overlay'>
          <div className='modal-box' onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: '#fff', marginBottom: '0.75rem' }}>
              Delete Room?
            </h2>
            <p style={{ color: '#cbd5e1', marginBottom: '1.5rem' }}>
              This will remove <strong>{deleteTarget.name}</strong>. If there
              are future reservations for this room, deletion may be blocked.
            </p>

            <div
              className='modal-actions'
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
              }}
            >
              <button
                className='btn-secondary'
                type='button'
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Keep Room
              </button>
              <button
                className='btn-danger'
                type='button'
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete Room'}
              </button>
            </div>
          </div>
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
