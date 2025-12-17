/**
 * Prasad Physio Therapy - Patient Data Management
 * Professional Dashboard-First Design
 */

// ============================================
// Configuration
// ============================================

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyACjTZIg0dBp0tzgtFGF-JVI8SO3g9uxI9TEv5nFENft5UoJe10wYdCqF329gwSnqF/exec';

// ============================================
// DOM Elements
// ============================================

const dashboardSection = document.getElementById('dashboardSection');
const formSection = document.getElementById('formSection');
const detailSection = document.getElementById('detailSection');
const patientForm = document.getElementById('patientForm');
const tableBody = document.getElementById('tableBody');
const tableWrapper = document.getElementById('tableWrapper');
const searchInput = document.getElementById('searchInput');
const recordCount = document.getElementById('recordCount');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const editingSnoInput = document.getElementById('editingSno');

// Buttons
const addNewBtn = document.getElementById('addNewBtn');
const backToDashboard = document.getElementById('backToDashboard');
const cancelBtn = document.getElementById('cancelBtn');
const backFromDetail = document.getElementById('backFromDetail');
const editFromViewBtn = document.getElementById('editFromViewBtn');

// ============================================
// State Management
// ============================================

let patients = [];
let isEditing = false;
let currentViewingSno = null;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;

    // Load data - show dashboard first
    fetchPatients();

    // Event Listeners
    patientForm.addEventListener('submit', handleFormSubmit);
    searchInput.addEventListener('input', handleSearch);

    addNewBtn.addEventListener('click', showAddForm);
    backToDashboard.addEventListener('click', showDashboard);
    cancelBtn.addEventListener('click', showDashboard);
    backFromDetail.addEventListener('click', showDashboard);
    editFromViewBtn.addEventListener('click', editFromView);
});

// ============================================
// View Navigation
// ============================================

function showDashboard() {
    dashboardSection.style.display = 'block';
    formSection.style.display = 'none';
    detailSection.style.display = 'none';
    resetForm();
}

function showAddForm() {
    isEditing = false;
    formTitle.textContent = 'New Patient Enquiry';
    submitBtnText.textContent = 'Save Enquiry';
    resetForm();

    dashboardSection.style.display = 'none';
    formSection.style.display = 'block';
    detailSection.style.display = 'none';
}

function showEditForm(sno) {
    const patient = patients.find(p => p.sno === parseInt(sno));
    if (!patient) {
        showToast('Patient not found', 'error');
        return;
    }

    isEditing = true;
    currentViewingSno = sno;
    formTitle.textContent = 'Edit Enquiry #' + sno;
    submitBtnText.textContent = 'Update Enquiry';
    editingSnoInput.value = sno;

    // Populate form
    document.getElementById('entryDate').value = patient.date || '';
    document.getElementById('patientName').value = patient.name || '';
    document.getElementById('gender').value = patient.gender || '';
    document.getElementById('phone').value = patient.phone || '';
    document.getElementById('address').value = patient.address || '';
    document.getElementById('referralSource').value = patient.referralSource || '';
    document.getElementById('notes').value = patient.notes || '';

    dashboardSection.style.display = 'none';
    formSection.style.display = 'block';
    detailSection.style.display = 'none';
}

function showDetailView(sno) {
    const patient = patients.find(p => p.sno === parseInt(sno));
    if (!patient) {
        showToast('Patient not found', 'error');
        return;
    }

    currentViewingSno = sno;

    // Populate detail view
    document.getElementById('detailSno').textContent = patient.sno;
    document.getElementById('detailDate').textContent = formatDate(patient.date);
    document.getElementById('detailName').textContent = patient.name || '-';
    document.getElementById('detailGender').textContent = patient.gender || '-';
    document.getElementById('detailPhone').textContent = patient.phone || '-';
    document.getElementById('detailReferral').textContent = patient.referralSource || '-';
    document.getElementById('detailAddress').textContent = patient.address || '-';
    document.getElementById('detailNotes').textContent = patient.notes || '-';

    dashboardSection.style.display = 'none';
    formSection.style.display = 'none';
    detailSection.style.display = 'block';
}

function editFromView() {
    if (currentViewingSno) {
        showEditForm(currentViewingSno);
    }
}

function resetForm() {
    patientForm.reset();
    editingSnoInput.value = '';
    isEditing = false;
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
}

// ============================================
// API Functions
// ============================================

async function fetchPatients() {
    showLoading(true);

    try {
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getAll`);
        const data = await response.json();

        if (data.success) {
            patients = data.records || [];
            renderTable(patients);
        } else {
            throw new Error(data.error || 'Failed to fetch records');
        }
    } catch (error) {
        console.error('Fetch error:', error);
        patients = getLocalPatients();
        renderTable(patients);
        showToast('Using offline mode', 'error');
    } finally {
        showLoading(false);
    }
}

async function savePatient(patientData) {
    try {
        const params = new URLSearchParams({
            action: 'add',
            date: patientData.date,
            name: patientData.name,
            gender: patientData.gender,
            phone: patientData.phone,
            address: patientData.address,
            referralSource: patientData.referralSource || '',
            notes: patientData.notes || ''
        });

        const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            return { success: true, sno: data.sno };
        } else {
            throw new Error(data.error || 'Failed to save');
        }
    } catch (error) {
        console.error('Save error:', error);
        return saveLocalPatient(patientData);
    }
}

async function updatePatient(sno, patientData) {
    try {
        const params = new URLSearchParams({
            action: 'update',
            sno: sno.toString(),
            date: patientData.date,
            name: patientData.name,
            gender: patientData.gender,
            phone: patientData.phone,
            address: patientData.address,
            referralSource: patientData.referralSource || '',
            notes: patientData.notes || ''
        });

        const response = await fetch(`${APPS_SCRIPT_URL}?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            return { success: true };
        } else {
            throw new Error(data.error || 'Failed to update');
        }
    } catch (error) {
        console.error('Update error:', error);
        return updateLocalPatient(sno, patientData);
    }
}

// ============================================
// Local Storage Functions
// ============================================

function getLocalPatients() {
    const stored = localStorage.getItem('prasad_physio_patients');
    return stored ? JSON.parse(stored) : [];
}

function saveLocalPatient(patientData) {
    const patients = getLocalPatients();
    const newSno = patients.length > 0 ? Math.max(...patients.map(p => p.sno)) + 1 : 1;
    patients.push({ sno: newSno, ...patientData });
    localStorage.setItem('prasad_physio_patients', JSON.stringify(patients));
    return { success: true, sno: newSno };
}

function updateLocalPatient(sno, patientData) {
    const patients = getLocalPatients();
    const index = patients.findIndex(p => p.sno === parseInt(sno));
    if (index !== -1) {
        patients[index] = { sno: parseInt(sno), ...patientData };
        localStorage.setItem('prasad_physio_patients', JSON.stringify(patients));
        return { success: true };
    }
    return { success: false, error: 'Patient not found' };
}

// ============================================
// Form Handler
// ============================================

async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        date: document.getElementById('entryDate').value,
        name: document.getElementById('patientName').value.trim(),
        gender: document.getElementById('gender').value,
        phone: document.getElementById('phone').value.trim(),
        address: document.getElementById('address').value.trim(),
        referralSource: document.getElementById('referralSource').value,
        notes: document.getElementById('notes').value.trim()
    };

    if (!formData.name || !formData.gender || !formData.phone || !formData.address) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = isEditing ? 'Updating...' : 'Saving...';

    try {
        let result;

        if (isEditing) {
            result = await updatePatient(editingSnoInput.value, formData);
            if (result.success) {
                showToast('Enquiry updated successfully');
            }
        } else {
            result = await savePatient(formData);
            if (result.success) {
                showToast('Enquiry saved successfully');
            }
        }

        await fetchPatients();
        showDashboard();

    } catch (error) {
        console.error('Submit error:', error);
        showToast('Error saving record', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Save Enquiry';
    }
}

// ============================================
// Table Rendering
// ============================================

function renderTable(data) {
    if (!data || data.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        tableWrapper.style.display = 'none';
        recordCount.textContent = '0 Records';
        return;
    }

    emptyState.style.display = 'none';
    tableWrapper.style.display = 'block';
    recordCount.textContent = `${data.length} Record${data.length !== 1 ? 's' : ''}`;

    tableBody.innerHTML = data.map(patient => `
        <tr>
            <td><strong>${patient.sno}</strong></td>
            <td>${formatDate(patient.date)}</td>
            <td>${escapeHtml(patient.name)}</td>
            <td>${escapeHtml(patient.gender)}</td>
            <td>${escapeHtml(patient.phone)}</td>
            <td>${escapeHtml(patient.referralSource || '-')}</td>
            <td class="actions-cell">
                <button class="btn btn-view" onclick="showDetailView(${patient.sno})">View</button>
                <button class="btn btn-outline btn-small" onclick="showEditForm(${patient.sno})">Edit</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// Search
// ============================================

function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
        renderTable(patients);
        return;
    }

    const filtered = patients.filter(patient =>
        patient.name.toLowerCase().includes(query) ||
        patient.phone.includes(query) ||
        (patient.address && patient.address.toLowerCase().includes(query)) ||
        patient.sno.toString().includes(query)
    );

    renderTable(filtered);
}

// ============================================
// Utilities
// ============================================

function showLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        emptyState.style.display = 'none';
        tableWrapper.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    toast.className = 'toast ' + type;
    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
