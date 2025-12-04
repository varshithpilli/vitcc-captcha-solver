document.addEventListener('DOMContentLoaded', function() {
  // Theme management
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const headerBorder = document.getElementById('header-border');
  
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
  
  const backButton = document.getElementById('backButton');
  backButton.addEventListener('click', function() {
    window.location.href = 'sidebar.html';
  });
});