/**
 * Prasad Physio Therapy - Patient Data Management
 * Frontend JavaScript for Google Sheets Integration
 */

// ============================================
// Configuration
// ============================================

// Replace this with your Google Apps Script Web App URL after deployment
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyACjTZIg0dBp0tzgtFGF-JVI8SO3g9uxI9TEv5nFENft5UoJe10wYdCqF329gwSnqF/exec';

// ============================================
// DOM Elements
// ============================================

const patientForm = document.getElementById('patientForm');
const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const recordCount = document.getElementById('recordCount');
const emptyState = document.getElementById('emptyState');
const loadingState = document.getElementById('loadingState');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');
const formTitle = document.getElementById('formTitle');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editingSnoInput = document.getElementById('editingSno');

// ============================================
// State Management
// ============================================

let patients = [];
let isEditing = false;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('entryDate').value = today;

    // Load existing data
    fetchPatients();

    // Event Listeners
    patientForm.addEventListener('submit', handleFormSubmit);
    patientForm.addEventListener('reset', handleFormReset);
    searchInput.addEventListener('input', handleSearch);
    cancelEditBtn.addEventListener('click', cancelEdit);
});

// ============================================
// API Functions
// ============================================

/**
 * Fetch all patients from Google Sheets
 */
async function fetchPatients() {
    showLoading(true);

    try {
        // Check if Apps Script URL is configured
        if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            // Demo mode - use local storage
            patients = getLocalPatients();
            renderTable(patients);
            showToast('Demo Mode: Using local storage. Configure Apps Script URL for Google Sheets.', 'info');
            return;
        }

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
        // Fallback to local storage
        patients = getLocalPatients();
        renderTable(patients);
        showToast('Using offline mode. Data saved locally.', 'warning');
    } finally {
        showLoading(false);
    }
}

/**
 * Save patient to Google Sheets
 */
async function savePatient(patientData) {
    try {
        if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            // Demo mode - use local storage
            return saveLocalPatient(patientData);
        }

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'add',
                data: patientData
            })
        });

        // Since no-cors mode doesn't return readable response, assume success
        return { success: true };
    } catch (error) {
        console.error('Save error:', error);
        // Fallback to local storage
        return saveLocalPatient(patientData);
    }
}

/**
 * Update patient in Google Sheets
 */
async function updatePatient(sno, patientData) {
    try {
        if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            // Demo mode - use local storage
            return updateLocalPatient(sno, patientData);
        }

        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'update',
                sno: sno,
                data: patientData
            })
        });

        return { success: true };
    } catch (error) {
        console.error('Update error:', error);
        return updateLocalPatient(sno, patientData);
    }
}

// ============================================
// Local Storage Functions (Offline/Demo Mode)
// ============================================

function getLocalPatients() {
    const stored = localStorage.getItem('prasad_physio_patients');
    return stored ? JSON.parse(stored) : [];
}

function saveLocalPatient(patientData) {
    const patients = getLocalPatients();
    const newSno = patients.length > 0 ? Math.max(...patients.map(p => p.sno)) + 1 : 1;

    const newPatient = {
        sno: newSno,
        ...patientData
    };

    patients.push(newPatient);
    localStorage.setItem('prasad_physio_patients', JSON.stringify(patients));

    return { success: true, sno: newSno };
}

function updateLocalPatient(sno, patientData) {
    const patients = getLocalPatients();
    const index = patients.findIndex(p => p.sno === parseInt(sno));

    if (index !== -1) {
        patients[index] = {
            sno: parseInt(sno),
            ...patientData
        };
        localStorage.setItem('prasad_physio_patients', JSON.stringify(patients));
        return { success: true };
    }

    return { success: false, error: 'Patient not found' };
}

// ============================================
// Form Handlers
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

    // Validate required fields
    if (!formData.name || !formData.gender || !formData.phone || !formData.address) {
        showToast('Please fill in all required fields', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = isEditing ? 'Updating...' : 'Saving...';

    try {
        let result;

        if (isEditing) {
            const sno = editingSnoInput.value;
            result = await updatePatient(sno, formData);

            if (result.success) {
                showToast('Patient record updated successfully!', 'success');
            }
        } else {
            result = await savePatient(formData);

            if (result.success) {
                showToast('Patient record saved successfully!', 'success');
            }
        }

        // Refresh the table
        await fetchPatients();

        // Reset form
        cancelEdit();
        patientForm.reset();
        document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];

    } catch (error) {
        console.error('Submit error:', error);
        showToast('Error saving record. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Save Patient Record';
    }
}

function handleFormReset() {
    cancelEdit();
    setTimeout(() => {
        document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
    }, 0);
}

function cancelEdit() {
    isEditing = false;
    editingSnoInput.value = '';
    formTitle.textContent = 'New Patient Entry';
    submitBtnText.textContent = 'Save Patient Record';
    cancelEditBtn.style.display = 'none';
    patientForm.reset();
    document.getElementById('entryDate').value = new Date().toISOString().split('T')[0];
}

// ============================================
// Edit Function
// ============================================

function editPatient(sno) {
    const patient = patients.find(p => p.sno === parseInt(sno));

    if (!patient) {
        showToast('Patient record not found', 'error');
        return;
    }

    // Set form to edit mode
    isEditing = true;
    editingSnoInput.value = sno;
    formTitle.textContent = `Edit Patient #${sno}`;
    submitBtnText.textContent = 'Update Patient Record';
    cancelEditBtn.style.display = 'inline-flex';

    // Populate form fields
    document.getElementById('entryDate').value = patient.date || '';
    document.getElementById('patientName').value = patient.name || '';
    document.getElementById('gender').value = patient.gender || '';
    document.getElementById('phone').value = patient.phone || '';
    document.getElementById('address').value = patient.address || '';
    document.getElementById('referralSource').value = patient.referralSource || '';
    document.getElementById('notes').value = patient.notes || '';

    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });

    showToast(`Editing patient record #${sno}`, 'info');
}

// ============================================
// Table Rendering
// ============================================

function renderTable(data) {
    if (!data || data.length === 0) {
        tableBody.innerHTML = '';
        emptyState.style.display = 'block';
        document.querySelector('.table-wrapper').style.display = 'none';
        recordCount.textContent = '0 Records';
        return;
    }

    emptyState.style.display = 'none';
    document.querySelector('.table-wrapper').style.display = 'block';
    recordCount.textContent = `${data.length} Record${data.length !== 1 ? 's' : ''}`;

    tableBody.innerHTML = data.map(patient => `
        <tr>
            <td><strong>${patient.sno}</strong></td>
            <td>${formatDate(patient.date)}</td>
            <td>${escapeHtml(patient.name)}</td>
            <td>${escapeHtml(patient.gender)}</td>
            <td>${escapeHtml(patient.phone)}</td>
            <td title="${escapeHtml(patient.address)}">${escapeHtml(patient.address)}</td>
            <td>${escapeHtml(patient.referralSource || '-')}</td>
            <td class="notes-cell" title="${escapeHtml(patient.notes || '')}">${escapeHtml(patient.notes || '-')}</td>
            <td>
                <button class="btn btn-edit btn-small" onclick="editPatient(${patient.sno})">
                    ✏️ Edit
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// Search Function
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
        patient.address.toLowerCase().includes(query) ||
        (patient.notes && patient.notes.toLowerCase().includes(query)) ||
        patient.sno.toString().includes(query)
    );

    renderTable(filtered);
}

// ============================================
// Utility Functions
// ============================================

function showLoading(show) {
    loadingState.style.display = show ? 'block' : 'none';
    if (show) {
        emptyState.style.display = 'none';
        document.querySelector('.table-wrapper').style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };

    toastIcon.textContent = icons[type] || icons.success;
    toastMessage.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
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
