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
  const [adminReservations, setAdminReservations] = useState([]);
  const [loadingAdminReservations, setLoadingAdminReservations] =
    useState(true);
  // Rooms used for the Reservations filter dropdown
  const [filterRoomsList, setFilterRoomsList] = useState(rooms || []);

  // Reservation filters
  const [filterRoom, setFilterRoom] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterUser, setFilterUser] = useState('');

  // Supply items admin state
  const [adminItemsByCategory, setAdminItemsByCategory] = useState(
    itemsByCategory || {}
  );
  const [loadingItems, setLoadingItems] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const sections = [
    { key: 'reservations', label: 'Reservations' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'items', label: 'Supply Items' },
    { key: 'banners', label: 'Banner Images' },
    { key: 'users', label: 'Users' },
  ];

  // -----------------------------------
  // Reservations loading + admin cancel
  // -----------------------------------
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

      // Refresh both dashboard list and admin list
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

  // -----------------------------------
  // Supply Items loading
  // -----------------------------------
  const loadAdminItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/items/', { credentials: 'include' });
      const data = await res.json();

      if (data.ok) {
        setAdminItemsByCategory(data.categories || {});
      } else {
        setAdminItemsByCategory({});
        if (showToast) {
          showToast(data.error || 'Failed to load items', 'error');
        }
      }
    } catch (err) {
      console.error('Failed to load admin items:', err);
      setAdminItemsByCategory({});
      if (showToast) {
        showToast('Failed to load items', 'error');
      }
    } finally {
      setLoadingItems(false);
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

  const [deleteItemTarget, setDeleteItemTarget] = useState(null);

  const handleDeleteItem = (item) => {
    setDeleteItemTarget(item); // opens premium modal
  };

  // -----------------------------------
  // Effects
  // -----------------------------------
  useEffect(() => {
    if (isOpen) {
      loadAdminReservations();
      loadAdminRooms();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeSection === 'items') {
      loadAdminItems();
    }
  }, [isOpen, activeSection]);

  if (!isOpen) return null;

  // --- FILTERED RESERVATIONS LOGIC ---
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

            {activeSection === 'users' && <UsersSection users={users} />}
          </section>
        </div>

        {/* DELETE SUPPLY ITEM MODAL */}
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

        {/* Reservation cancel confirmation */}
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

        {/* Item add/edit modal */}
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

// ======================================================================
// Subsections
// ======================================================================

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

      {/* Filter bar directly under title/subtitle */}
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

      {/* Delete Confirmation Modal */}
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
          onClick={onAddItem}
        >
          + Add Item
        </button>
      </div>

      {loading && <p className='admin-empty'>Loading items…</p>}

      {!loading && entries.length === 0 && (
        <p className='admin-empty'>No items loaded from backend.</p>
      )}

      {/* 🔥 Scroll container, just like Reservations */}
      {!loading && entries.length > 0 && (
        <div className='admin-list'>
          {entries.map(([category, items]) => (
            <div key={category} className='admin-category-block'>
              <div className='admin-category-header'>
                <div className='admin-category-title'>{category}</div>
                <div className='admin-category-count'>
                  {items?.length || 0} items
                </div>
              </div>

              {/* Grid of cards INSIDE the scrollable list */}
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
                      <div className='admin-card-title'>{item.name}</div>
                      <div className='admin-list-meta admin-list-meta-secondary'>
                        <span>{item.category_name || category}</span>
                        {!item.image && (
                          <span className='admin-inline-note'>
                            No image — using fallback
                          </span>
                        )}
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

function ItemEditModal({ isOpen, onClose, item, itemsByCategory, onSaved }) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.name || '');
  const [categoryKey, setCategoryKey] = useState(item?.category_key || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(item?.image || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

    const trimmedName = name.trim();
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

      // 1) Save name + category
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

      // 2) If there is a new image, upload it
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

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div
        className='premium-modal'
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
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
            alert('Open Upload Banner modal (to implement)');
          }}
        >
          + Upload Banner
        </button>
        <button
          type='button'
          className='admin-pill-button admin-pill-subtle'
          onClick={() => {
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
