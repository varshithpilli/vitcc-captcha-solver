(function() {
  'use strict';
  
  const isSidebarContext = window.location.protocol === 'chrome-extension:';
  console.log('VTOP Calendar Extractor loaded. Context:', isSidebarContext, 'URL:', window.location.href);
  
  if (isSidebarContext) {
    console.log('Running in sidebar context');
    const state = {
      csrf: null,
      authId: null,
      semesters: [],
      classGroups: [],
      months: [],
      files: {},
      selectedSemester: null
    };

    function initTheme() {
      const toggle = document.getElementById('theme-toggle');
      const sun = document.getElementById('sun-icon');
      const moon = document.getElementById('moon-icon');
      const border = document.getElementById('header-border');
      
      chrome.storage.local.get(['theme'], (r) => {
        applyTheme(r.theme || 'light');
      });
      
      function applyTheme(theme) {
        const isDark = theme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);
        document.body.classList.toggle('light-mode', !isDark);
        sun.style.display = isDark ? 'none' : 'block';
        moon.style.display = isDark ? 'block' : 'none';
        border.style.borderBottomColor = isDark ? '#404040' : '#e5e7eb';
      }
      
      toggle.addEventListener('click', () => {
        const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
        applyTheme(newTheme);
        chrome.storage.local.set({ theme: newTheme });
      });
    }

    function setStatus(id, msg, type) {
      console.log(`Setting status for ${id}: ${msg} (${type})`);
      const el = document.getElementById(id);
      if (el) {
        el.textContent = msg;
        el.className = `status status-${type}`;
        el.style.display = msg ? 'block' : 'none';
      } else {
        console.error(`Status element ${id} not found`);
      }
    }

    function showStep(stepNum) {
      const stepElement = document.getElementById(`step${stepNum}`);
      console.log(`Showing step ${stepNum}`, stepElement);
      if (stepElement) {
        stepElement.classList.remove('hidden');
      } else {
        console.error(`Step ${stepNum} element not found`);
      }
    }

    function hideStep(stepNum) {
      const stepElement = document.getElementById(`step${stepNum}`);
      if (stepElement) {
        stepElement.classList.add('hidden');
      }
    }

    async function findCredentials() {
      setStatus("credentialsStatus", "Checking VTOP page...", "info");

      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tab = tabs[0];

        try {
          const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const href = window.location.href;

              if (!href.includes("vtopcc.vit.ac.in")) {
                return { error: "Not inside VTOP session page" };
              }

              if (href.endsWith("/vtop/") || href.endsWith("/vtop") || href.includes("login")) {
                return { error: "Login page detected" };
              }

              const csrf = document.querySelector('input[name="_csrf"]')?.value || null;
              const authId = document.querySelector('input[name="authorizedID"]')?.value || null;

              return { csrf, authId };
            }
          });

          const { csrf, authId, error } = result?.result || {};

          if (error) {
            setStatus("credentialsStatus", error, "error");
            return;
          }

          if (!csrf || !authId) {
            setStatus("credentialsStatus", "Credentials missing. Try clicking any module first.", "error");
            return;
          }

          state.csrf = csrf;
          state.authId = authId;

          setStatus("credentialsStatus", `Found credentials → ID: ${authId}, CSRF: OK`, "success");

          console.log('Credentials found, loading semesters...');
          await loadSemesters(tab.id);
        } catch (e) {
          console.error('Error in findCredentials:', e);
          setStatus("credentialsStatus", "Error: " + e.message, "error");
        }
      });
    }

    async function loadSemesters(tabId) {
      try {
        setStatus('semesterStatus', 'Loading semesters...', 'info');
        
        const [result] = await chrome.scripting.executeScript({
          target: {tabId},
          func: async (csrf, authId) => {
            try {
              const formData = new URLSearchParams({
                _csrf: csrf,
                authorizedID: authId,
                verifyMenu: 'true',
                x: new Date().toUTCString()
              });

              const resp = await fetch('https://vtopcc.vit.ac.in/vtop/academics/common/CalendarPreview', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
              });
              
              if (!resp.ok) throw new Error(`Failed to fetch. Status: ${resp.status}`);
              
              const html = await resp.text();
              
              // Check if we got an error page
              if (html.includes('Sorry, Unable to process your request') || html.includes('___INTERNAL___RESPONSE___')) {
                throw new Error('VTOP returned an error. Try refreshing the VTOP page first.');
              }
              
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              
              const select = doc.getElementById('semesterSubId');
              if (!select) return {error: 'Could not load semesters from VTOP'};
              
              return Array.from(select.options)
                .filter(o => o.value)
                .map(o => ({id: o.value, name: o.textContent.trim()}));
            } catch (error) {
              return {error: error.message};
            }
          },
          args: [state.csrf, state.authId]
        });

        if (result?.result?.error) {
          setStatus('semesterStatus', 'Error: ' + result.result.error, 'error');
          showStep(1);
          return;
        }

        if (result?.result && result.result.length > 0) {
          state.semesters = result.result;
          const select = document.getElementById('semesterSelect');
          console.log('Populating semester select with', state.semesters);
          select.innerHTML = '<option value="">-- Select Semester --</option>' +
            state.semesters.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
          
          showStep(1);
          setStatus('semesterStatus', `Loaded ${state.semesters.length} semesters`, 'success');
          
          // Remove and re-add event listener
          select.removeEventListener('change', onSemesterChange);
          select.addEventListener('change', onSemesterChange);
        } else {
          setStatus('semesterStatus', 'No semesters found', 'error');
          showStep(1);
        }
      } catch (e) {
        console.error('Error in loadSemesters:', e);
        setStatus('semesterStatus', 'Error: ' + e.message, 'error');
        showStep(1);
      }
    }

    async function onSemesterChange(e) {
      console.log('Semester changed:', e.target.value);
      const semId = e.target.value;
      
      if (!semId) {
        console.log('No semester selected, hiding steps 2 and 3');
        hideStep(2);
        hideStep(3);
        setStatus('semesterStatus', '', 'info');
        return;
      }

      state.selectedSemester = state.semesters.find(s => s.id === semId);
      console.log('Selected semester:', state.selectedSemester);
      setStatus('semesterStatus', 'Loading class groups and months...', 'info');
      
      try {
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
          const [result] = await chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            func: async (csrf, authId, semId) => {
              try {
                const formData = new URLSearchParams({
                  _csrf: csrf,
                  paramReturnId: 'getDateForSemesterPreview',
                  semSubId: semId,
                  authorizedID: authId,
                  x: new Date().toUTCString()
                });

                const resp = await fetch('https://vtopcc.vit.ac.in/vtop/getDateForSemesterPreview', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                  },
                  body: formData
                });
                
                if (!resp.ok) throw new Error(`Failed to fetch. Status: ${resp.status}`);
                
                const html = await resp.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                const classGroupElements = doc.querySelectorAll('#classGroupId option');
                const classGroups = Array.from(classGroupElements)
                  .filter(o => o.value)
                  .map(o => ({id: o.value, name: o.textContent.trim()}));
                
                const monthElements = doc.querySelectorAll('a[onclick*="processViewCalendar"]');
                const months = Array.from(monthElements)
                  .map(a => {
                    const match = a.getAttribute('onclick').match(/'([^']+)'/);
                    return match ? {date: match[1], name: a.textContent.trim()} : null;
                  }).filter(Boolean);

                return {classGroups, months};
              } catch (error) {
                return {error: error.message};
              }
            },
            args: [state.csrf, state.authId, semId]
          });

          if (result?.result?.error) {
            setStatus('semesterStatus', 'Error: ' + result.result.error, 'error');
            hideStep(2);
            return;
          }

          const resultData = result?.result;
          if (resultData?.classGroups && resultData?.months) {
            state.classGroups = resultData.classGroups;
            state.months = resultData.months;
            
            const cgContainer = document.getElementById('classGroupsContainer');
            if (resultData.classGroups.length === 0) {
              cgContainer.innerHTML = '<p style="color: #6b7280; font-size: 13px;">No class groups available</p>';
            } else {
              cgContainer.innerHTML = resultData.classGroups.map(cg => 
                `<label class="checkbox-item">
                  <input type="checkbox" value="${cg.id}">
                  <span>${cg.name}</span>
                </label>`
              ).join('');
            }

            const mContainer = document.getElementById('monthsContainer');
            if (resultData.months.length === 0) {
              mContainer.innerHTML = '<p style="color: #6b7280; font-size: 13px;">No months available</p>';
            } else {
              mContainer.innerHTML = resultData.months.map(m => 
                `<label class="checkbox-item">
                  <input type="checkbox" value="${m.date}" checked>
                  <span>${m.name}</span>
                </label>`
              ).join('');
            }

            showStep(2);
            setStatus('semesterStatus', `Loaded ${resultData.classGroups.length} class groups and ${resultData.months.length} months`, 'success');
          } else {
            setStatus('semesterStatus', 'No data found', 'error');
            hideStep(2);
          }
        });
      } catch (e) {
        console.error('Error in onSemesterChange:', e);
        setStatus('semesterStatus', 'Error: ' + e.message, 'error');
        hideStep(2);
      }
    }

    async function extractCalendar() {
      console.log('Extract calendar clicked');
      const selectedSem = document.getElementById('semesterSelect').value;
      const semName = state.selectedSemester?.name;
      
      if (!selectedSem || !semName) {
        setStatus('extractStatus', 'Please select a semester', 'error');
        return;
      }

      const selectedCGs = Array.from(document.querySelectorAll('#classGroupsContainer input:checked'))
        .map(cb => ({id: cb.value, name: cb.nextElementSibling.textContent}));
      
      const selectedMonths = Array.from(document.querySelectorAll('#monthsContainer input:checked'))
        .map(cb => ({date: cb.value, name: cb.nextElementSibling.textContent}));

      if (!selectedCGs.length || !selectedMonths.length) {
        setStatus('extractStatus', 'Select at least one class group and month', 'error');
        return;
      }

      const extractBtn = document.getElementById('extractBtn');
      extractBtn.disabled = true;
      extractBtn.textContent = 'Extracting...';
      
      document.getElementById('progressBar').classList.remove('hidden');
      document.getElementById('progressText').classList.remove('hidden');
      setStatus('extractStatus', 'Extraction in progress...', 'info');
      
      const total = selectedCGs.length * selectedMonths.length;
      let completed = 0;

      chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
        const extractionTime = new Date();
        
        for (const cg of selectedCGs) {
          const calendarData = {
            lastUpdated: extractionTime.toLocaleString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            }),
            lastUpdatedISO: extractionTime.toISOString(),
            semester: semName,
            classGroup: cg.name,
            months: {}
          };
          
          for (const month of selectedMonths) {
            try {
              completed++;
              const progress = (completed / total) * 100;
              document.getElementById('progressFill').style.width = `${progress}%`;
              document.getElementById('progressText').textContent = 
                `Processing ${completed}/${total}: ${cg.name} - ${month.name}`;
              
              const events = await fetchMonthData(tabs[0].id, selectedSem, cg.id, month.date);
              calendarData.months[month.name] = {
                date: month.date,
                events: events
              };
              
              await new Promise(resolve => setTimeout(resolve, 500));
              
            } catch (e) {
              console.error('Error fetching month data:', e);
              calendarData.months[month.name] = {
                date: month.date,
                error: e.message,
                events: []
              };
            }
          }
          
          const monthsStr = selectedMonths.map(m => m.name.split('-')[0]).join('_');
          const dateStr = extractionTime.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short'
          }).replace(/\s+/g, '');
          const filename = `${sanitizeFilename(semName)}_${sanitizeFilename(cg.name)}_${monthsStr}_Updated${dateStr}`;
          
          state.files[filename] = {
            data: calendarData,
            timestamp: Date.now()
          };
        }

        chrome.storage.local.set({vtopCalendarFiles: state.files});
        
        extractBtn.disabled = false;
        extractBtn.textContent = 'Extract Calendar';
        
        document.getElementById('progressBar').classList.add('hidden');
        document.getElementById('progressText').classList.add('hidden');
        
        setStatus('extractStatus', `Successfully extracted ${Object.keys(state.files).length} calendar(s)`, 'success');
        
        displayFiles();
        showStep(3);
      });
    }

    function sanitizeFilename(str) {
      return str.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_{2,}/g, '_');
    }

    async function fetchMonthData(tabId, semId, cgId, date) {
      return new Promise((resolve, reject) => {
        chrome.scripting.executeScript({
          target: {tabId},
          func: async (csrf, authId, semId, cgId, date) => {
            try {
              const formData = new URLSearchParams({
                _csrf: csrf,
                calDate: date,
                semSubId: semId,
                classGroupId: cgId,
                authorizedID: authId,
                x: new Date().toUTCString()
              });

              const resp = await fetch('https://vtopcc.vit.ac.in/vtop/processViewCalendar', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                  'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
              });
              
              if (!resp.ok) throw new Error('Failed to fetch calendar');
              
              const html = await resp.text();
              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              
              const monthTitle = doc.querySelector('h4')?.textContent.trim() || '';
              const days = [];
              const cells = doc.querySelectorAll('td[style*="padding: 8px"]');
              
              cells.forEach(cell => {
                const daySpan = cell.querySelector('span[style*="font-weight: bold"]');
                if (!daySpan || !daySpan.textContent.trim()) return;
                
                const dayNum = parseInt(daySpan.textContent.trim(), 10);
                if (isNaN(dayNum)) return;
                
                const events = [];
                const allSpans = Array.from(cell.querySelectorAll('span[style*="float: left"]'));
                
                for (let i = 0; i < allSpans.length; i++) {
                  const span = allSpans[i];
                  const text = span.textContent.trim();
                  
                  // Skip if this span is inside parentheses (it's a description, not a main event)
                  if (text.startsWith('(') && text.endsWith(')')) continue;
                  
                  if (text.includes('Holiday') || text.includes('Instructional') || 
                      text.includes('CAT') || text.includes('Exam') || text.includes('No Instructional')) {
                    
                    // Extract category from parentheses in the text
                    const categoryMatch = text.match(/\(([^)]+)\)/);
                    const category = categoryMatch ? categoryMatch[1].trim() : 'General';
                    
                    // Get description from the next span if it exists and is in parentheses
                    let description = '';
                    const nextSpan = allSpans[i + 1];
                    if (nextSpan) {
                      const nextText = nextSpan.textContent.trim();
                      if (nextText.startsWith('(') && nextText.endsWith(')')) {
                        description = nextText.replace(/[()]/g, '');
                      }
                    }
                    
                    events.push({
                      text: text,
                      category: category,
                      description: description
                    });
                  }
                }
                
                if (events.length > 0) {
                  days.push({date: dayNum, events});
                }
              });

              return {month: monthTitle, days};
            } catch (error) {
              return {error: error.message, month: '', days: []};
            }
          },
          args: [state.csrf, state.authId, semId, cgId, date]
        }, (results) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (results?.[0]?.result) {
            resolve(results[0].result);
          } else {
            reject(new Error('No result returned'));
          }
        });
      });
    }

    function displayFiles() {
      console.log('Displaying files, count:', Object.keys(state.files).length);
      const container = document.getElementById('filesContainer');
      const files = Object.keys(state.files);
      
      if (!files.length) {
        container.innerHTML = '<p style="color: #6b7280; font-size: 13px;">No files generated yet</p>';
        return;
      }

      container.innerHTML = files.map(name => {
        const escapedName = name.replace(/'/g, "\\'");
        return `
          <div class="file-item" style="flex-direction: column; align-items: stretch;">
            <span class="file-name" title="${name}.json" style="margin-bottom: 8px;">${name}.json</span>
            <div class="file-actions">
              <div class="file-actions-row">
                <button class="icon-btn" data-action="copy" data-name="${escapedName}">Copy</button>
                <button class="icon-btn" data-action="json" data-name="${escapedName}">JSON</button>
                <button class="icon-btn" data-action="ics" data-name="${escapedName}">ICS</button>
                <button class="icon-btn" data-action="github" data-name="${escapedName}">GitHub PR</button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      // Add event listeners to buttons
      container.querySelectorAll('.icon-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const action = e.currentTarget.getAttribute('data-action');
          const name = e.currentTarget.getAttribute('data-name');
          
          if (action === 'copy') {
            copyFile(name);
          } else if (action === 'json') {
            downloadFile(name);
          } else if (action === 'ics') {
            downloadICS(name);
          } else if (action === 'github') {
            await createGitHubPR(name);
          }
        });
      });

      const latest = Math.max(...Object.values(state.files).map(f => f.timestamp));
      document.getElementById('lastUpdated').textContent = 
        `Last updated: ${new Date(latest).toLocaleString()}`;
    }

    function copyFile(name) {
      const data = state.files[name]?.data;
      if (!data) {
        setStatus('extractStatus', 'File not found', 'error');
        return;
      }
      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
        .then(() => setStatus('extractStatus', 'Copied to clipboard', 'success'))
        .catch(() => setStatus('extractStatus', 'Failed to copy', 'error'));
    }

    function downloadFile(name) {
      const data = state.files[name]?.data;
      if (!data) {
        setStatus('extractStatus', 'File not found', 'error');
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    function downloadICS(name) {
      const file = state.files[name];
      if (!file) {
        setStatus('extractStatus', 'File not found', 'error');
        return;
      }
      const data = file.data;
      
      let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//VTOP Calendar//EN\r\n';
      ics += `X-WR-CALNAME:${data.semester} - ${data.classGroup}\r\n`;
      
      Object.entries(data.months).forEach(([monthName, monthData]) => {
        if (!monthData.events?.days) return;
        
        monthData.events.days.forEach(day => {
          const dateMatch = monthName.match(/(\w+)-(\d{4})/);
          if (!dateMatch) return;
          
          const monthMap = {
            'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
            'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
            'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
          };
          
          const month = monthMap[dateMatch[1]];
          const year = dateMatch[2];
          const dayNum = day.date.toString().padStart(2, '0');
          const date = `${year}${month}${dayNum}`;
          
          day.events.forEach(evt => {
            ics += `BEGIN:VEVENT\r\n`;
            ics += `DTSTART;VALUE=DATE:${date}\r\n`;
            ics += `SUMMARY:${evt.text}\r\n`;
            ics += `DESCRIPTION:${evt.description} (${evt.category})\r\n`;
            ics += `END:VEVENT\r\n`;
          });
        });
      });
      
      ics += 'END:VCALENDAR';
      
      const blob = new Blob([ics], {type: 'text/calendar'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    }

    async function createGitHubPR(name) {
      const file = state.files[name];
      if (!file) {
        setStatus('extractStatus', 'File not found', 'error');
        return;
      }

      try {
        setStatus('extractStatus', 'Preparing GitHub PR...', 'info');
        
        // Always clear method to force selection
        await window.VTOPCalendarDataUpdate.GitHubPRHandler.clearMethod();
        
        // Get stored config (without method)
        let config = await window.VTOPCalendarDataUpdate.GitHubPRHandler.getStoredConfig();
        
        // Always prompt for method selection (and other details if not stored)
        const newConfig = await window.VTOPCalendarDataUpdate.GitHubPRHandler.promptForConfig(config);
        
        // Save the complete config (including method and token)
        await window.VTOPCalendarDataUpdate.GitHubPRHandler.saveConfig(newConfig);
        
        // Create PR
        setStatus('extractStatus', 'Creating pull request...', 'info');
        const result = await window.VTOPCalendarDataUpdate.GitHubPRHandler.createPullRequest(file.data, name, newConfig);
        
        if (result.success) {
          if (result.method === 'web') {
            setStatus('extractStatus', result.message, 'success');
          } else {
            setStatus('extractStatus', `PR created successfully! #${result.prNumber}`, 'success');
            setTimeout(() => {
              if (confirm('Pull request created! Would you like to open it in a new tab?')) {
                window.open(result.prUrl, '_blank');
              }
            }, 500);
          }
        } else {
          setStatus('extractStatus', 'PR failed: ' + result.error, 'error');
        }
      } catch (error) {
        if (error.message !== 'Cancelled') {
          setStatus('extractStatus', 'Error: ' + error.message, 'error');
        }
      }
    }

    function init() {
      console.log('Initializing VTOP Calendar Extractor');
      initTheme();
      
      chrome.storage.local.get(['vtopCalendarFiles'], (r) => {
        if (r.vtopCalendarFiles) {
          state.files = r.vtopCalendarFiles;
          console.log('Loaded files from storage, count:', Object.keys(state.files).length);
          if (Object.keys(state.files).length > 0) {
            displayFiles();
            showStep(3);
          }
        }
      });

      document.getElementById('backButton').addEventListener('click', () => {
        window.location.href = 'sidebar.html';
      });

      document.getElementById('findCredentialsBtn').addEventListener('click', findCredentials);
      document.getElementById('extractBtn').addEventListener('click', extractCalendar);
      
      console.log('Initialization complete');
    }

    if (document.readyState === 'loading') {
      console.log('Document still loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', init);
    } else {
      console.log('Document already loaded, initializing immediately');
      init();
    }
  }
})();