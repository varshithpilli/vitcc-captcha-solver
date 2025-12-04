// FFCS Faculty Ratings System - Complete Implementation

(function() {
  'use strict';
  
  // ============= SHARED STATE & UTILITIES =============
  let facultyRatings = [];
  let settings = {
    showRatings: true,
    showDetails: false,
    maxSubjects: 0,
    sortByRating: false,
    considerSeats: false
  };

  function normalize(str) {
    return str.replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function getRatingColor(r) {
    if (r >= 9) return '#4CAF50';
    if (r >= 8) return '#8BC34A';
    if (r >= 7) return '#FFC107';
    if (r >= 6) return '#FF9800';
    return '#F44336';
  }

  function findFaculty(name) {
    const n = normalize(name);
    return facultyRatings.find(f => normalize(f.name) === n) || null;
  }

  // ============= CONTENT SCRIPT (INJECTION) =============
  function isFFCSPage() {
    return window.location.href.includes('vtopregcc.vit.ac.in/RegistrationNew');
  }

  function createBadge(faculty, showDetails) {
    const badge = document.createElement('span');
    badge.className = 'faculty-rating-badge';
    badge.style.cssText = `
      margin-left: 6px;
      padding: 2px 6px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      font-size: 11px;
      display: inline-block;
      white-space: nowrap;
    `;

    if (!faculty) {
      badge.textContent = 'N/A';
      badge.style.backgroundColor = '#9E9E9E';
      return badge;
    }

    const rating = faculty.overall_rating.toFixed(1);
    badge.textContent = showDetails 
      ? `${rating}⭐ T:${faculty.teaching} A:${faculty.attendance_flex} S:${faculty.supportiveness} M:${faculty.marks}`
      : `${rating}⭐`;
    badge.style.backgroundColor = getRatingColor(faculty.overall_rating);

    if (!showDetails) {
      badge.title = `${faculty.name}\nTeaching: ${faculty.teaching}\nAttendance: ${faculty.attendance_flex}\nSupport: ${faculty.supportiveness}\nMarks: ${faculty.marks}`;
    }

    return badge;
  }

  function sortTableRows(tbody, considerSeats) {
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => {
      const cells = row.querySelectorAll('td');
      return cells.length > 2 && !row.textContent.includes('Theory Slots') && !row.textContent.includes('Lab Only');
    });

    rows.sort((a, b) => {
      const getFacultyCell = (row) => {
        const cells = row.querySelectorAll('td');
        return cells[2] || cells[1];
      };

      const getAvailSeats = (row) => {
        const cells = row.querySelectorAll('td');
        const lastCell = cells[cells.length - 1];
        const text = lastCell.textContent.trim();
        if (text === 'Full' || text === '') return 0;
        return parseInt(text) || 0;
      };

      const facultyA = findFaculty(getFacultyCell(a).textContent);
      const facultyB = findFaculty(getFacultyCell(b).textContent);
      
      if (considerSeats) {
        const seatsA = getAvailSeats(a);
        const seatsB = getAvailSeats(b);
        if (seatsA === 0 && seatsB > 0) return 1;
        if (seatsA > 0 && seatsB === 0) return -1;
        if (seatsA === 0 && seatsB === 0) {
          return (facultyB?.overall_rating || 0) - (facultyA?.overall_rating || 0);
        }
      }

      return (facultyB?.overall_rating || 0) - (facultyA?.overall_rating || 0);
    });

    rows.forEach(row => tbody.appendChild(row));
  }

  function injectRatings() {
    if (!isFFCSPage() || !settings.showRatings) return;

    const tables = document.querySelectorAll('table.w3-table-all');
    if (!tables.length) return;

    tables.forEach(table => {
      const rows = table.querySelectorAll('tr');
      let facultyColIndex = -1;
      let processedCount = 0;

      rows.forEach((row, idx) => {
        const cells = row.querySelectorAll('th, td');
        
        // Find faculty column
        if (idx === 0 && facultyColIndex === -1) {
          cells.forEach((cell, i) => {
            if (normalize(cell.textContent).includes('faculty')) {
              facultyColIndex = i;
            }
          });
        }

        // Skip header and non-data rows
        if (idx === 0 || facultyColIndex === -1 || cells.length <= facultyColIndex) return;
        if (row.textContent.includes('Theory Slots') || row.textContent.includes('Lab Only')) return;

        // Limit subjects if maxSubjects is set
        if (settings.maxSubjects > 0 && processedCount >= settings.maxSubjects) {
          row.style.display = 'none';
          return;
        }

        const facultyCell = cells[facultyColIndex];
        if (!facultyCell || facultyCell.querySelector('.faculty-rating-badge')) return;

        const facultyName = facultyCell.textContent.trim();
        const faculty = findFaculty(facultyName);
        
        facultyCell.appendChild(createBadge(faculty, settings.showDetails));
        processedCount++;
      });

      // Sort if enabled
      if (settings.sortByRating) {
        const tbody = table.querySelector('tbody') || table;
        sortTableRows(tbody, settings.considerSeats);
      }
    });
  }

  function observeAndInject() {
    injectRatings();
    new MutationObserver(() => {
      setTimeout(injectRatings, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }

  // ============= SIDEBAR (POPUP) =============
  function initSidebar() {
    loadSettings();
    loadRatings();

    // Toggle listeners
    document.getElementById('showRatingsToggle')?.addEventListener('change', saveSettings);
    document.getElementById('showDetailsToggle')?.addEventListener('change', saveSettings);
    document.getElementById('sortByRatingToggle')?.addEventListener('change', saveSettings);
    document.getElementById('considerSeatsToggle')?.addEventListener('change', saveSettings);
    
    // Max subjects input
    document.getElementById('maxSubjectsInput')?.addEventListener('change', saveSettings);

    // Import button
    document.getElementById('importBtn')?.addEventListener('click', () => {
      document.getElementById('fileInput')?.click();
    });

    document.getElementById('fileInput')?.addEventListener('change', e => {
      if (e.target.files.length) importFile(e.target.files[0]);
    });

    // Back button
    document.getElementById('backButton')?.addEventListener('click', () => {
      window.location.href = 'sidebar.html';
    });

    updateStats();
  }

  function loadSettings() {
    chrome.storage.local.get([
      'ffcsShowRatings', 'ffcsShowDetails', 'ffcsMaxSubjects', 
      'ffcsSortByRating', 'ffcsConsiderSeats'
    ], result => {
      settings.showRatings = result.ffcsShowRatings !== false;
      settings.showDetails = result.ffcsShowDetails === true;
      settings.maxSubjects = parseInt(result.ffcsMaxSubjects) || 0;
      settings.sortByRating = result.ffcsSortByRating === true;
      settings.considerSeats = result.ffcsConsiderSeats === true;

      if (document.getElementById('showRatingsToggle')) {
        document.getElementById('showRatingsToggle').checked = settings.showRatings;
        document.getElementById('showDetailsToggle').checked = settings.showDetails;
        document.getElementById('maxSubjectsInput').value = settings.maxSubjects || '';
        document.getElementById('sortByRatingToggle').checked = settings.sortByRating;
        document.getElementById('considerSeatsToggle').checked = settings.considerSeats;
      }
    });
  }

  function saveSettings() {
    settings.showRatings = document.getElementById('showRatingsToggle')?.checked ?? true;
    settings.showDetails = document.getElementById('showDetailsToggle')?.checked ?? false;
    settings.maxSubjects = parseInt(document.getElementById('maxSubjectsInput')?.value) || 0;
    settings.sortByRating = document.getElementById('sortByRatingToggle')?.checked ?? false;
    settings.considerSeats = document.getElementById('considerSeatsToggle')?.checked ?? false;

    chrome.storage.local.set({
      ffcsShowRatings: settings.showRatings,
      ffcsShowDetails: settings.showDetails,
      ffcsMaxSubjects: settings.maxSubjects,
      ffcsSortByRating: settings.sortByRating,
      ffcsConsiderSeats: settings.considerSeats
    }, () => {
      chrome.tabs.query({}, tabs => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: 'FFCS_SETTINGS_CHANGED',
            settings: settings
          }).catch(() => {});
        });
      });
    });
  }

  function loadRatings() {
    chrome.storage.local.get(['facultyRatings'], result => {
      facultyRatings = result.facultyRatings || [];
      updateStats();
    });
  }

  function importFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data)) {
          facultyRatings = data;
          chrome.storage.local.set({ facultyRatings: data }, () => {
            updateStatus('Faculty ratings imported successfully!', true);
            updateStats();
            
            chrome.tabs.query({}, tabs => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                  type: 'FACULTY_RATINGS_UPDATED',
                  data: data
                }).catch(() => {});
              });
            });
          });
        } else {
          updateStatus('Invalid JSON format.', false);
        }
      } catch (error) {
        updateStatus('Error: ' + error.message, false);
      }
    };
    reader.readAsText(file);
  }

  function updateStatus(msg, success) {
    const statusEl = document.getElementById('statusMessage');
    if (statusEl) {
      statusEl.textContent = msg;
      statusEl.style.color = success ? '#4CAF50' : '#F44336';
      setTimeout(() => {
        statusEl.textContent = 'Faculty ratings will be shown in FFCS pages';
        statusEl.style.color = '#666';
      }, 3000);
    }
  }

  function updateStats() {
    const statsEl = document.getElementById('statsInfo');
    if (statsEl && facultyRatings.length) {
      const avg = (facultyRatings.reduce((sum, f) => sum + f.overall_rating, 0) / facultyRatings.length).toFixed(1);
      statsEl.innerHTML = `<strong>${facultyRatings.length}</strong> faculty | Avg: <strong>${avg}⭐</strong>`;
    }
  }

  // ============= MESSAGE LISTENER =============
  chrome.runtime?.onMessage.addListener((req) => {
    if (req.type === 'FACULTY_RATINGS_UPDATED') {
      facultyRatings = req.data || [];
      setTimeout(injectRatings, 300);
    }
    if (req.type === 'FFCS_SETTINGS_CHANGED') {
      settings = req.settings;
      setTimeout(injectRatings, 300);
    }
  });

  // ============= INITIALIZATION =============
  if (typeof chrome !== 'undefined' && chrome.storage) {
    // Content script
    if (isFFCSPage()) {
      chrome.storage.local.get([
        'facultyRatings', 'ffcsShowRatings', 'ffcsShowDetails',
        'ffcsMaxSubjects', 'ffcsSortByRating', 'ffcsConsiderSeats'
      ], result => {
        facultyRatings = result.facultyRatings || [];
        settings.showRatings = result.ffcsShowRatings !== false;
        settings.showDetails = result.ffcsShowDetails === true;
        settings.maxSubjects = parseInt(result.ffcsMaxSubjects) || 0;
        settings.sortByRating = result.ffcsSortByRating === true;
        settings.considerSeats = result.ffcsConsiderSeats === true;
        
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => setTimeout(observeAndInject, 500));
        } else {
          setTimeout(observeAndInject, 500);
        }
      });
    }
    // Popup/Sidebar
    else if (document.getElementById('importBtn')) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebar);
      } else {
        initSidebar();
      }
    }
  }
})();