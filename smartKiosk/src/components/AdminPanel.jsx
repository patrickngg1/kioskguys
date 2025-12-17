import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/AdminPanel.css';
import '../styles/PremiumModal.css';
import PremiumInput from './PremiumInput';
import '../styles/PremiumInput.css';

// ... [Keep existing to12Hour function and imports] ...

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
  // ... [Keep existing AdminPanel logic, states, and load functions] ...

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

  // ... [Keep all load functions: loadAdminReservations, loadAdminRooms, etc.] ...

  const loadAdminReservations = async () => {
    setLoadingAdminReservations(true);
    try {
      const res = await fetch('/api/rooms/reservations/all/', {
        credentials: 'include',
      });
      const data = await res.json();
      setAdminReservations(data.ok ? data.reservations || [] : []);
    } catch (err) {
      console.error(err);
      setAdminReservations([]);
    } finally {
      setLoadingAdminReservations(false);
    }
  };

  const loadAdminRooms = async () => {
    try {
      const res = await fetch('/api/rooms/', { credentials: 'include' });
      const data = await res.json();
      setFilterRoomsList(data.ok ? data.rooms || [] : []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAdminItems = async () => {
    setLoadingItems(true);
    try {
      const res = await fetch('/api/items/all/', { credentials: 'include' });
      const data = await res.json();
      if (!data.ok) {
        setAdminItemsByCategory({});
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
      console.error(err);
    } finally {
      setLoadingItems(false);
    }
  };

  const loadAdminUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/users/', { credentials: 'include' });
      const data = await res.json();
      setAdminUsers(data.ok ? data.users || [] : users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // ... [Keep toggleUserAdmin, deleteUser, adminCancelReservation, etc.] ...

  const toggleUserAdmin = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}/toggle-admin/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) return showToast?.(data.error, 'error');
      setAdminUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isAdmin: data.isAdmin } : u))
      );
      showToast?.(data.isAdmin ? 'User promoted' : 'User demoted', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (userId) => {
    try {
      const res = await fetch(`/api/users/${userId}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) return showToast?.(data.error, 'error');
      setAdminUsers((prev) => prev.filter((u) => u.id !== userId));
      showToast?.('User removed', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const adminCancelReservation = async (reservationId) => {
    try {
      const res = await fetch(
        `/api/rooms/reservations/${reservationId}/admin-cancel/`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ reason: 'Cancelled by administrator' }),
        }
      );
      const data = await res.json();
      if (data.ok) {
        showToast?.('Reservation cancelled', 'success');
        if (typeof loadReservations === 'function') loadReservations();
        await loadAdminReservations();
      }
    } catch (err) {
      console.error(err);
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
    showToast?.('Item saved', 'success');
  };
  const handleDeleteItem = (item) => {
    setDeleteItemTarget(item);
  };

  useEffect(() => {
    if (isOpen) {
      loadAdminReservations();
      loadAdminRooms();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeSection === 'reservations') loadAdminReservations();
    if (activeSection === 'items') loadAdminItems();
    if (activeSection === 'users') loadAdminUsers();
  }, [isOpen, activeSection]);

  if (!isOpen) return null;

  const filteredReservations = adminReservations.filter((r) => {
    const matchesRoom = !filterRoom || r.roomId === Number(filterRoom);
    const matchesDate = !filterDate || r.date === filterDate;
    const matchesUser =
      !filterUser ||
      (r.fullName &&
        r.fullName.toLowerCase().includes(filterUser.toLowerCase()));
    return matchesRoom && matchesDate && matchesUser;
  });

  return (
    <div className='admin-overlay'>
      <div
        className='admin-shell'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
      >
        <button
          className='close-btn admin-close'
          type='button'
          onClick={onClose}
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
          <nav className='admin-sidebar'>
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
            {/* Pass showToast to BannersSection so it can notify users */}
            {activeSection === 'banners' && (
              <BannersSection showToast={showToast} />
            )}
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

        {/* --- GLOBAL MODALS (Items, Users, Reservations) --- */}
        {deleteItemTarget && (
          <div className='modal-overlay'>
            <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
              <h2 className='premium-modal-title'>Delete Item?</h2>
              <p className='premium-modal-message'>
                You are about to permanently delete{' '}
                <strong>{deleteItemTarget.name}</strong>.<br />
                This action cannot be undone.
              </p>
              <div className='premium-modal-actions'>
                <button
                  className='modal-btn cancel'
                  onClick={() => setDeleteItemTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className='modal-btn delete'
                  onClick={async () => {
                    try {
                      await fetch(`/api/items/${deleteItemTarget.id}/delete/`, {
                        method: 'POST',
                        credentials: 'include',
                      });
                      showToast?.(
                        `Deleted "${deleteItemTarget.name}"`,
                        'success'
                      );
                      loadAdminItems();
                    } catch {
                      showToast?.('Failed to delete item', 'error');
                    }
                    setDeleteItemTarget(null);
                  }}
                >
                  Delete Item
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteUser && (
          <div className='modal-overlay'>
            <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
              <h2 className='premium-modal-title'>Delete User?</h2>
              <p className='premium-modal-message'>
                You are about to permanently delete{' '}
                <strong>
                  {confirmDeleteUser.fullName || confirmDeleteUser.email}
                </strong>
                .<br />
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

        {confirmCancelId && (
          <div
            className='modal-overlay'
            onClick={() => setConfirmCancelId(null)}
          >
            <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
              <h2 className='premium-modal-title'>Cancel Reservation?</h2>
              <p className='premium-modal-message'>
                This reservation will be permanently removed.
                <br />
                Are you sure?
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

// ... [Keep ReservationsSection, RoomsSection, ItemsSection as they are] ...
// (I will omit repeating them here for brevity, assume they are unchanged)
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
  // ... existing code ...
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
  // ... existing code ...
  const [roomList, setRoomList] = useState(rooms || []);
  const [loading, setLoading] = useState(false); // ✅ Logic exists, just wasn't used

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  // Form State
  const [roomForm, setRoomForm] = useState({
    id: null,
    name: '',
    capacity: '',
    features: [],
  });

  const [featureInput, setFeatureInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rooms/', { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setRoomList(data.rooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const openAdd = () => {
    setModalMode('create');
    setRoomForm({ id: null, name: '', capacity: '', features: [] });
    setShowModal(true);
  };

  const openEdit = (room) => {
    setModalMode('edit');
    let feats = room.features || [];
    if (feats.length === 0) {
      if (room.hasScreen) feats.push('Screen');
      if (room.hasHdmi) feats.push('HDMI');
    }
    setRoomForm({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      features: [...new Set(feats)],
    });
    setShowModal(true);
  };

  const addFeature = (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter') return;
    if (e.type === 'keydown') e.preventDefault();

    let val = featureInput.trim();
    if (val) {
      val = val.charAt(0).toUpperCase() + val.slice(1);
      if (!roomForm.features.includes(val)) {
        setRoomForm((prev) => ({ ...prev, features: [...prev.features, val] }));
      }
      setFeatureInput('');
    }
  };

  const removeFeature = (feat) => {
    setRoomForm((prev) => ({
      ...prev,
      features: prev.features.filter((f) => f !== feat),
    }));
  };

  const handleSave = async () => {
    if (!roomForm.name) return showToast('Name is required', 'error');
    setSaving(true);
    try {
      const url =
        modalMode === 'edit'
          ? `/api/rooms/${roomForm.id}/update/`
          : '/api/rooms/create/';

      const res = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomForm.name,
          capacity: parseInt(roomForm.capacity),
          features: roomForm.features,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        showToast(
          `Room ${modalMode === 'edit' ? 'updated' : 'created'} successfully`,
          'success'
        );
        setShowModal(false);
        loadRooms();
      } else {
        let msg = data.error || 'Failed to save changes.';
        if (
          msg.includes('{') ||
          msg.includes('[') ||
          msg.includes('IntegrityError')
        ) {
          msg = 'Could not save room. Name might already exist.';
        }
        showToast(msg, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network connection error. Try again.', 'error');
    } finally {
      setSaving(false);
    }
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

      if (res.ok && data.ok) {
        loadRooms();
        setDeleteTarget(null);
        showToast('Room deleted successfully', 'success');
      } else {
        let msg = data.error || 'Cannot delete room.';
        if (msg.includes('reservations'))
          msg = 'Cannot delete: Room has future reservations.';
        showToast(msg, 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Network error while deleting.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // --- PORTAL HELPER FOR NESTED MODALS ---
  const ModalPortal = ({ children }) => {
    return createPortal(
      <div
        className='premium-modal-overlay'
        style={{ zIndex: 99999, backdropFilter: 'blur(8px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>,
      document.body
    );
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
          className='admin-pill-button admin-pill-primary'
          onClick={openAdd}
        >
          + Add Room
        </button>
      </div>

      {/* ✅ ADDED: Loading State */}
      {loading ? (
        <div className='admin-loading'>
          <div className='admin-spinner'></div>
          <p className='admin-loading-text'>Loading rooms...</p>
        </div>
      ) : (
        <div className='admin-grid'>
          {roomList.map((room) => (
            <div key={room.id} className='admin-card'>
              <div className='admin-card-header'>
                <div className='admin-card-title'>{room.name}</div>
                <div className='admin-card-tag'>Capacity: {room.capacity}</div>
              </div>

              <div className='admin-card-body'>
                <div className='admin-badge-row' style={{ flexWrap: 'wrap' }}>
                  {room.features && room.features.length > 0 ? (
                    room.features.map((f, i) => (
                      <span key={i} className='admin-badge'>
                        {f}
                      </span>
                    ))
                  ) : (
                    <span className='admin-badge' style={{ opacity: 0.6 }}>
                      Standard
                    </span>
                  )}
                </div>
              </div>

              <div className='admin-card-footer'>
                <button
                  className='admin-pill-button admin-pill-subtle'
                  onClick={() => openEdit(room)}
                >
                  Edit
                </button>
                <button
                  className='admin-pill-button admin-pill-danger'
                  onClick={() => setDeleteTarget(room)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT/ADD MODAL (Portaled) */}
      {showModal &&
        createPortal(
          <div className='modal-overlay' style={{ zIndex: 99999 }}>
            <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
              <button className='close-btn' onClick={() => setShowModal(false)}>
                ✕
              </button>

              <h2 className='premium-modal-title'>
                {modalMode === 'edit' ? 'Edit Room' : 'Add Room'}
              </h2>

              {/* Room name + capacity */}
              <div className='form-row' style={{ marginBottom: '1.2rem' }}>
                <div style={{ flex: 2 }}>
                  <label>Room Name</label>
                  <PremiumInput
                    value={roomForm.name}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, name: e.target.value })
                    }
                    placeholder='e.g. Conference Room A'
                  />
                </div>

                <div style={{ flex: 1 }}>
                  <label>Capacity</label>
                  <PremiumInput
                    type='number'
                    value={roomForm.capacity}
                    onChange={(e) =>
                      setRoomForm({ ...roomForm, capacity: e.target.value })
                    }
                    placeholder='8'
                  />
                </div>
              </div>

              {/* Amenities */}
              <div className='form-row'>
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <label style={{ marginBottom: '10px' }}>
                    Amenities & Features
                  </label>

                  <div
                    className='admin-tag-input-container'
                    style={{ width: '320px' }}
                  >
                    {/* Chips */}
                    <div
                      className='admin-tag-chip-row'
                      style={{
                        justifyContent: 'center',
                      }}
                    >
                      {roomForm.features.map((feat) => (
                        <span key={feat} className='admin-tag-chip'>
                          {feat}
                          <button
                            type='button'
                            onClick={() => removeFeature(feat)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Input + add */}
                    <div
                      className='admin-tag-input-row'
                      style={{
                        justifyContent: 'center',
                        paddingTop: '6px',
                      }}
                    >
                      <input
                        type='text'
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        onKeyDown={addFeature}
                        placeholder='Add a feature…'
                        className='admin-tag-input-field'
                      />

                      <button
                        type='button'
                        className='admin-tag-add-btn'
                        onClick={addFeature}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
                className='premium-modal-actions'
                style={{ marginTop: '2rem' }}
              >
                <button
                  className='premium-btn cancel'
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>

                <button
                  className='premium-btn primary'
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Room'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* DELETE CONFIRM (Portaled) */}
      {deleteTarget &&
        createPortal(
          <div className='modal-overlay' style={{ zIndex: 99999 }}>
            <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
              <h2 className='premium-modal-title'>Delete Room?</h2>
              <p className='premium-modal-message'>
                Are you sure you want to delete{' '}
                <strong>{deleteTarget.name}</strong>?
              </p>
              <div className='premium-modal-actions'>
                <button
                  className='premium-btn cancel'
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button
                  className='premium-btn delete'
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>,
          document.body
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

      <div className='admin-filter-bar' style={{ marginTop: '0.5rem' }}>
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

// ----------------------------------------------------------------------------------
// UPDATED BANNERS SECTION - Now uses Premium Modal for Delete
// ----------------------------------------------------------------------------------

function BannersSection({ showToast }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  // Edit / preview / delete state
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [confirmDeleteBanner, setConfirmDeleteBanner] = useState(null);

  const loadBanners = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/banners/', { credentials: 'include' });
      const data = await res.json();
      setBanners(data.ok ? data.banners || [] : []);
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

  const openPreview = (banner) => setPreviewBanner(banner);

  const setBannerActiveState = async (id, shouldActivate) => {
    try {
      const endpoint = shouldActivate
        ? `/api/banners/${id}/activate/`
        : `/api/banners/${id}/deactivate/`;

      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Action failed');

      showToast?.(
        shouldActivate ? 'Banner activated' : 'Banner deactivated',
        'success'
      );

      loadBanners();
    } catch (err) {
      console.error(err);
      showToast?.(
        shouldActivate
          ? 'Failed to activate banner'
          : 'Failed to deactivate banner',
        'error'
      );
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('label', bannerTitle);
    formData.append('link', bannerLink);

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
        setBannerLink('');
        showToast?.('Banner uploaded', 'success');
        loadBanners();
      } else {
        showToast?.(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast?.('Upload failed', 'error');
    }
  };

  const handleBannerSaved = () => {
    setEditingBanner(null);
    loadBanners();
  };

  const handleDeleteClick = (banner) => setConfirmDeleteBanner(banner);

  const executeDeleteBanner = async () => {
    if (!confirmDeleteBanner) return;
    try {
      await fetch(`/api/banners/${confirmDeleteBanner.id}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      showToast?.('Banner deleted successfully', 'success');
      loadBanners();
    } catch (err) {
      console.error(err);
      showToast?.('Failed to delete banner', 'error');
    } finally {
      setConfirmDeleteBanner(null);
    }
  };

  const computeStatus = (b) => {
    const today = new Date().toISOString().slice(0, 10);
    const { start_date, end_date, is_active, repeat_yearly } = b;

    // Base
    let statusText = 'No schedule';
    let chipClass = 'banner-status-chip';

    // Time-window awareness (future-proof; backend can interpret however it wants)
    if (is_active) {
      statusText = 'Active';
      chipClass += ' active';
    } else if (start_date || end_date) {
      if (start_date && today < start_date) {
        statusText = 'Scheduled';
        chipClass += ' scheduled';
      } else if (end_date && today > end_date) {
        statusText = 'Expired';
        chipClass += ' expired';
      } else {
        statusText = 'Scheduled';
        chipClass += ' scheduled';
      }
    } else {
      chipClass += ' noschedule';
    }

    const dateParts = [];
    if (start_date) dateParts.push(start_date);
    if (end_date) dateParts.push(end_date);
    const dateRange = dateParts.length ? dateParts.join(' → ') : '';

    return {
      statusText,
      chipClass,
      dateRange,
      repeatText: repeat_yearly ? 'Repeats yearly' : '',
    };
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
            const { statusText, chipClass, dateRange, repeatText } =
              computeStatus(b);

            return (
              <div
                key={b.id}
                className={`admin-card banner-card
                ${b.is_active ? 'active' : ''}
                ${
                  !b.is_active &&
                  (b.start_date || b.end_date) &&
                  statusText === 'Scheduled'
                    ? 'scheduled'
                    : ''
                }
                ${statusText === 'Expired' ? 'expired' : ''}
              `}
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
                      cursor: 'pointer',
                    }}
                    onClick={() => openPreview(b)}
                  />
                </div>

                <div
                  className='admin-card-body'
                  style={{ textAlign: 'center', marginBottom: '0.5rem' }}
                >
                  <div className='banner-title'>{b.label || '(No title)'}</div>

                  {b.link && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#60a5fa',
                        marginTop: '4px',
                      }}
                    >
                      🔗 Has QR Link
                    </div>
                  )}

                  <div className='banner-meta-row'>
                    <span className={chipClass}>{statusText}</span>
                  </div>

                  {(dateRange || repeatText) && (
                    <div className='banner-schedule-summary'>
                      {dateRange && (
                        <div className='banner-date-range'>{dateRange}</div>
                      )}
                      {repeatText && (
                        <div className='banner-repeat'>{repeatText}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className='banner-card-footer'>
                  <button
                    className={`admin-pill-button ${
                      b.is_active ? 'admin-pill-subtle' : 'admin-pill-primary'
                    }`}
                    onClick={() => setBannerActiveState(b.id, !b.is_active)}
                  >
                    {b.is_active ? 'Deactivate' : 'Set Active'}
                  </button>

                  <button
                    className='admin-pill-button admin-pill-subtle'
                    onClick={() => setEditingBanner(b)}
                    aria-label='Edit banner'
                    title='Edit'
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Banner Confirmation (PORTALED – FIXED) */}
      {confirmDeleteBanner &&
        createPortal(
          <div
            className='modal-overlay'
            style={{
              zIndex: 99999,
              backdropFilter: 'blur(8px)',
            }}
            onClick={() => setConfirmDeleteBanner(null)}
          >
            <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
              <h2 className='premium-modal-title'>Delete Banner?</h2>
              <p className='premium-modal-message'>
                You are about to permanently delete{' '}
                <strong>{confirmDeleteBanner.label || 'this banner'}</strong>.
                <br />
                This action cannot be undone.
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
                  onClick={executeDeleteBanner}
                >
                  Delete Banner
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Upload Modal — Updated to match Premium Style */}
      {showUploadModal && (
        <div className='modal-overlay' style={{ zIndex: 99999 }}>
          <div
            className='premium-modal'
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }} /* Consistent width */
          >
            <button
              className='close-btn'
              onClick={() => setShowUploadModal(false)}
            >
              ✕
            </button>

            <h2 className='premium-modal-title'>Upload Banner</h2>

            {/* Title Input */}
            <div className='form-row'>
              <label>Title</label>
              <PremiumInput
                type='text'
                value={bannerTitle}
                onChange={(e) => setBannerTitle(e.target.value)}
                placeholder='e.g. Winter Break'
              />
            </div>

            {/* Link Input */}
            <div className='form-row'>
              <label>Link / URL (Optional)</label>
              <PremiumInput
                type='text'
                value={bannerLink}
                onChange={(e) => setBannerLink(e.target.value)}
                placeholder='https://uta.edu...'
              />
            </div>

            {/* File Input */}
            <div className='form-row'>
              <label>Image</label>
              <PremiumInput
                type='file'
                accept='image/*'
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </div>

            {/* Actions */}
            <div
              className='premium-modal-actions'
              style={{ marginTop: '2rem' }}
            >
              <button
                className='premium-btn cancel'
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </button>
              <button className='premium-btn primary' onClick={handleUpload}>
                Upload Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBanner && (
        <BannerEditModal
          isOpen={!!editingBanner}
          onClose={() => setEditingBanner(null)}
          banner={editingBanner}
          onSaved={handleBannerSaved}
          onRequestDelete={handleDeleteClick}
          showToast={showToast}
        />
      )}

      {/* Preview Modal */}
      {previewBanner && (
        <div className='modal-overlay'>
          <div className='preview-modal' onClick={(e) => e.stopPropagation()}>
            <img
              src={previewBanner.image_url}
              alt='Preview'
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
      )}
    </div>
  );
}

function BannerEditModal({
  isOpen,
  onClose,
  banner,
  onSaved,
  onRequestDelete,
  showToast,
}) {
  const [label, setLabel] = useState(banner?.label || '');
  const [link, setLink] = useState(banner?.link || '');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(banner?.image_url || null);

  // Scheduling
  const [startDate, setStartDate] = useState(banner?.start_date || '');
  const [endDate, setEndDate] = useState(banner?.end_date || '');
  const [repeatYearly, setRepeatYearly] = useState(!!banner?.repeat_yearly);
  const [scheduleError, setScheduleError] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!banner) return;
    setLabel(banner.label || '');
    setLink(banner.link || '');
    setPreviewUrl(banner.image_url);
    setImageFile(null);

    setStartDate(banner.start_date || '');
    setEndDate(banner.end_date || '');
    setRepeatYearly(!!banner.repeat_yearly);
    setScheduleError('');
  }, [banner]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const validateSchedule = () => {
    setScheduleError('');
    if (repeatYearly && (!startDate || !endDate)) {
      setScheduleError('Yearly repeat requires both start and end dates.');
      return false;
    }
    if (startDate && endDate && endDate < startDate) {
      setScheduleError('End date must be after start date.');
      return false;
    }
    return true;
  };

  const saveSchedule = async () => {
    const scheduleData = new FormData();
    scheduleData.append('start_date', startDate || '');
    scheduleData.append('end_date', endDate || '');
    scheduleData.append('repeat_yearly', repeatYearly ? 'true' : 'false');

    const res = await fetch(`/api/banners/${banner.id}/schedule/`, {
      method: 'POST',
      credentials: 'include',
      body: scheduleData,
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Failed to save schedule');
  };

  const handleSave = async () => {
    if (!validateSchedule()) return;
    setSaving(true);

    const formData = new FormData();
    formData.append('label', label);
    formData.append('link', link);
    if (imageFile) formData.append('file', imageFile);

    try {
      // 1) Save metadata/image
      const res = await fetch(`/api/banners/${banner.id}/update/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Update failed');

      // 2) Save schedule
      await saveSchedule();

      showToast?.('Banner updated', 'success');
      onSaved?.();
    } catch (err) {
      console.error(err);
      showToast?.(err.message || 'Update error', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className='modal-overlay' style={{ zIndex: 99999 }}>
      <div
        className='premium-modal'
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }} /* Matches Upload Banner width */
      >
        <button className='close-btn' onClick={onClose} aria-label='Close'>
          ✕
        </button>

        {/* Updated Class to match others */}
        <h2 className='premium-modal-title'>Edit Banner</h2>

        <div className='form-row'>
          <label>Banner Title</label>
          <PremiumInput
            type='text'
            value={label}
            placeholder='e.g. Independence Day'
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        <div className='form-row'>
          <label>Link / URL (Optional)</label>
          <PremiumInput
            type='text'
            value={link}
            placeholder='https://uta.edu...'
            onChange={(e) => setLink(e.target.value)}
          />
        </div>

        <div className='form-row'>
          <label>Replace Image (Optional)</label>
          <PremiumInput
            type='file'
            accept='image/*'
            onChange={handleImageChange}
          />
        </div>

        {previewUrl && (
          <div className='banner-preview-container'>
            <img
              src={previewUrl}
              alt='Preview'
              className='banner-preview-img-large'
            />
          </div>
        )}

        {/* Scheduling Section */}
        <div
          className='banner-schedule-section'
          style={{
            marginTop: '1.5rem',
            paddingTop: '1.2rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <h3
            style={{
              margin: '0 0 1rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#fff',
            }}
          >
            Display Schedule
          </h3>

          <div className='form-row'>
            <label>Start Date</label>
            <PremiumInput
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className='form-row'>
            <label>End Date</label>
            <PremiumInput
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className='form-row' style={{ marginTop: '0.8rem' }}>
            <div className='repeat-checkbox-row'>
              <label className='premium-checkbox'>
                <input
                  type='checkbox'
                  checked={repeatYearly}
                  onChange={(e) => setRepeatYearly(e.target.checked)}
                />
                <span className='checkbox-ui' />
                <span className='checkbox-label'>Repeat every year</span>
              </label>
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                opacity: 0.6,
                marginTop: '4px',
                marginLeft: '28px',
              }}
            >
              Useful for recurring holidays like Thanksgiving or July 4th.
            </div>
          </div>

          {(startDate || endDate || repeatYearly) && (
            <div
              style={{
                marginTop: '1rem',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <button
                type='button'
                className='admin-pill-button admin-pill-subtle'
                style={{ fontSize: '0.75rem', padding: '0.4rem 1rem' }}
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                  setRepeatYearly(false);
                  setScheduleError('');
                }}
              >
                Clear Schedule
              </button>
            </div>
          )}

          {scheduleError && (
            <div
              style={{
                marginTop: '0.8rem',
                color: '#ff8888',
                fontSize: '0.9rem',
                textAlign: 'center',
              }}
            >
              {scheduleError}
            </div>
          )}
        </div>

        {/* Actions - Consistent Order & Classes */}
        <div className='premium-modal-actions' style={{ marginTop: '2rem' }}>
          <button
            className='premium-btn cancel'
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            className='premium-btn danger'
            onClick={() => onRequestDelete?.(banner)}
            disabled={saving}
          >
            Delete
          </button>

          <button
            className='premium-btn primary'
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
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
// FIXED ItemEditModal (With Portal) — Matches Edit Room Styles Exactly
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

  // Generate options for the Select dropdown
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
      style={{
        zIndex: 99999,
        backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className='premium-modal'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        // Matched Edit Room sizing logic
        style={{
          width: '720px',
          maxWidth: '92vw',
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

        <h2 className='premium-modal-title'>
          {isEdit ? 'Edit Supply Item' : 'Add Supply Item'}
        </h2>

        {/* REMOVED className='reserve-form' 
           Now it inherits standard premium-modal input styles (darker glass) 
        */}
        <form onSubmit={handleSubmit}>
          {error && (
            <p className='admin-error-text' style={{ marginBottom: '1rem' }}>
              {error}
            </p>
          )}

          {/* Row 1: Name & Category - Matched Layout to Edit Room */}
          <div className='form-row' style={{ marginBottom: '1.2rem' }}>
            <div style={{ flex: 2 }}>
              <label>Item Name</label>
              <PremiumInput
                type='text'
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., AA Batteries'
              />
            </div>

            <div style={{ flex: 1 }}>
              <label>Category</label>
              <PremiumInput
                as='select'
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
              </PremiumInput>
            </div>
          </div>

          {/* Conditional New Category Row */}
          {categoryKey === '__new__' && (
            <div className='form-row' style={{ marginBottom: '1.2rem' }}>
              <div style={{ flex: 1 }}>
                <label>New Category Name</label>
                <PremiumInput
                  type='text'
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder='e.g., Storage Closet'
                />
              </div>
            </div>
          )}

          {/* Row 2: Image & Preview */}
          <div className='form-row' style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 2 }}>
              <label>Item Image (Optional)</label>
              <PremiumInput
                type='file'
                accept='image/*'
                onChange={handleImageChange}
              />
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.85rem',
                  opacity: 0.6,
                }}
              >
                Recommended size: 500x500px, PNG or JPG.
              </div>
            </div>

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <label style={{ marginBottom: '10px' }}>Preview</label>
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

          {/* AI Prompt Section */}
          {name.trim() !== '' && (
            <div className='admin-ai-block' style={{ marginTop: '2rem' }}>
              <label className='admin-ai-label'>
                AI Image Prompt (Optional)
              </label>

              <PremiumInput
                as='textarea'
                value={`A 50×50 Apple-style photorealistic product render of ${name} on a bright navy blue gradient background, polished metal look, subtle reflections, centered product shot.`}
                readOnly
                className='admin-ai-prompt-premium'
              />

              <div
                className='admin-ai-actions'
                style={{ justifyContent: 'flex-end', marginTop: '0.8rem' }}
              >
                <button
                  type='button'
                  className='admin-pill-button admin-pill-subtle'
                  onClick={(e) => {
                    const prompt = `A 50×50 Apple-style photorealistic product render of ${name} on a bright navy blue gradient background, polished metal look, subtle reflections, centered product shot.`;
                    navigator.clipboard.writeText(prompt);
                    const btn = e.target;
                    const original = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                      btn.textContent = original;
                    }, 2000);
                  }}
                >
                  Copy Prompt
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div
            className='premium-modal-actions'
            style={{ marginTop: '2.5rem' }}
          >
            <button
              type='button'
              className='premium-btn cancel' // Changed from modal-btn to match Edit Room
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type='submit'
              className='premium-btn primary' // Changed from modal-btn to match Edit Room
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
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
