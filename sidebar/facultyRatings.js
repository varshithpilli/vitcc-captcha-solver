let facultyRatingsData = [];
let filteredData = [];
let searchQuery = '';

// Initialize sort options
window.sortAttribute = 'overall';
window.sortOrder = 'desc';

function getRatingColor(rating) {
  if (rating >= 9.0) return '#4CAF50';
  if (rating >= 8.0) return '#8BC34A';
  if (rating >= 7.0) return '#FFC107';
  if (rating >= 6.0) return '#FF9800';
  return '#F44336';
}

function createRatingBar(rating) {
  const container = document.createElement('div');
  container.className = 'rating-bar-container';
  
  const bar = document.createElement('div');
  bar.className = 'rating-bar';
  bar.style.width = `${rating * 10}%`;
  bar.style.backgroundColor = getRatingColor(rating);
  
  container.appendChild(bar);
  return container;
}

function filterAndSortData() {
  // Filter by search query
  filteredData = facultyRatingsData.filter(faculty => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return faculty.name.toLowerCase().includes(query) || 
           faculty.faculty_id.toLowerCase().includes(query);
  });
  
  // Sort data
  filteredData.sort((a, b) => {
    let valA, valB;
    
    if (window.sortAttribute === 'overall' || !window.sortAttribute) {
      valA = a.overall_rating;
      valB = b.overall_rating;
    } else if (window.sortAttribute === 'teaching') {
      valA = a.teaching;
      valB = b.teaching;
    } else if (window.sortAttribute === 'attendance') {
      valA = a.attendance_flex;
      valB = b.attendance_flex;
    } else if (window.sortAttribute === 'supportiveness') {
      valA = a.supportiveness;
      valB = b.supportiveness;
    } else if (window.sortAttribute === 'marks') {
      valA = a.marks;
      valB = b.marks;
    } else if (window.sortAttribute === 'total_ratings') {
      valA = a.total_ratings;
      valB = b.total_ratings;
    } else if (window.sortAttribute === 'name') {
      valA = a.name.toLowerCase();
      valB = b.name.toLowerCase();
      if (window.sortOrder === 'asc') {
        return valA.localeCompare(valB);
      } else {
        return valB.localeCompare(valA);
      }
    }
    
    if (window.sortOrder === 'asc') {
      return valA - valB;
    } else {
      return valB - valA;
    }
  });
}

function displayRatings() {
  const list = document.getElementById('ratingsList');
  const searchSection = document.getElementById('searchSection');
  const sortSection = document.getElementById('sortSection');
  const importSection = document.getElementById('importSection');
  const facultyCountSection = document.getElementById('facultyCountSection');
  const facultyCountEl = document.getElementById('facultyCount');
  
  if (!facultyRatingsData.length) {
    list.innerHTML = '<div class="card" style="padding: 20px; border-radius: 6px; text-align: center;"><div style="font-size: 13px; opacity: 0.7;">No ratings imported yet.</div></div>';
    if (searchSection) searchSection.style.display = 'none';
    if (sortSection) sortSection.style.display = 'none';
    if (importSection && facultyCountSection) {
      importSection.style.display = 'block';
      facultyCountSection.style.display = 'none';
    }
    return;
  }
  
  // Show search and sort sections when data is loaded
  if (searchSection) searchSection.style.display = 'block';
  if (sortSection) sortSection.style.display = 'block';
  if (importSection && facultyCountSection && facultyCountEl) {
    importSection.style.display = 'none';
    facultyCountSection.style.display = 'block';
    facultyCountEl.textContent = facultyRatingsData.length;
  }
  
  filterAndSortData();
  
  if (!filteredData.length) {
    list.innerHTML = '<div class="card" style="padding: 20px; border-radius: 6px; text-align: center;"><div style="font-size: 13px; opacity: 0.7;">No results found.</div></div>';
    return;
  }
  
  list.innerHTML = '';
  
  filteredData.forEach(faculty => {
    const item = document.createElement('div');
    item.className = 'card';
    item.style.cssText = 'padding: 14px; border-radius: 6px; margin-bottom: 10px;';
    item.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid;" class="faculty-divider">
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 14px; font-weight: 600; margin-bottom: 3px; overflow: hidden; text-overflow: ellipsis;">${faculty.name}</div>
          <div style="font-size: 10px; opacity: 0.6;">${faculty.faculty_id}</div>
        </div>
        <div style="padding: 4px 10px; border-radius: 4px; color: white; font-weight: 600; font-size: 13px; margin-left: 8px; flex-shrink: 0;" data-rating="${faculty.overall_rating.toFixed(1)}">
          ${faculty.overall_rating.toFixed(1)}
        </div>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span style="opacity: 0.7;">Teaching:</span>
          <span style="font-weight: 600;">${faculty.teaching.toFixed(1)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span style="opacity: 0.7;">Attendance:</span>
          <span style="font-weight: 600;">${faculty.attendance_flex.toFixed(1)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span style="opacity: 0.7;">Support:</span>
          <span style="font-weight: 600;">${faculty.supportiveness.toFixed(1)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px;">
          <span style="opacity: 0.7;">Marks:</span>
          <span style="font-weight: 600;">${faculty.marks.toFixed(1)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-top: 4px; padding-top: 6px; border-top: 1px solid;" class="ratings-divider">
          <span style="opacity: 0.6;">Total Ratings:</span>
          <span style="font-weight: 600;">${faculty.total_ratings}</span>
        </div>
      </div>
      <div style="font-size: 10px; opacity: 0.5; text-align: right; margin-top: 8px;">Updated: ${faculty.last_updated}</div>
    `;
    
    // Set rating badge color
    const ratingBadge = item.querySelector('[data-rating]');
    ratingBadge.style.backgroundColor = getRatingColor(faculty.overall_rating);
    
    // Set divider colors based on theme
    const isDark = document.body.classList.contains('dark-mode');
    const dividers = item.querySelectorAll('.faculty-divider, .ratings-divider');
    dividers.forEach(div => {
      div.style.borderColor = isDark ? '#404040' : '#e5e7eb';
    });
    
    list.appendChild(item);
  });
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        facultyRatingsData = data;
        chrome.storage.local.set({ facultyRatings: data }, () => {
          displayRatings();
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
        alert('Invalid JSON format.');
      }
    } catch (error) {
      alert('Error parsing JSON: ' + error.message);
    }
  };
  reader.readAsText(file);
}

function loadRatings() {
  chrome.storage.local.get(['facultyRatings'], result => {
    if (result.facultyRatings) {
      facultyRatingsData = result.facultyRatings;
      displayRatings();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Theme management
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const headerBorder = document.getElementById('header-border');
  
  // Load saved theme
  chrome.storage.local.get(['theme'], function(result) {
    const savedTheme = result.theme || 'dark';
    applyTheme(savedTheme);
  });
  
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.remove('light-mode');
      document.body.classList.add('dark-mode');
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      if (headerBorder) {
        headerBorder.style.borderBottomColor = '#404040';
      }
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      if (headerBorder) {
        headerBorder.style.borderBottomColor = '#e5e7eb';
      }
    }
  }
  
  themeToggle.addEventListener('click', function() {
    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
  });

  // Search functionality
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      displayRatings();
    });
  }
  
  // Sort functionality
  const sortAttribute = document.getElementById('sortAttribute');
  const sortOrderSelect = document.getElementById('sortOrder');
  
  if (sortAttribute) {
    sortAttribute.addEventListener('change', (e) => {
      window.sortAttribute = e.target.value;
      displayRatings();
    });
  }
  
  if (sortOrderSelect) {
    sortOrderSelect.addEventListener('change', (e) => {
      window.sortOrder = e.target.value;
      displayRatings();
    });
  }

  loadRatings();
  
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  
  document.getElementById('importAgainBtn')?.addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  
  document.getElementById('fileInput').addEventListener('change', e => {
    if (e.target.files.length) importFile(e.target.files[0]);
  });
  
  document.getElementById('backButton').addEventListener('click', () => {
    window.location.href = 'sidebar.html';
  });
});