const detectPage = () => {
  if (document.querySelector('table[id*="attendance"]') || 
      document.querySelector('span')?.textContent.includes('Attendance Details')) {
    if (!document.getElementById("attendance")) {
    view_attendance_page()
    }
  }
  
  if (document.querySelector('.customTable-level1')) {
    chrome.runtime.sendMessage({ message: "mark_view_page" });
  }
  
  if (document.getElementById("timeTableStyle") && !document.getElementById("sync_dates_btn")) {
    chrome.runtime.sendMessage({ message: "time_table" });
  }
  
//   // Check for exam schedule page
//   if (document.querySelector('tbody')?.innerHTML.includes('Exam Venue') ||
//       document.querySelector('.panelHead-secondary')) {
//     chrome.runtime.sendMessage({ message: "exam_schedule" });
//   }
};

// Initial check
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(detectPage, 500);
  });
} else {
  setTimeout(detectPage, 500);
}

// Watch for dynamic content changes in VTOP
const observer = new MutationObserver((mutations) => {
  // Debounce to avoid excessive calls
  clearTimeout(window.vibootDetectorTimeout);
  window.vibootDetectorTimeout = setTimeout(detectPage, 300);
});

// Observe the main content area where VTOP loads pages
const targetNode = document.getElementById('fixedNavbar') || document.body;
observer.observe(targetNode, {
  childList: true,
  subtree: true
});

setTimeout(() => {
  inject_nav();
  console.log("nav displayed");
}, 1000);