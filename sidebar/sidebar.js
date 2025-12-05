document.addEventListener('DOMContentLoaded', function() {
  // Theme management
  const themeToggle = document.getElementById('theme-toggle');
  const sunIcon = document.getElementById('sun-icon');
  const moonIcon = document.getElementById('moon-icon');
  const footerBorder = document.getElementById('footer-border');
  
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
      if (footerBorder) {
        footerBorder.style.borderTopColor = '#404040';
      }
    } else {
      document.body.classList.remove('dark-mode');
      document.body.classList.add('light-mode');
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      if (footerBorder) {
        footerBorder.style.borderTopColor = '#e5e7eb';
      }
    }
  }
  
  themeToggle.addEventListener('click', function() {
    const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    chrome.storage.local.set({ theme: newTheme });
  });
  
  // Clear storage functionality
  const clearStorageCard = document.getElementById('clear-storage-card');
  if (clearStorageCard) {
    clearStorageCard.addEventListener('click', function() {
      if (confirm('Are you sure you want to clear all stored data? This will remove all credentials, settings, faculty ratings, and preferences. This action cannot be undone.')) {
        chrome.storage.local.clear(() => {
          if (chrome.runtime.lastError) {
            alert('Error clearing storage: ' + chrome.runtime.lastError.message);
          } else {
            alert('All local storage cleared successfully! The extension has been reset.');
            // Reload all tabs to reflect the changes
            chrome.tabs.query({}, tabs => {
              tabs.forEach(tab => {
                chrome.tabs.reload(tab.id).catch(() => {});
              });
            });
          }
        });
      }
    });
  }
  
  // Feature cards navigation
  const featureCards = document.querySelectorAll('.card[data-target]');
  featureCards.forEach(card => {
    card.addEventListener('click', function() {
      const target = this.getAttribute('data-target');
      if (target) {
        window.location.href = target;
      }
    });
  });
  
  // Credentials card navigation
  const credentialsCard = document.getElementById('credentials-card');
  if (credentialsCard) {
    credentialsCard.addEventListener('click', function() {
      window.location.href = 'credentialsInjection.html';
    });
  }
  
  // Footer links - open in new tab
  const links = document.querySelectorAll('a[target="_blank"]');
  links.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      chrome.tabs.create({ url: this.href });
    });
  });
});
