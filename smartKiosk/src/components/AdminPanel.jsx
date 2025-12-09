import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  // --- RESERVATIONS STATE ---
  const [adminReservations, setAdminReservations] = useState([]);
  const [loadingAdminReservations, setLoadingAdminReservations] =
    useState(true);

  // --- ROOMS FILTER STATE ---
  const [filterRoomsList, setFilterRoomsList] = useState(rooms || []);
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');

  // --- ITEMS STATE ---
  const [adminItemsByCategory, setAdminItemsByCategory] = useState(
    itemsByCategory || {}
  );
  const [loadingItems, setLoadingItems] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  // --- USERS STATE ---
  const [adminUsers, setAdminUsers] = useState(users || []);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const sections = [
    { key: 'reservations', label: 'Reservations' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'items', label: 'Supply Items' },
    { key: 'banners', label: 'Banner Images' },
    { key: 'users', label: 'Users' },
  ];

  // 1. Load Reservations
  const loadAdminReservations = async () => {
    setLoadingAdminReservations(true);
    try {
      const res = await fetch('/api/rooms/reservations/all/', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        setAdminReservations(data.reservations || []);
      } else {
        setAdminReservations([]);
      }
    } catch (err) {
      console.error('Failed to load admin reservations:', err);
      setAdminReservations([]);
      if (showToast) {
        showToast('Failed to load reservations', 'error');
      }
    } finally {
      setLoadingAdminReservations(false);
    }
  };

  // 2. Load Rooms (For filters)
  const loadAdminRooms = async () => {
    try {
      const res = await fetch('/api/rooms/', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        setFilterRoomsList(data.rooms || []);
      } else {
        setFilterRoomsList([]);
      }
    } catch (err) {
      console.error('Failed to load rooms for admin filter:', err);
      setFilterRoomsList([]);
    }
  };

  // 3. Load Items
  const loadAdminItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/items/all/', { credentials: 'include' });
      const data = await res.json();

      if (!data.ok) {
        setAdminItemsByCategory({});
        showToast?.(data.error || 'Failed to load items', 'error');
        return;
      }

      const grouped = {};
      for (const item of data.items) {
        const category = item.category_name || 'Uncategorized';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(item);
      }

      setAdminItemsByCategory(grouped);
    } catch (err) {
      console.error('Failed to load admin items:', err);
      setAdminItemsByCategory({});
      showToast?.('Failed to load items', 'error');
    } finally {
      setLoadingItems(false);
    }
  };

  // 4. Load Users
  const loadAdminUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users/', { credentials: 'include' });
      const data = await res.json();

      if (data.ok) {
        setAdminUsers(data.users || []);
      } else {
        setAdminUsers(users || []);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      setAdminUsers(users || []);
    } finally {
      setLoadingUsers(false);
    }
  };

  const toggleUserAdmin = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}/toggle-admin/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (!data.ok) {
        showToast?.(data.error || 'Failed to update role', 'error');
        return;
      }

      setAdminUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin: data.isAdmin } : u))
      );

      showToast?.(
        data.isAdmin ? 'User promoted to Admin' : 'User demoted to User',
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast?.('Server error updating user role', 'error');
    }
  };

  const deleteUser = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (!data.ok) {
        showToast?.(data.error || 'Failed to delete user', 'error');
        return;
      }

      setAdminUsers((prev) => prev.filter((u) => u.id !== userId));

      showToast?.(
        `${data.fullName || 'User'} has been successfully removed.`,
        'success'
      );
    } catch (err) {
      console.error(err);
      showToast?.('Server error deleting user', 'error');
    }
  };

  const adminCancelReservation = async (reservationId) => {
    try {
      const res = await fetch(
        `/api/rooms/reservations/${reservationId}/admin-cancel/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            reason: 'Cancelled by administrator',
          }),
        }
      );
      const data = await res.json();

      if (!data.ok) {
        showToast &&
          showToast(
            'Error cancelling reservation: ' + (data.error || 'unknown'),
            'error'
          );
        return;
      }

      showToast && showToast('Reservation cancelled successfully', 'success');

      if (typeof loadReservations === 'function') {
        loadReservations();
      }
      await loadAdminReservations();
    } catch (err) {
      console.error(err);
      showToast &&
        showToast('Server error while cancelling reservation', 'error');
    }
  };

  const openAddItemModal = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const openEditItemModal = (item) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleItemSaved = () => {
    loadAdminItems();
    if (showToast) {
      showToast('Item saved successfully', 'success');
    }
  };

  const handleDeleteItem = (item) => {
    setDeleteItemTarget(item);
  };

  // Initial load
  useEffect(() => {
    if (isOpen) {
      loadAdminReservations();
      loadAdminRooms();
    }
  }, [isOpen]);

  // Tab Switching Logic
  useEffect(() => {
    if (!isOpen) return;

    switch (activeSection) {
      case 'reservations':
        loadAdminReservations();
        break;
      case 'items':
        loadAdminItems();
        break;
      case 'users':
        loadAdminUsers();
        break;
      case 'rooms':
        // RoomsSection reloads itself on mount
        break;
      default:
        break;
    }
  }, [isOpen, activeSection]);

  if (!isOpen) return null;

  const filteredReservations = adminReservations.filter((r) => {
    const matchesRoom = !filterRoom || r.roomId === Number(filterRoom);
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesUser =
      !filterUser ||
      (r.fullName &&
        r.fullName.toLowerCase().includes(filterUser.toLowerCase())) ||
      (r.email && r.email.toLowerCase().includes(filterUser.toLowerCase()));

    return matchesRoom && matchesDate && matchesUser;
  });

  return (
    <div className='admin-overlay' onClick={onClose}>
      <div
        className='admin-shell'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label='Admin Control Center'
      >
        <button
          className='close-btn admin-close'
          type='button'
          onClick={onClose}
          aria-label='Close admin panel'
        >
          ✕
        </button>

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

        <div className='admin-main'>
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

          <section className='admin-content'>
            {activeSection === 'reservations' && (
              <ReservationsSection
                reservations={filteredReservations}
                adminCancelReservation={adminCancelReservation}
                setConfirmCancelId={setConfirmCancelId}
                loading={loadingAdminReservations}
                filterRoom={filterRoom}
                setFilterRoom={setFilterRoom}
                filterDate={filterDate}
                setFilterDate={setFilterDate}
                filterUser={filterUser}
                setFilterUser={setFilterUser}
                rooms={filterRoomsList}
              />
            )}

            {activeSection === 'rooms' && (
              <RoomsSection rooms={rooms} showToast={showToast} />
            )}

            {activeSection === 'items' && (
              <ItemsSection
                itemsByCategory={adminItemsByCategory}
                loading={loadingItems}
                onAddItem={openAddItemModal}
                onEditItem={openEditItemModal}
                onDeleteItem={handleDeleteItem}
              />
            )}

            {activeSection === 'banners' && <BannersSection />}

            {activeSection === 'users' && (
              <UsersSection
                users={adminUsers}
                loading={loadingUsers}
                toggleUserAdmin={toggleUserAdmin}
                deleteUser={deleteUser}
                setConfirmDeleteUser={setConfirmDeleteUser}
              />
            )}
          </section>
        </div>

        {deleteItemTarget && (
          <div
            className='modal-overlay'
            onClick={() => setDeleteItemTarget(null)}
          >
            <div
              className='premium-modal'
              onClick={(e) => e.stopPropagation()}
              role='dialog'
              aria-modal='true'
            >
              <h2 className='premium-modal-title'>Delete Item?</h2>
              <p className='premium-modal-message'>
                You are about to permanently delete{' '}
                <strong>{deleteItemTarget.name}</strong>.
                <br />
                This action cannot be undone.
              </p>
              <div className='premium-modal-actions'>
                <button
                  className='modal-btn cancel'
                  type='button'
                  onClick={() => setDeleteItemTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className='modal-btn delete'
                  type='button'
                  onClick={async () => {
                    try {
                      const res = await fetch(
                        `/api/items/${deleteItemTarget.id}/delete/`,
                        {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                        }
                      );
                      const data = await res.json();
                      if (!data.ok) throw new Error();
                      showToast?.(
                        `Deleted "${deleteItemTarget.name}"`,
                        'success'
                      );
                      loadAdminItems();
                    } catch {
                      showToast?.('Failed to delete item', 'error');
                    } finally {
                      setDeleteItemTarget(null);
                    }
                  }}
                >
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteUser && (
          <div
            className='modal-overlay'
            onClick={() => setConfirmDeleteUser(null)}
          >
            <div
              className='premium-modal'
              onClick={(e) => e.stopPropagation()}
              role='dialog'
              aria-modal='true'
            >
              <h2 className='premium-modal-title'>Delete User?</h2>

              <p className='premium-modal-message'>
                You are about to permanently delete
                <strong>
                  {' '}
                  {confirmDeleteUser.fullName || confirmDeleteUser.email}{' '}
                </strong>
                .
                <br />
                This action cannot be undone.
              </p>

              <div className='premium-modal-actions'>
                <button
                  className='modal-btn cancel'
                  onClick={() => setConfirmDeleteUser(null)}
                >
                  Keep User
                </button>

                <button
                  className='modal-btn delete'
                  onClick={async () => {
                    await deleteUser(confirmDeleteUser.id);
                    setConfirmDeleteUser(null);
                  }}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        <footer className='admin-footer'>
          <button
            className='btn btn-primary w-full admin-close-btn'
            type='button'
            onClick={onClose}
          >
            Close Admin Panel
          </button>
        </footer>

        {confirmCancelId && (
          <div
            className='modal-overlay'
            onClick={() => setConfirmCancelId(null)}
          >
            <div
              className='premium-modal'
              onClick={(e) => e.stopPropagation()}
              role='dialog'
              aria-modal='true'
            >
              <h2 className='premium-modal-title'>Cancel Reservation?</h2>
              <p className='premium-modal-message'>
                This reservation will be permanently removed and the user will
                be notified.
                <br />
                Are you sure you want to continue?
              </p>
              <div className='premium-modal-actions'>
                <button
                  className='modal-btn cancel'
                  onClick={() => setConfirmCancelId(null)}
                >
                  Keep Reservation
                </button>
                <button
                  className='modal-btn delete'
                  onClick={() => {
                    adminCancelReservation(confirmCancelId);
                    setConfirmCancelId(null);
                  }}
                >
                  Cancel Reservation
                </button>
              </div>
            </div>
          </div>
        )}

        {showItemModal && (
          <ItemEditModal
            isOpen={showItemModal}
            onClose={() => setShowItemModal(false)}
            item={editingItem}
            itemsByCategory={adminItemsByCategory}
            onSaved={handleItemSaved}
          />
        )}
      </div>
    </div>
  );
}

function ReservationsSection({
  reservations,
  adminCancelReservation,
  setConfirmCancelId,
  loading,
  filterRoom,
  setFilterRoom,
  filterDate,
  setFilterDate,
  filterUser,
  setFilterUser,
  rooms,
}) {
  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Reservations</h2>
        <p className='admin-section-subtitle'>
          View and manage all reservations across the kiosk.
        </p>
      </div>
      <div className='admin-filter-bar'>
        <select
          value={filterRoom}
          onChange={(e) => setFilterRoom(e.target.value)}
          className='admin-filter-input'
        >
          <option value=''>All Rooms</option>
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </select>
        <input
          type='date'
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className='admin-filter-input'
        />
        <input
          type='text'
          value={filterUser}
          onChange={(e) => setFilterUser(e.target.value)}
          className='admin-filter-input'
          placeholder='Search user…'
        />
      </div>
      {loading ? (
        <div className='admin-loading'>
          <div className='admin-spinner'></div>
          <p className='admin-loading-text'>Loading reservations...</p>
        </div>
      ) : reservations.length === 0 ? (
        <p className='admin-empty'>No reservations found.</p>
      ) : (
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
    if (!roomForm.name.trim()) {
      showToast?.('Room name is required', 'error');
      return;
    }
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
      <div
        className='admin-section-header'
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 className='admin-section-title'>Rooms</h2>
          <p className='admin-section-subtitle'>
            Add, rename, and configure conference rooms.
          </p>
        </div>
        <button
          type='button'
          className='admin-pill-button admin-pill-primary'
          onClick={openAdd}
        >
          + Add Room
        </button>
      </div>

      {loading ? (
        <div className='admin-loading'>
          <div className='admin-spinner'></div>
          <p className='admin-loading-text'>Loading rooms...</p>
        </div>
      ) : !roomList || roomList.length === 0 ? (
        <p className='admin-empty'>No rooms configured yet.</p>
      ) : (
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

      {(showAddModal || showEditModal) && (
        <div className='modal-overlay'>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
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

      {deleteTarget && (
        <div className='modal-overlay' onClick={() => setDeleteTarget(null)}>
          <div
            className='premium-modal'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
          >
            <h2 className='premium-modal-title'>Delete Room?</h2>
            <p className='premium-modal-message'>
              You are about to delete <strong>{deleteTarget.name}</strong>.
              <br />
              If this room has future reservations, deletion may be blocked.
            </p>
            <div className='premium-modal-actions'>
              <button
                className='modal-btn cancel'
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Keep Room
              </button>
              <button
                className='modal-btn delete'
                disabled={deleting}
                onClick={handleDelete}
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

function ItemsSection({
  itemsByCategory,
  loading,
  onAddItem,
  onEditItem,
  onDeleteItem,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const highlightMatch = (text) => {
    if (!searchQuery.trim()) return text;

    const query = searchQuery.trim().toLowerCase();
    const lower = text.toLowerCase();

    const parts = [];
    let i = 0;

    while (i < text.length) {
      const matchIndex = lower.indexOf(query, i);
      if (matchIndex === -1) {
        parts.push(text.slice(i));
        break;
      }

      if (matchIndex > i) {
        parts.push(text.slice(i, matchIndex));
      }

      parts.push(
        <span key={matchIndex} className='highlight-text'>
          {text.slice(matchIndex, matchIndex + query.length)}
        </span>
      );

      i = matchIndex + query.length;
    }

    return parts;
  };

  const entries = Object.entries(itemsByCategory || {})
    .map(([category, items]) => {
      const filteredItems = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return [category, filteredItems];
    })
    .filter(([_, items]) => items.length > 0);

  return (
    <div className='admin-section'>
      <div
        className='admin-section-header'
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 className='admin-section-title'>Supply Items</h2>
          <p className='admin-section-subtitle'>
            Manage the catalog of items shown in the Request Supplies modal.
          </p>
        </div>
        <button
          type='button'
          className='admin-pill-button admin-pill-primary'
          onClick={onAddItem}
        >
          + Add Item
        </button>
      </div>

      <div className='admin-filter-bar' style={{ marginTop: '1rem' }}>
        <input
          type='text'
          className='admin-filter-input'
          placeholder='Search items…'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className='admin-loading'>
          <div className='admin-spinner'></div>
          <p className='admin-loading-text'>Loading items...</p>
        </div>
      ) : entries.length === 0 ? (
        searchQuery.trim().length > 0 ? (
          <p className='admin-empty'>No matching items found.</p>
        ) : (
          <p className='admin-empty'>No items loaded from backend.</p>
        )
      ) : (
        <div className='admin-list'>
          {entries.map(([category, items]) => (
            <div key={category} className='admin-category-block'>
              <div className='admin-category-header'>
                <div className='admin-category-title'>{category}</div>
                <div className='admin-category-count'>
                  {items?.length || 0} items
                </div>
              </div>

              <div className='admin-grid'>
                {items.map((item) => (
                  <div key={item.id} className='admin-card admin-item-card'>
                    <div className='admin-card-header admin-item-card-header'>
                      <div className='admin-item-thumb'>
                        {item.image ? (
                          <img src={item.image} alt={item.name} />
                        ) : (
                          <div className='admin-item-placeholder'>
                            {(item.name || '?').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='admin-card-body admin-item-card-body'>
                      <div className='admin-card-title'>
                        {highlightMatch(item.name)}
                      </div>
                      <div className='admin-list-meta admin-list-meta-secondary'>
                        <span>
                          {item.category_name ||
                            item.category ||
                            'Uncategorized'}
                        </span>
                      </div>
                    </div>

                    <div className='admin-card-footer admin-item-card-footer'>
                      <button
                        type='button'
                        className='admin-pill-button admin-pill-subtle'
                        onClick={() => onEditItem(item)}
                      >
                        Edit
                      </button>

                      <button
                        type='button'
                        className='admin-pill-button admin-pill-danger'
                        onClick={() => onDeleteItem(item)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BannersSection() {
  const [banners, setBanners] = useState([]);
  const [bannerTitle, setBannerTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [confirmDeactivateBanner, setConfirmDeactivateBanner] = useState(null);
  const [confirmDeleteBanner, setConfirmDeleteBanner] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [scheduleDrafts, setScheduleDrafts] = useState({});

  const openPreview = (banner) => {
    setPreviewBanner(banner);
  };

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/banners/', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        const list = data.banners || [];
        setBanners(list);

        // Seed per-banner schedule drafts from backend
        setScheduleDrafts(() => {
          const drafts = {};
          list.forEach((b) => {
            drafts[b.id] = {
              start_date: b.start_date || '',
              end_date: b.end_date || '',
            };
          });
          return drafts;
        });
      } else {
        setBanners([]);
      }
    } catch (err) {
      console.error('Failed to load banners:', err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleUpload = async () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('label', bannerTitle);

    try {
      const res = await fetch('/api/banners/upload/', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setShowUploadModal(false);
        setUploadFile(null);
        setBannerTitle('');
        loadBanners();
      } else {
        alert(data.error || 'Upload failed.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed');
    }
  };

  const handleClearSchedule = async (id) => {
    const formData = new FormData();
    formData.append('start_date', '');
    formData.append('end_date', '');

    try {
      const res = await fetch(`/api/banners/${id}/schedule/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || 'Failed to clear schedule.');
        return;
      }
      loadBanners();
    } catch (err) {
      console.error('Clear schedule error:', err);
      alert('Failed to clear schedule.');
    }
  };

  const activateBanner = async (id) => {
    try {
      const res = await fetch(`/api/banners/${id}/activate/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        loadBanners();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBanner = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      const res = await fetch(`/api/banners/${id}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        loadBanners();
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save schedule only (S1 behavior)
  const handleSaveSchedule = async (id) => {
    const draft = scheduleDrafts[id] || {};
    const formData = new FormData();

    if (draft.start_date) {
      formData.append('start_date', draft.start_date);
    }
    if (draft.end_date) {
      formData.append('end_date', draft.end_date);
    }

    try {
      const res = await fetch(`/api/banners/${id}/schedule/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.error || 'Failed to save schedule.');
        return;
      }
      loadBanners();
    } catch (err) {
      console.error('Schedule save error:', err);
      alert('Failed to save schedule.');
    }
  };

  const computeStatus = (b) => {
    const today = new Date().toISOString().slice(0, 10);
    const { start_date, end_date, is_active } = b;

    let statusText = '';
    let chipClass = 'banner-status-chip';
    let scheduleText = 'No schedule';

    if (start_date || end_date) {
      if (start_date && end_date) {
        scheduleText = `${start_date} → ${end_date}`;
      } else if (start_date) {
        scheduleText = `From ${start_date}`;
      } else if (end_date) {
        scheduleText = `Until ${end_date}`;
      }
    }

    if (is_active) {
      statusText = 'Active';
    } else if (end_date && today > end_date) {
      statusText = 'Expired';
      chipClass += ' expired';
    } else if (start_date && today < start_date) {
      statusText = 'Scheduled';
      chipClass += ' scheduled';
    } else if (start_date || end_date) {
      statusText = 'Inactive';
      chipClass += ' scheduled';
    } else {
      statusText = 'No Schedule';
      chipClass += ' scheduled';
    }

    return { statusText, chipClass, scheduleText };
  };

  return (
    <div className='admin-section'>
      <div
        className='admin-section-header'
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 className='admin-section-title'>Banner Images</h2>
          <p className='admin-section-subtitle'>
            Upload seasonal images to display on the Kiosk welcome screen.
          </p>
        </div>
        <button
          type='button'
          className='admin-pill-button admin-pill-primary'
          onClick={() => setShowUploadModal(true)}
        >
          + Upload Banner
        </button>
      </div>

      {loading ? (
        <div className='admin-loading'>
          <div className='admin-spinner'></div>
          <p className='admin-loading-text'>Loading banners...</p>
        </div>
      ) : banners.length === 0 ? (
        <p className='admin-empty'>No banners uploaded yet.</p>
      ) : (
        <div className='admin-grid'>
          {banners.map((b) => {
            const { statusText, chipClass } = computeStatus(b);

            return (
              <div
                key={b.id}
                className={`admin-card banner-card ${
                  b.is_active ? 'active' : ''
                }`}
              >
                <div className='admin-card-header'>
                  <img
                    src={b.image_url}
                    alt='Banner'
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '10px',
                    }}
                    onClick={() => openPreview(b)}
                  />
                </div>

                {/* TITLE + STATUS */}
                <div
                  className='admin-card-body'
                  style={{ textAlign: 'center' }}
                >
                  <div className='banner-title'>
                    {b.label && b.label.trim() !== '' ? b.label : '(No title)'}
                  </div>
                  <div className='banner-meta-row'>
                    <span className={chipClass}>{statusText}</span>
                  </div>
                </div>

                {/* SCHEDULING (P1 stacked layout) */}
                <div className='admin-card-body banner-schedule-block'>
                  <div className='form-row'>
                    <label>Start Date</label>
                    <input
                      type='date'
                      value={
                        (scheduleDrafts[b.id] &&
                          scheduleDrafts[b.id].start_date) ||
                        b.start_date ||
                        ''
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setScheduleDrafts((prev) => ({
                          ...prev,
                          [b.id]: {
                            ...(prev[b.id] || {}),
                            start_date: value,
                          },
                        }));
                      }}
                    />
                  </div>

                  <div className='form-row'>
                    <label>End Date</label>
                    <input
                      type='date'
                      value={
                        (scheduleDrafts[b.id] &&
                          scheduleDrafts[b.id].end_date) ||
                        b.end_date ||
                        ''
                      }
                      onChange={(e) => {
                        const value = e.target.value;
                        setScheduleDrafts((prev) => ({
                          ...prev,
                          [b.id]: {
                            ...(prev[b.id] || {}),
                            end_date: value,
                          },
                        }));
                      }}
                    />
                  </div>

                  <div
                    className='form-row'
                    style={{
                      marginTop: '1rem',
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <button
                      type='button'
                      className='admin-pill-button admin-pill-subtle'
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveSchedule(b.id);
                      }}
                    >
                      Save Schedule
                    </button>

                    {(b.start_date || b.end_date) && (
                      <button
                        type='button'
                        className='admin-pill-button admin-pill-danger'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearSchedule(b.id);
                        }}
                      >
                        Clear Schedule
                      </button>
                    )}
                  </div>

                  <div
                    className='admin-list-meta admin-list-meta-secondary'
                    style={{ marginTop: '0.5rem', textAlign: 'center' }}
                  >
                    {b.start_date || b.end_date ? (
                      <span>
                        Scheduled: {b.start_date ? b.start_date : '—'} to{' '}
                        {b.end_date ? b.end_date : '—'}
                      </span>
                    ) : (
                      <span>No schedule set.</span>
                    )}
                  </div>
                </div>

                {/* BUTTONS */}
                <div className='admin-card-footer' style={{ gap: '0.5rem' }}>
                  {!b.is_active && (
                    <button
                      className='admin-pill-button admin-pill-primary'
                      onClick={() => activateBanner(b.id)}
                    >
                      Set Active
                    </button>
                  )}

                  {b.is_active && (
                    <button
                      className='admin-pill-button admin-pill-subtle'
                      onClick={() => setConfirmDeactivateBanner(b)}
                    >
                      Remove Active
                    </button>
                  )}

                  <button
                    className='admin-pill-button admin-pill-danger'
                    onClick={() => setConfirmDeleteBanner(b)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUploadModal && (
        <div className='modal-overlay'>
          <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
            <button
              className='close-btn'
              onClick={() => {
                setUploadFile(null);
                setBannerTitle('');
                setShowUploadModal(false);
              }}
            >
              ✕
            </button>

            <h2>Upload Banner</h2>

            <div style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
              <div className='form-row'>
                <label>Banner Title</label>
                <input
                  type='text'
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder='e.g. Winter Break 2024'
                />
              </div>

              <div className='form-row' style={{ marginTop: '1.25rem' }}>
                <label>Banner Image</label>
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => setUploadFile(e.target.files[0])}
                />
              </div>

              <div
                className='form-row'
                style={{
                  marginTop: '2rem',
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                }}
              >
                <button
                  type='button'
                  className='btn btn-primary'
                  style={{
                    width: '50%',
                    maxWidth: '260px',
                    textAlign: 'center',
                  }}
                  onClick={handleUpload}
                >
                  Upload Banner
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDeactivateBanner && (
        <div
          className='modal-overlay'
          onClick={() => setConfirmDeactivateBanner(null)}
        >
          <div
            className='premium-modal'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
          >
            <h2 className='premium-modal-title'>Remove Active Banner?</h2>

            <p className='premium-modal-message'>
              This will deactivate the current banner and return the kiosk to
              its default background.
            </p>

            <div className='premium-modal-actions'>
              <button
                className='modal-btn cancel'
                onClick={() => setConfirmDeactivateBanner(null)}
              >
                Keep Active
              </button>

              <button
                className='modal-btn delete'
                onClick={async () => {
                  try {
                    const res = await fetch('/api/banners/deactivate/', {
                      method: 'POST',
                      credentials: 'include',
                    });
                    const data = await res.json();
                    if (!data.ok) throw new Error();

                    loadBanners();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setConfirmDeactivateBanner(null);
                  }
                }}
              >
                Remove Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteBanner && (
        <div
          className='modal-overlay'
          onClick={() => setConfirmDeleteBanner(null)}
        >
          <div
            className='premium-modal'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
          >
            <h2 className='premium-modal-title'>Delete Banner?</h2>

            <p className='premium-modal-message'>
              Are you sure you want to permanently delete this banner? This
              action cannot be undone.
            </p>

            <div className='premium-modal-actions'>
              <button
                className='modal-btn cancel'
                onClick={() => setConfirmDeleteBanner(null)}
              >
                Cancel
              </button>

              <button
                className='modal-btn delete'
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/banners/${confirmDeleteBanner.id}/delete/`,
                      {
                        method: 'POST',
                        credentials: 'include',
                      }
                    );
                    const data = await res.json();

                    if (!data.ok) throw new Error();

                    loadBanners();
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setConfirmDeleteBanner(null);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {previewBanner && (
        <div className='modal-overlay' onClick={() => setPreviewBanner(null)}>
          <div className='preview-modal' onClick={(e) => e.stopPropagation()}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={previewBanner.image_url}
                alt='Banner Preview'
                className='preview-banner-img'
              />

              <button
                className='preview-close-x'
                onClick={() => setPreviewBanner(null)}
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersSection({
  users,
  loading,
  toggleUserAdmin,
  deleteUser,
  setConfirmDeleteUser,
}) {
  return (
    <div className='admin-section'>
      <div className='admin-section-header'>
        <h2 className='admin-section-title'>Users</h2>
        <p className='admin-section-subtitle'>
          See who uses the kiosk and manage their access.
        </p>
      </div>

      {loading ? (
        <div className='admin-loading'>
          <div className='admin-spinner'></div>
          <p className='admin-loading-text'>Loading users...</p>
        </div>
      ) : !users || users.length === 0 ? (
        <p className='admin-empty'>No users found.</p>
      ) : (
        <div className='admin-list'>
          {users.map((u) => (
            <div key={u.id} className='admin-list-row'>
              <div className='admin-list-main'>
                <div className='admin-item-title'>{u.fullName || u.email}</div>
                <div className='admin-list-meta admin-list-meta-secondary'>
                  {u.email}
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
                  onClick={() => toggleUserAdmin(u.id)}
                >
                  {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </button>

                <button
                  type='button'
                  className='admin-pill-button admin-pill-danger'
                  onClick={() => setConfirmDeleteUser(u)}
                >
                  Delete User
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ======================================================================
// FIXED ItemEditModal (With Portal)
// ======================================================================

function ItemEditModal({ isOpen, onClose, item, itemsByCategory, onSaved }) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || '');
  const [categoryKey, setCategoryKey] = useState(item?.category_key || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(item?.image || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageURL, setGeneratedImageURL] = useState(null);

  const categoryOptions = React.useMemo(() => {
    const opts = [];
    const seen = new Set();
    Object.entries(itemsByCategory || {}).forEach(([label, items]) => {
      if (!items || !items.length) return;
      const any = items[0];
      if (any.category_key && !seen.has(any.category_key)) {
        seen.add(any.category_key);
        opts.push({ key: any.category_key, label });
      }
    });
    return opts;
  }, [itemsByCategory]);

  useEffect(() => {
    if (!isOpen) return;
    setName(item?.name || '');
    setCategoryKey(item?.category_key || '');
    setNewCategoryName('');
    setImageFile(null);
    setPreviewUrl(item?.image || null);
    setSaving(false);
    setError('');
  }, [isOpen, item]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = name
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    const payload = {
      id: item?.id || null,
      name: trimmedName,
    };

    if (categoryKey && categoryKey !== '__new__') {
      payload.category_key = categoryKey;
    } else if (categoryKey === '__new__' && newCategoryName.trim()) {
      payload.new_category_name = newCategoryName.trim();
    }

    try {
      setSaving(true);
      const res = await fetch('/api/items/save/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Failed to save item');
      }

      let savedItem = data.item;

      if (imageFile) {
        const formData = new FormData();
        formData.append('file', imageFile);

        const imgRes = await fetch(`/api/items/${savedItem.id}/upload-image/`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        const imgData = await imgRes.json();
        if (!imgData.ok) {
          console.error('Image upload failed:', imgData.error);
        } else if (imgData.image) {
          savedItem = { ...savedItem, image: imgData.image };
        }
      } else if (generatedImageURL) {
        savedItem = { ...savedItem, image: generatedImageURL };
      }

      onSaved && onSaved(savedItem);
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className='modal-overlay'
      onClick={onClose}
      style={{
        display: 'flex',
        padding: '2rem 0',
        overflowY: 'auto',
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className='premium-modal'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        style={{
          margin: 'auto',
          maxHeight: 'none',
          height: 'auto',
          overflow: 'visible',
        }}
      >
        <button
          type='button'
          className='close-btn'
          onClick={onClose}
          aria-label='Close'
        >
          ✕
        </button>

        <h2>{isEdit ? 'Edit Supply Item' : 'Add Supply Item'}</h2>

        <form onSubmit={handleSubmit} className='reserve-form'>
          {error && <p className='admin-error-text'>{error}</p>}

          <div className='form-row'>
            <div>
              <label>Item name</label>
              <input
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., AA Batteries'
              />
            </div>

            <div>
              <label>Category</label>
              <select
                value={categoryKey || ''}
                onChange={(e) => setCategoryKey(e.target.value)}
              >
                <option value=''>Select existing…</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
                <option value='__new__'>+ New category…</option>
              </select>
            </div>
          </div>

          {categoryKey === '__new__' && (
            <div className='form-row'>
              <div>
                <label>New category name</label>
                <input
                  type='text'
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder='e.g., Storage Closet'
                />
              </div>
            </div>
          )}

          <div className='form-row'>
            <div>
              <label>Item image (optional)</label>
              <input
                type='file'
                accept='image/*'
                onChange={handleImageChange}
              />
            </div>

            <div className='item-preview-field'>
              <label>Preview</label>
              <div className='admin-item-thumb admin-item-thumb-preview'>
                {previewUrl ? (
                  <img src={previewUrl} alt='Preview' />
                ) : (
                  <div className='admin-item-placeholder'>
                    {(name || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {name.trim() !== '' && (
            <div className='admin-ai-block'>
              <label className='admin-ai-label'>
                AI Image Prompt (optional)
              </label>

              <textarea
                readOnly
                className='admin-ai-prompt'
                value={`A 50×50 Apple-style photorealistic product render of ${name} on a bright navy blue gradient background, polished metal look, subtle reflections, centered product shot.`}
              />

              <div className='admin-ai-hint'>
                Use this prompt in ChatGPT to generate a matching 50×50 supply
                item image.
              </div>

              <div className='admin-ai-actions'>
                <button
                  type='button'
                  className='admin-pill-button admin-pill-primary'
                  onClick={(e) => {
                    const prompt = `A 50×50 Apple-style photorealistic product render of ${name} on a bright navy blue gradient background, polished metal look, subtle reflections, centered product shot.`;

                    navigator.clipboard.writeText(prompt);

                    const btn = e.target;
                    const original = btn.textContent;

                    btn.textContent = 'Copied!';
                    btn.classList.add('copied');

                    setTimeout(() => {
                      btn.textContent = original;
                      btn.classList.remove('copied');
                    }, 2000);
                  }}
                >
                  Copy Prompt
                </button>
              </div>
            </div>
          )}

          <button
            type='submit'
            className='btn btn-primary w-full mt-2'
            disabled={saving}
          >
            {saving
              ? isEdit
                ? 'Saving…'
                : 'Creating…'
              : isEdit
              ? 'Save Changes'
              : 'Create Item'}
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
}
