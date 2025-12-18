import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import '../styles/AdminPanel.css';
import '../styles/PremiumModal.css';
import PremiumInput from './PremiumInput';
import '../styles/PremiumInput.css';

// --- 1 TRILLION DOLLAR ANIMATIONS (Embedded for Instant Power) ---
const PREMIUM_STYLES = `
  @keyframes premium-shake {
    0%, 100% { transform: translateX(0); }
    20%, 60% { transform: translateX(-6px); }
    40%, 80% { transform: translateX(6px); }
  }
  
  /* ERROR STATE (Red) - Added Extra Padding Here */
  .smart-submit-btn.error {
    background: linear-gradient(135deg, #ef4444, #b91c1c) !important;
    box-shadow: 0 0 25px rgba(239, 68, 68, 0.6) !important;
    animation: premium-shake 0.4s ease-in-out;
    border: 1px solid rgba(255,255,255,0.2) !important;
    cursor: not-allowed;
    
    /* 1 TRILLION DOLLAR PADDING FIX */
    padding-left: 3rem !important;
    padding-right: 3rem !important;
    min-width: 200px !important;
    white-space: nowrap !important;
  }

  /* WARNING STATE (Amber) - Added Extra Padding Here */
  .smart-submit-btn.warning {
    background: linear-gradient(135deg, #f59e0b, #d97706) !important; /* Amber */
    box-shadow: 0 0 25px rgba(245, 158, 11, 0.6) !important;
    animation: premium-shake 0.4s ease-in-out;
    cursor: not-allowed;
    
    /* 1 TRILLION DOLLAR PADDING FIX */
    padding-left: 3rem !important;
    padding-right: 3rem !important;
    min-width: 200px !important;
    white-space: nowrap !important;
  }

  /* Disabled state for Dirty Checking */
  .smart-submit-btn:disabled:not(.error):not(.warning):not(.loading):not(.success) {
    opacity: 0.5;
    background: rgba(255,255,255,0.1) !important;
    box-shadow: none !important;
    cursor: not-allowed;
    filter: grayscale(1);
  }
`;

// --- HELPER: Smart Button Inner Content ---
const SmartButtonContent = ({
  btnState,
  idleText,
  loadingText,
  successText,
  errorText,
}) => (
  <>
    {/* Layer 1: Idle Text */}
    <span className={`btn-text-layer ${btnState === 'idle' ? 'visible' : ''}`}>
      {idleText}
    </span>

    {/* Layer 2: Loading Spinner */}
    <span
      className={`btn-text-layer ${btnState === 'loading' ? 'visible' : ''}`}
    >
      <span
        className='spinner-loader'
        style={{ width: '14px', height: '14px', borderWidth: '2px' }}
      ></span>
      {loadingText && <span>{loadingText}</span>}
    </span>

    {/* Layer 3: Success Checkmark */}
    <span
      className={`btn-text-layer ${btnState === 'success' ? 'visible' : ''}`}
    >
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='3.5'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M20 6L9 17l-5-5'></path>
      </svg>
      {successText}
    </span>

    {/* Layer 4: Error/Warning */}
    <span
      className={`btn-text-layer ${
        btnState === 'error' || btnState === 'warning' ? 'visible' : ''
      }`}
    >
      <svg
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='3'
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle cx='12' cy='12' r='10'></circle>
        <line x1='12' y1='8' x2='12' y2='12'></line>
        <line x1='12' y1='16' x2='12.01' y2='16'></line>
      </svg>
      {errorText}
    </span>
  </>
);

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

  // --- GLOBAL MODAL ACTION STATES ---
  const [globalActionState, setGlobalActionState] = useState('idle');

  // --- RESERVATIONS STATE ---
  const [adminReservations, setAdminReservations] = useState([]);
  const [loadingAdminReservations, setLoadingAdminReservations] =
    useState(true);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

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

  // --- USERS STATE ---
  const [adminUsers, setAdminUsers] = useState(users || []);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const sections = [
    { key: 'reservations', label: 'Reservations' },
    { key: 'rooms', label: 'Rooms' },
    { key: 'items', label: 'Supply Items' },
    { key: 'banners', label: 'Banner Images' },
    { key: 'users', label: 'Users' },
  ];

  // --- LOADERS ---
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

  // --- ACTIONS ---

  const deleteUser = async (userId) => {
    setGlobalActionState('loading');
    try {
      const res = await fetch(`/api/users/${userId}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) {
        showToast?.(data.error, 'error');
        setGlobalActionState('idle');
        return;
      }

      setGlobalActionState('success');
      setTimeout(() => {
        setAdminUsers((prev) => prev.filter((u) => u.id !== userId));
        setConfirmDeleteUser(null);
        setGlobalActionState('idle');
      }, 1500);
    } catch (err) {
      console.error(err);
      showToast?.('Network error', 'error');
      setGlobalActionState('idle');
    }
  };

  const adminCancelReservation = async (reservationId) => {
    setGlobalActionState('loading');
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
        if (typeof loadReservations === 'function') loadReservations();
        loadAdminReservations();
        setConfirmCancelId(null);
        setGlobalActionState('idle');
      } else {
        showToast?.(data.error || 'Failed to cancel', 'error');
        setGlobalActionState('idle');
      }
    } catch (err) {
      console.error(err);
      showToast?.('Network error', 'error');
      setGlobalActionState('idle');
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
  };
  const handleDeleteItem = (item) => {
    setDeleteItemTarget(item);
  };

  const executeDeleteItem = async () => {
    if (!deleteItemTarget) return;
    setGlobalActionState('loading');
    try {
      await fetch(`/api/items/${deleteItemTarget.id}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      setGlobalActionState('success');
      setTimeout(() => {
        loadAdminItems();
        setDeleteItemTarget(null);
        setGlobalActionState('idle');
      }, 1500);
    } catch {
      showToast?.('Failed to delete item', 'error');
      setGlobalActionState('idle');
    }
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
      <style>{PREMIUM_STYLES}</style>
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
            {activeSection === 'banners' && (
              <BannersSection showToast={showToast} />
            )}
            {activeSection === 'users' && (
              <UsersSection
                users={adminUsers}
                loading={loadingUsers}
                setAdminUsers={setAdminUsers}
                setConfirmDeleteUser={setConfirmDeleteUser}
                showToast={showToast}
              />
            )}
          </section>
        </div>

        {/* --- GLOBAL DELETE ITEM MODAL (PORTAL VERSION) --- */}
        {deleteItemTarget &&
          createPortal(
            <div
              className='modal-overlay'
              onClick={() => {
                // Only allow closing via overlay if not currently deleting
                if (globalActionState === 'idle') setDeleteItemTarget(null);
              }}
            >
              <div
                className='premium-modal'
                onClick={(e) => e.stopPropagation()}
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
                    className='premium-btn cancel'
                    onClick={() => setDeleteItemTarget(null)}
                    disabled={globalActionState !== 'idle'}
                  >
                    Keep Item
                  </button>
                  <button
                    className={`premium-btn delete smart-submit-btn ${globalActionState}`}
                    onClick={executeDeleteItem}
                    disabled={globalActionState !== 'idle'}
                  >
                    <SmartButtonContent
                      btnState={globalActionState}
                      idleText='Delete Item'
                      loadingText='Deleting...'
                      successText='Deleted'
                    />
                  </button>
                </div>
              </div>
            </div>,
            document.body /* This is the secret for the full-page blur */
          )}

        {/* --- GLOBAL DELETE USER MODAL --- */}
        {confirmDeleteUser &&
          createPortal(
            <div
              className='modal-overlay'
              onClick={() => {
                if (globalActionState === 'idle') setConfirmDeleteUser(null);
              }}
            >
              <div
                className='premium-modal'
                onClick={(e) => e.stopPropagation()}
              >
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
                    className='premium-btn cancel'
                    onClick={() => setConfirmDeleteUser(null)}
                    disabled={globalActionState !== 'idle'}
                  >
                    Keep User
                  </button>
                  <button
                    className={`premium-btn delete smart-submit-btn ${globalActionState}`}
                    onClick={() => deleteUser(confirmDeleteUser.id)}
                    disabled={globalActionState !== 'idle'}
                  >
                    <SmartButtonContent
                      btnState={globalActionState}
                      idleText='Delete User'
                      loadingText='Deleting...'
                      successText='Deleted'
                    />
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
        {/* --- GLOBAL CANCEL RESERVATION MODAL --- */}
        {confirmCancelId &&
          createPortal(
            <div
              className='modal-overlay'
              onClick={() => {
                if (globalActionState === 'idle') setConfirmCancelId(null);
              }}
            >
              <div
                className='premium-modal'
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className='premium-modal-title'>Cancel Reservation?</h2>
                <p className='premium-modal-message'>
                  This reservation will be permanently removed.
                  <br />
                  Are you sure?
                </p>
                <div className='premium-modal-actions'>
                  <button
                    className='premium-btn cancel'
                    onClick={() => setConfirmCancelId(null)}
                    disabled={globalActionState !== 'idle'}
                  >
                    Keep Reservation
                  </button>
                  <button
                    className={`premium-btn delete smart-submit-btn ${globalActionState}`}
                    onClick={() => adminCancelReservation(confirmCancelId)}
                    disabled={globalActionState !== 'idle'}
                  >
                    <SmartButtonContent
                      btnState={globalActionState}
                      idleText='Cancel Reservation'
                      loadingText='Cancelling...'
                      successText='Cancelled'
                    />
                  </button>
                </div>
              </div>
            </div>,
            document.body
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

// --- TRILLION DOLLAR ROOMS SECTION (Dirty Check + On-Button Error) ---
function RoomsSection({ rooms, showToast }) {
  const [roomList, setRoomList] = useState(rooms || []);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');

  const [roomForm, setRoomForm] = useState({
    id: null,
    name: '',
    capacity: '',
    features: [],
  });
  const [originalForm, setOriginalForm] = useState(null); // For Dirty Checking
  const [featureInput, setFeatureInput] = useState('');

  // Smart Button States
  const [btnState, setBtnState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const errorTimerRef = useRef(null);

  const [deleteBtnState, setDeleteBtnState] = useState('idle');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Dirty Check: Has anything changed?
  const isDirty = useMemo(() => {
    if (!originalForm) return false;
    return (
      roomForm.name !== originalForm.name ||
      String(roomForm.capacity) !== String(originalForm.capacity) ||
      JSON.stringify(roomForm.features.sort()) !==
        JSON.stringify(originalForm.features.sort())
    );
  }, [roomForm, originalForm]);

  const triggerError = (msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    setBtnState('error'); // Triggers Red/Shake
    errorTimerRef.current = setTimeout(() => {
      setBtnState('idle');
      setErrorMsg('');
    }, 2500);
  };

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
    const init = { id: null, name: '', capacity: '', features: [] };
    setRoomForm(init);
    setOriginalForm(init);
    setBtnState('idle');
    setShowModal(true);
  };

  const openEdit = (room) => {
    setModalMode('edit');
    let feats = room.features || [];
    if (feats.length === 0) {
      if (room.hasScreen) feats.push('Screen');
      if (room.hasHdmi) feats.push('HDMI');
    }
    const init = {
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      features: [...new Set(feats)],
    };
    setRoomForm(init);
    setOriginalForm(init);
    setBtnState('idle');
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

  const handleSave = async (e) => {
    if (e) e.preventDefault();

    // 1. Validation -> Trigger Button Error
    if (!roomForm.name.trim()) return triggerError('Name Required');
    if (!roomForm.capacity) return triggerError('Capacity Required');

    setBtnState('loading');

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
        setBtnState('success');
        setTimeout(() => {
          setShowModal(false);
          setBtnState('idle');
          loadRooms();
        }, 1500);
      } else {
        let msg = data.error || 'Failed';
        if (msg.includes('IntegrityError')) msg = 'Name Taken';
        triggerError(msg);
      }
    } catch (err) {
      triggerError('Network Error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBtnState('loading');
    try {
      const res = await fetch(`/api/rooms/${deleteTarget.id}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();

      if (res.ok && data.ok) {
        setDeleteBtnState('success');
        setTimeout(() => {
          loadRooms();
          setDeleteTarget(null);
          setDeleteBtnState('idle');
        }, 1500);
      } else {
        showToast(data.error || 'Cannot delete room.', 'error');
        setDeleteBtnState('idle');
      }
    } catch (e) {
      showToast('Network error while deleting.', 'error');
      setDeleteBtnState('idle');
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

      {/* EDIT/ADD MODAL */}
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

              <form onSubmit={handleSave}>
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
                      <div
                        className='admin-tag-chip-row'
                        style={{ justifyContent: 'center' }}
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
                      <div
                        className='admin-tag-input-row'
                        style={{ justifyContent: 'center', paddingTop: '6px' }}
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

                <div
                  className='premium-modal-actions'
                  style={{ marginTop: '2rem' }}
                >
                  <button
                    type='button'
                    className='premium-btn cancel'
                    onClick={() => setShowModal(false)}
                    disabled={btnState !== 'idle'}
                  >
                    Cancel
                  </button>
                  <button
                    type='submit'
                    className={`premium-btn primary smart-submit-btn ${btnState}`}
                    disabled={
                      !isDirty || (btnState !== 'idle' && btnState !== 'error')
                    }
                  >
                    <SmartButtonContent
                      btnState={btnState}
                      idleText={
                        modalMode === 'edit' ? 'Save Changes' : 'Create Room'
                      }
                      loadingText='Saving...'
                      successText={modalMode === 'edit' ? 'Saved' : 'Created'}
                      errorText={errorMsg || 'Error'}
                    />
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* DELETE CONFIRM */}
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
                  disabled={deleteBtnState !== 'idle'}
                >
                  Cancel
                </button>
                <button
                  className={`premium-btn delete smart-submit-btn ${deleteBtnState}`}
                  onClick={handleDelete}
                  disabled={deleteBtnState !== 'idle'}
                >
                  <SmartButtonContent
                    btnState={deleteBtnState}
                    idleText='Delete'
                    loadingText='Deleting...'
                    successText='Deleted'
                  />
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

function BannersSection({ showToast }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- UPLOAD MODAL STATE ---
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerLink, setBannerLink] = useState('');

  // Smart Button State
  const [uploadBtnState, setUploadBtnState] = useState('idle');
  const [uploadError, setUploadError] = useState('');
  const errorTimerRef = useRef(null);

  // Edit / preview / delete state
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [confirmDeleteBanner, setConfirmDeleteBanner] = useState(null);
  const [deleteBtnState, setDeleteBtnState] = useState('idle');

  const [togglingBanners, setTogglingBanners] = useState({});

  // Validation: Button is disabled until a file is picked and title is entered
  const isUploadDirty = bannerTitle.trim() !== '' || uploadFile !== null;

  const triggerUploadError = (msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setUploadError(msg);
    setUploadBtnState('error');
    errorTimerRef.current = setTimeout(() => {
      setUploadBtnState('idle');
      setUploadError('');
    }, 2500);
  };

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

  const setBannerActiveState = async (id, shouldActivate) => {
    setTogglingBanners((prev) => ({ ...prev, [id]: 'loading' }));
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

      setTogglingBanners((prev) => ({ ...prev, [id]: 'success' }));
      setTimeout(() => {
        loadBanners();
        setTogglingBanners((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 1000);
    } catch (err) {
      showToast?.('Action failed', 'error');
      setTogglingBanners((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleUpload = async () => {
    if (!bannerTitle.trim()) return triggerUploadError('Title Required');
    if (!uploadFile) return triggerUploadError('File Required');

    setUploadBtnState('loading');
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
        setUploadBtnState('success');
        setTimeout(() => {
          setShowUploadModal(false);
          setUploadFile(null);
          setBannerTitle('');
          setBannerLink('');
          setUploadBtnState('idle');
          loadBanners();
        }, 1500);
      } else {
        triggerUploadError(data.error || 'Upload failed');
      }
    } catch (err) {
      triggerUploadError('Network Error');
    }
  };

  const executeDeleteBanner = async () => {
    if (!confirmDeleteBanner) return;
    setDeleteBtnState('loading');
    try {
      await fetch(`/api/banners/${confirmDeleteBanner.id}/delete/`, {
        method: 'POST',
        credentials: 'include',
      });
      setDeleteBtnState('success');
      setTimeout(() => {
        loadBanners();
        setConfirmDeleteBanner(null);
        setDeleteBtnState('idle');
      }, 1500);
    } catch (err) {
      showToast?.('Delete failed', 'error');
      setDeleteBtnState('idle');
    }
  };

  const computeStatus = (b) => {
    const today = new Date().toISOString().slice(0, 10);
    const { start_date, end_date, is_active, repeat_yearly } = b;
    let statusText = 'No schedule';
    let chipClass = 'banner-status-chip';

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
            const toggleState = togglingBanners[b.id] || 'idle';
            const isActive = b.is_active;

            return (
              <div
                key={b.id}
                className={`admin-card banner-card ${
                  b.is_active ? 'active' : ''
                } ${
                  !b.is_active &&
                  (b.start_date || b.end_date) &&
                  statusText === 'Scheduled'
                    ? 'scheduled'
                    : ''
                } ${statusText === 'Expired' ? 'expired' : ''}`}
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
                    onClick={() => setPreviewBanner(b)}
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
                      toggleState === 'success'
                        ? 'admin-pill-success'
                        : toggleState === 'loading'
                        ? 'admin-pill-loading'
                        : isActive
                        ? 'admin-pill-subtle'
                        : 'admin-pill-primary'
                    }`}
                    onClick={() => setBannerActiveState(b.id, !b.is_active)}
                    disabled={toggleState !== 'idle'}
                  >
                    <SmartButtonContent
                      btnState={toggleState}
                      idleText={isActive ? 'Deactivate' : 'Set Active'}
                      loadingText=''
                      successText={isActive ? 'Deactivated' : 'Active'}
                    />
                  </button>
                  <button
                    className='admin-pill-button admin-pill-subtle'
                    onClick={() => setEditingBanner(b)}
                    disabled={toggleState !== 'idle'}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className='modal-overlay' style={{ zIndex: 99999 }}>
          <div
            className='premium-modal'
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px' }}
          >
            <button
              className='close-btn'
              onClick={() => setShowUploadModal(false)}
            >
              ✕
            </button>
            <h2 className='premium-modal-title'>Upload Banner</h2>
            <div className='form-row'>
              <label
                style={{
                  color:
                    uploadError === 'Title Required' ? '#ef4444' : 'inherit',
                }}
              >
                Title {uploadError === 'Title Required' && '— Required'}
              </label>
              <PremiumInput
                type='text'
                value={bannerTitle}
                onChange={(e) => {
                  setBannerTitle(e.target.value);
                  if (uploadBtnState === 'error') setUploadBtnState('idle');
                }}
                placeholder='e.g. Winter Break'
              />
            </div>
            <div className='form-row'>
              <label>Link / URL (Optional)</label>
              <PremiumInput
                type='text'
                value={bannerLink}
                onChange={(e) => setBannerLink(e.target.value)}
                placeholder='https://uta.edu...'
              />
            </div>
            <div className='form-row'>
              <label
                style={{
                  color:
                    uploadError === 'File Required' ? '#ef4444' : 'inherit',
                }}
              >
                Image {uploadError === 'File Required' && '— Required'}
              </label>
              <PremiumInput
                type='file'
                accept='image/*'
                onChange={(e) => {
                  setUploadFile(e.target.files?.[0] || null);
                  if (uploadBtnState === 'error') setUploadBtnState('idle');
                }}
              />
            </div>
            <div
              className='premium-modal-actions'
              style={{ marginTop: '2rem' }}
            >
              <button
                className='premium-btn cancel'
                onClick={() => setShowUploadModal(false)}
                disabled={uploadBtnState !== 'idle'}
              >
                Cancel
              </button>
              <button
                className={`premium-btn primary smart-submit-btn ${uploadBtnState}`}
                onClick={handleUpload}
                disabled={
                  !isUploadDirty ||
                  (uploadBtnState !== 'idle' && uploadBtnState !== 'error')
                }
              >
                <SmartButtonContent
                  btnState={uploadBtnState}
                  idleText='Upload Banner'
                  loadingText='Uploading...'
                  successText='Uploaded'
                  errorText={uploadError || 'Error'}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {editingBanner && (
        <BannerEditModal
          isOpen={!!editingBanner}
          onClose={() => setEditingBanner(null)}
          banner={editingBanner}
          onSaved={() => {
            setEditingBanner(null);
            loadBanners();
          }}
          onRequestDelete={(b) => setConfirmDeleteBanner(b)}
          showToast={showToast}
        />
      )}

      {confirmDeleteBanner &&
        createPortal(
          <div
            className='modal-overlay'
            style={{ zIndex: 99999 }}
            onClick={() => {
              if (deleteBtnState === 'idle') setConfirmDeleteBanner(null);
            }}
          >
            <div className='premium-modal' onClick={(e) => e.stopPropagation()}>
              <h2 className='premium-modal-title'>Delete Banner?</h2>
              <p className='premium-modal-message'>
                You are about to permanently delete{' '}
                <strong>{confirmDeleteBanner.label || 'this banner'}</strong>.
              </p>
              <div className='premium-modal-actions'>
                <button
                  className='premium-btn cancel'
                  onClick={() => setConfirmDeleteBanner(null)}
                  disabled={deleteBtnState !== 'idle'}
                >
                  Cancel
                </button>
                <button
                  className={`premium-btn delete smart-submit-btn ${deleteBtnState}`}
                  onClick={executeDeleteBanner}
                  disabled={deleteBtnState !== 'idle'}
                >
                  <SmartButtonContent
                    btnState={deleteBtnState}
                    idleText='Delete Banner'
                    loadingText='Deleting...'
                    successText='Deleted'
                  />
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {previewBanner && (
        <div className='modal-overlay' onClick={() => setPreviewBanner(null)}>
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
  const [startDate, setStartDate] = useState(banner?.start_date || '');
  const [endDate, setEndDate] = useState(banner?.end_date || '');
  const [repeatYearly, setRepeatYearly] = useState(!!banner?.repeat_yearly);

  const [btnState, setBtnState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const errorTimerRef = useRef(null);

  const isDirty = useMemo(() => {
    if (!banner) return false;
    if (imageFile !== null) return true;
    return (
      label !== (banner.label || '') ||
      link !== (banner.link || '') ||
      startDate !== (banner.start_date || '') ||
      endDate !== (banner.end_date || '') ||
      repeatYearly !== !!banner.repeat_yearly
    );
  }, [banner, label, link, imageFile, startDate, endDate, repeatYearly]);

  useEffect(() => {
    if (!banner) return;
    setLabel(banner.label || '');
    setLink(banner.link || '');
    setPreviewUrl(banner.image_url);
    setImageFile(null);
    setStartDate(banner.start_date || '');
    setEndDate(banner.end_date || '');
    setRepeatYearly(!!banner.repeat_yearly);
    setBtnState('idle');
    setErrorMsg('');
  }, [banner]);

  const triggerError = (msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    setBtnState('error');
    errorTimerRef.current = setTimeout(() => {
      setBtnState('idle');
      setErrorMsg('');
    }, 2500);
  };

  const handleSave = async () => {
    if (!label.trim()) return triggerError('Title Required');
    if (startDate && endDate && endDate < startDate)
      return triggerError('Invalid Dates');
    if (repeatYearly && (!startDate || !endDate))
      return triggerError('Schedule Required');

    setBtnState('loading');
    const formData = new FormData();
    formData.append('label', label);
    formData.append('link', link);
    if (imageFile) formData.append('file', imageFile);
    formData.append('start_date', startDate || '');
    formData.append('end_date', endDate || '');
    formData.append('repeat_yearly', repeatYearly ? 'true' : 'false');

    try {
      const res = await fetch(`/api/banners/${banner.id}/update/`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Update failed');
      setBtnState('success');
      setTimeout(() => {
        onSaved?.();
        setBtnState('idle');
      }, 1500);
    } catch (err) {
      triggerError(err.message || 'Update Error');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className='modal-overlay' style={{ zIndex: 99999 }}>
      <div
        className='premium-modal'
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px' }}
      >
        <button className='close-btn' onClick={onClose}>
          ✕
        </button>
        <h2 className='premium-modal-title'>Edit Banner</h2>
        <div className='form-row'>
          <label
            style={{
              color: errorMsg === 'Title Required' ? '#ef4444' : 'inherit',
            }}
          >
            Banner Title {errorMsg === 'Title Required' && '— Required'}
          </label>
          <PremiumInput
            type='text'
            value={label}
            onChange={(e) => {
              setLabel(e.target.value);
              if (btnState === 'error') setBtnState('idle');
            }}
          />
        </div>
        <div className='form-row'>
          <label>Link / URL (Optional)</label>
          <PremiumInput
            type='text'
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
        </div>
        <div className='form-row'>
          <label>Replace Image (Optional)</label>
          <PremiumInput
            type='file'
            accept='image/*'
            onChange={(e) => {
              setImageFile(e.target.files?.[0] || null);
              setPreviewUrl(URL.createObjectURL(e.target.files[0]));
              if (btnState === 'error') setBtnState('idle');
            }}
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
          {errorMsg && errorMsg !== 'Title Required' && (
            <div
              style={{
                marginTop: '0.8rem',
                color: '#ff8888',
                fontSize: '0.9rem',
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>
        <div className='premium-modal-actions' style={{ marginTop: '2rem' }}>
          <button
            className='premium-btn cancel'
            onClick={onClose}
            disabled={btnState !== 'idle'}
          >
            Cancel
          </button>
          <button
            className='premium-btn danger'
            onClick={() => onRequestDelete?.(banner)}
            disabled={btnState !== 'idle'}
          >
            Delete
          </button>
          <button
            className={`premium-btn primary smart-submit-btn ${btnState}`}
            onClick={handleSave}
            disabled={!isDirty || (btnState !== 'idle' && btnState !== 'error')}
          >
            <SmartButtonContent
              btnState={btnState}
              idleText='Save Changes'
              loadingText='Saving...'
              successText='Saved'
              errorText={errorMsg || 'Error'}
            />
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
  setAdminUsers,
  setConfirmDeleteUser,
  showToast,
}) {
  const [togglingUsers, setTogglingUsers] = useState({});

  const toggleUserAdmin = async (userId) => {
    setTogglingUsers((prev) => ({ ...prev, [userId]: 'loading' }));
    try {
      const res = await fetch(`/api/users/${userId}/toggle-admin/`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.ok) {
        showToast?.(data.error, 'error');
        setTogglingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        return;
      }

      setTogglingUsers((prev) => ({ ...prev, [userId]: 'success' }));

      setTimeout(() => {
        setAdminUsers((prev) =>
          prev.map((u) =>
            u.id === userId ? { ...u, isAdmin: data.isAdmin } : u
          )
        );
        setTogglingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }, 1200);
    } catch (err) {
      console.error(err);
      setTogglingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    }
  };

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
          {users.map((u) => {
            const toggleState = togglingUsers[u.id] || 'idle';
            const actionClass = u.isAdmin
              ? 'admin-pill-warning'
              : 'admin-pill-primary';

            return (
              <div key={u.id} className='admin-list-row'>
                <div className='admin-list-main'>
                  <div className='admin-item-title'>
                    {u.fullName || u.email}
                  </div>
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
                    className={`admin-pill-button ${
                      toggleState === 'success'
                        ? 'admin-pill-success'
                        : toggleState === 'loading'
                        ? 'admin-pill-loading'
                        : actionClass
                    }`}
                    onClick={() => toggleUserAdmin(u.id)}
                    disabled={toggleState !== 'idle'}
                  >
                    <SmartButtonContent
                      btnState={toggleState}
                      idleText={u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                      loadingText=''
                      successText={u.isAdmin ? 'Removed' : 'Promoted'}
                    />
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
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- TRILLION DOLLAR ITEM EDIT MODAL (Dirty Check + On-Button Error) ---
function ItemEditModal({ isOpen, onClose, item, itemsByCategory, onSaved }) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name || '');
  const [categoryKey, setCategoryKey] = useState(item?.category_key || '');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(item?.image || null);

  // Dirty Check State
  const [initialState, setInitialState] = useState(null);

  // Smart Button State
  const [btnState, setBtnState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const errorTimerRef = useRef(null);

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
    const init = {
      name: item?.name || '',
      categoryKey: item?.category_key || '',
      newCategoryName: '',
      previewUrl: item?.image || null,
    };
    setName(init.name);
    setCategoryKey(init.categoryKey);
    setNewCategoryName('');
    setImageFile(null);
    setPreviewUrl(init.previewUrl);

    setInitialState(init); // Set baseline for dirty check
    setBtnState('idle');
    setErrorMsg('');
  }, [isOpen, item]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Dirty Check: Compare current inputs against initial state
  const isDirty = useMemo(() => {
    if (!initialState) return false;
    // If image file is selected, it's dirty
    if (imageFile) return true;
    return (
      name !== initialState.name ||
      categoryKey !== initialState.categoryKey ||
      newCategoryName !== initialState.newCategoryName
    );
  }, [name, categoryKey, newCategoryName, imageFile, initialState]);

  const triggerError = (msg) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setErrorMsg(msg);
    setBtnState('error');
    errorTimerRef.current = setTimeout(() => {
      setBtnState('idle');
      setErrorMsg('');
    }, 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validation -> Trigger Button Error
    const trimmedName = name
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    if (!trimmedName) return triggerError('Name Required');

    const payload = { id: item?.id || null, name: trimmedName };
    if (categoryKey && categoryKey !== '__new__') {
      payload.category_key = categoryKey;
    } else if (categoryKey === '__new__' && newCategoryName.trim()) {
      payload.new_category_name = newCategoryName.trim();
    }

    setBtnState('loading');

    try {
      const res = await fetch('/api/items/save/', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Failed to save item');

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
        if (imgData.image) {
          savedItem = { ...savedItem, image: imgData.image };
        }
      }

      setBtnState('success');
      setTimeout(() => {
        onSaved && onSaved(savedItem);
        onClose();
        setBtnState('idle');
      }, 1500);
    } catch (err) {
      triggerError(err.message || 'Failed to save item.');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className='modal-overlay'
      style={{ zIndex: 99999, backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className='premium-modal'
        onClick={(e) => e.stopPropagation()}
        role='dialog'
        aria-modal='true'
        style={{ width: '720px', maxWidth: '92vw' }}
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

        <form onSubmit={handleSubmit}>
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

          <div
            className='premium-modal-actions'
            style={{ marginTop: '2.5rem' }}
          >
            <button
              type='button'
              className='premium-btn cancel'
              onClick={onClose}
              disabled={btnState !== 'idle'}
            >
              Cancel
            </button>

            {/* SENTIENT BUTTON: Disabled if clean, Error state if invalid */}
            <button
              type='submit'
              className={`premium-btn primary smart-submit-btn ${btnState}`}
              disabled={
                !isDirty || (btnState !== 'idle' && btnState !== 'error')
              }
            >
              <SmartButtonContent
                btnState={btnState}
                idleText={isEdit ? 'Save Changes' : 'Create Item'}
                loadingText={isEdit ? 'Saving...' : 'Creating...'}
                successText={isEdit ? 'Saved' : 'Created'}
                errorText={errorMsg || 'Error'}
              />
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
