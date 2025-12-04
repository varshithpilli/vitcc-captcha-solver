(function() {
    'use strict';

    let facultyRatings = [];
    let keywords = [];
    let highlightColor = '#FFFF00';
    let highlightEnabled = true;
    let settings = {
        viewShowRatings: true,
        viewShowDetails: false,
        viewSortRating: false,
        registerShowRatings: true,
        registerShowDetails: false,
        registerSortRating: false
    };
    const originalRowOrder = new WeakMap();

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

    function isFFCSPage() {
        return window.location.href.includes('vtopregcc.vit.ac.in');
    }

    function getPageType() {
        const tables = document.querySelectorAll('table.w3-table-all');
        if (!tables.length) return null;

        const viewSlotButtons = document.querySelectorAll('button[onclick*="callViewSlots"]');
        const proceedButtons = document.querySelectorAll('button[onclick*="callCourseRegistration"]');
        if (viewSlotButtons.length > 0 && proceedButtons.length > 0) return 'courseList';

        const radioButtons = document.querySelectorAll('input[type="radio"][name*="classnbr"]');
        const hasRegisterButton = !!document.querySelector('button[onclick*="registerCourse"]');
        const hasGoBack = !!document.querySelector('button[onclick*="goBack"]');
        if (radioButtons.length > 0 && (hasRegisterButton || hasGoBack)) return 'register';

        for (const table of tables) {
            const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim().toLowerCase());
            const hasSlot = headers.some(h => h.includes('slot'));
            const hasVenue = headers.some(h => h.includes('venue'));
            const hasFaculty = headers.some(h => h.includes('faculty'));
            if (hasSlot && hasVenue && hasFaculty && radioButtons.length === 0) return 'viewSlot';
        }

        return null;
    }

    function createBadge(faculty, showDetails) {
        const badge = document.createElement('span');
        badge.className = 'faculty-rating-badge';
        badge.style.cssText = 'margin-left:6px;padding:3px 7px;border-radius:3px;color:white;font-weight:bold;font-size:11px;display:inline-block;white-space:nowrap;vertical-align:middle;';

        if (!faculty) {
            badge.textContent = 'N/A';
            badge.style.backgroundColor = '#9E9E9E';
            return badge;
        }

        const rating = faculty.overall_rating.toFixed(1);
        if (showDetails) {
            badge.innerHTML = `${rating}⭐ T:${faculty.teaching} A:${faculty.attendance_flex} S:${faculty.supportiveness} M:${faculty.marks}`;
        } else {
            badge.textContent = `${rating}⭐`;
            badge.title = `${faculty.name}\nTeaching: ${faculty.teaching}\nAttendance: ${faculty.attendance_flex}\nSupport: ${faculty.supportiveness}\nMarks: ${faculty.marks}\nTotal Ratings: ${faculty.total_ratings}`;
        }
        badge.style.backgroundColor = getRatingColor(faculty.overall_rating);
        return badge;
    }

    function injectRatings() {
        if (!isFFCSPage()) return;

        const pageType = getPageType();
        if (!pageType) return;

        const tables = document.querySelectorAll('table.w3-table-all');
        const showRatings = pageType === 'viewSlot' ? settings.viewShowRatings : pageType === 'register' ? settings.registerShowRatings : false;
        const showDetails = pageType === 'viewSlot' ? settings.viewShowDetails : pageType === 'register' ? settings.registerShowDetails : false;
        const sortRating = pageType === 'viewSlot' ? settings.viewSortRating : pageType === 'register' ? settings.registerSortRating : false;

        if (!showRatings) {
            document.querySelectorAll('.faculty-rating-badge').forEach(el => el.remove());
            return;
        }

        tables.forEach(table => {
            const rows = Array.from(table.querySelectorAll('tr'));
            let facultyColIndex = -1;
            let availableColIndex = -1;

            rows.forEach(row => {
                const headerCells = row.querySelectorAll('th');
                if (headerCells.length > 0 && facultyColIndex === -1) {
                    headerCells.forEach((cell, i) => {
                        const headerText = cell.textContent.trim().toLowerCase();
                        if (headerText.includes('faculty')) facultyColIndex = i;
                        if (headerText.includes('available')) availableColIndex = i;
                    });
                }
            });

            if (facultyColIndex === -1) return;

            if (!originalRowOrder.has(table)) {
                const tbody = table.querySelector('tbody') || table;
                originalRowOrder.set(table, Array.from(tbody.querySelectorAll('tr')));
            }

            const sections = [];
            let currentSection = { header: null, rows: [] };

            rows.forEach((row, idx) => {
                if (idx === 0) return;
                const cells = row.querySelectorAll('td');
                if (cells.length === 0) return;

                const rowText = row.textContent.toLowerCase();
                const firstCell = cells[0];
                const hasColspan = firstCell && (firstCell.getAttribute('colspan') || firstCell.colSpan > 1);
                const isSectionHeader = hasColspan && (rowText.includes('theory') || rowText.includes('lab') || rowText.includes('embedded'));

                if (isSectionHeader) {
                    if (currentSection.rows.length > 0) sections.push(currentSection);
                    currentSection = { header: row, rows: [] };
                    return;
                }

                if (cells.length <= facultyColIndex) return;
                const facultyCell = cells[facultyColIndex];
                if (!facultyCell || cells[0].tagName === 'TH') return;

                facultyCell.querySelectorAll('.faculty-rating-badge').forEach(b => b.remove());

                const facultyName = facultyCell.textContent.replace(/\s+/g, ' ').trim();
                if (!facultyName) return;

                const faculty = findFaculty(facultyName);
                const badge = createBadge(faculty, showDetails);
                facultyCell.appendChild(badge);

                let availSeats = 0;
                if (availableColIndex !== -1 && cells[availableColIndex]) {
                    const availText = cells[availableColIndex].textContent.trim();
                    const isFull = /full|seat\(s\) are full/i.test(availText);
                    availSeats = isFull || availText === '' ? 0 : parseInt(availText) || 0;
                }

                currentSection.rows.push({ row, faculty, availSeats });
            });

            if (currentSection.rows.length > 0) sections.push(currentSection);

            if (sortRating && sections.length > 0) {
                const tbody = table.querySelector('tbody') || table;
                sections.forEach(section => {
                    section.rows.sort((a, b) => {
                        if (!a.faculty && b.faculty) return 1;
                        if (a.faculty && !b.faculty) return -1;
                        if (!a.faculty && !b.faculty) return 0;
                        if (pageType === 'register') {
                            if (a.availSeats === 0 && b.availSeats > 0) return 1;
                            if (a.availSeats > 0 && b.availSeats === 0) return -1;
                        }
                        return b.faculty.overall_rating - a.faculty.overall_rating;
                    });
                });
                sections.forEach(section => {
                    if (section.header) tbody.appendChild(section.header);
                    section.rows.forEach(item => tbody.appendChild(item.row));
                });
            } else if (!sortRating) {
                const originalRows = originalRowOrder.get(table);
                if (originalRows) {
                    const tbody = table.querySelector('tbody') || table;
                    originalRows.forEach(row => {
                        if (row.parentElement === tbody) tbody.appendChild(row);
                    });
                }
            }
        });

        highlightKeywords();
    }

    let highlightTimeout;
    function applyKeywordHighlighting() {
        if (!window.location.href.includes('vtopregcc.vit.ac.in')) return;
        clearTimeout(highlightTimeout);
        highlightTimeout = setTimeout(highlightKeywords, 100);
    }

    function highlightKeywords() {
        removeHighlights();
        if (!highlightEnabled || keywords.length === 0) return;
        
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                    const parent = node.parentElement;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    const tag = parent.tagName;
                    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'MARK'].includes(tag)) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );
        
        const textNodes = [];
        let node;
        while (node = walker.nextNode()) textNodes.push(node);
        
        keywords.forEach(keyword => {
            if (!keyword?.trim()) return;
            const regex = new RegExp(keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&'), 'gi');
            
            textNodes.forEach(textNode => {
                const text = textNode.nodeValue;
                const matches = [];
                let match;
                
                while ((match = regex.exec(text)) !== null) {
                    matches.push({ start: match.index, end: match.index + match[0].length });
                }
                
                if (matches.length > 0 && textNode.parentNode) {
                    const frag = document.createDocumentFragment();
                    let lastIdx = 0;
                    
                    matches.forEach(m => {
                        if (m.start > lastIdx) frag.appendChild(document.createTextNode(text.substring(lastIdx, m.start)));
                        const mark = document.createElement('mark');
                        mark.className = 'kw-hl';
                        mark.style.cssText = `background:${highlightColor};padding:1px 2px;border-radius:2px`;
                        mark.textContent = text.substring(m.start, m.end);
                        frag.appendChild(mark);
                        lastIdx = m.end;
                    });
                    
                    if (lastIdx < text.length) frag.appendChild(document.createTextNode(text.substring(lastIdx)));
                    textNode.parentNode.replaceChild(frag, textNode);
                }
            });
        });
    }
    
    function removeHighlights() {
        document.querySelectorAll('mark.kw-hl').forEach(mark => {
            const txt = document.createTextNode(mark.textContent);
            mark.parentNode?.replaceChild(txt, mark);
        });
        document.body.normalize();
    }


    function observeAndInject() {
        setTimeout(() => {
            injectRatings();
            applyKeywordHighlighting();
        }, 1000);
        
        let debounceTimer;
        const observer = new MutationObserver(() => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                injectRatings();
                applyKeywordHighlighting();
            }, 300);
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function initSidebar() {
        loadSettings();
        loadRatings();
        loadKeywords();

        document.getElementById('addKeywordBtn')?.addEventListener('click', addKeyword);
        
        document.getElementById('keywordInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addKeyword();
        });
        
        document.getElementById('highlightColorPicker')?.addEventListener('change', (e) => {
            highlightColor = e.target.value;
            chrome.storage.local.set({ highlightColor });
            chrome.tabs.query({}, tabs => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: 'KEYWORDS_UPDATED', keywords, highlightColor, highlightEnabled }).catch(() => {});
                });
            });
        });
        
        document.getElementById('highlightToggle')?.addEventListener('change', (e) => {
            highlightEnabled = e.target.checked;
            chrome.storage.local.set({ highlightEnabled });
            chrome.tabs.query({}, tabs => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: 'KEYWORDS_UPDATED', keywords, highlightColor, highlightEnabled }).catch(() => {});
                });
            });
        });

        ['viewShowRatings', 'viewShowDetails', 'viewSortRating'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                settings[id] = e.target.checked;
                saveSettings();
            });
        });

        ['registerShowRatings', 'registerShowDetails', 'registerSortRating'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                settings[id] = e.target.checked;
                saveSettings();
            });
        });

        document.getElementById('importBtn')?.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput')?.addEventListener('change', e => {
            if (e.target.files.length) importFile(e.target.files[0]);
        });

        document.getElementById('backButton')?.addEventListener('click', () => {
            window.location.href = 'sidebar.html';
        });
    }

    function loadSettings() {
        chrome.storage.local.get(['viewShowRatings', 'viewShowDetails', 'viewSortRating', 'registerShowRatings', 'registerShowDetails', 'registerSortRating'], result => {
            settings.viewShowRatings = result.viewShowRatings !== false;
            settings.viewShowDetails = result.viewShowDetails === true;
            settings.viewSortRating = result.viewSortRating === true;
            settings.registerShowRatings = result.registerShowRatings !== false;
            settings.registerShowDetails = result.registerShowDetails === true;
            settings.registerSortRating = result.registerSortRating === true;

            if (document.getElementById('viewShowRatings')) {
                document.getElementById('viewShowRatings').checked = settings.viewShowRatings;
                document.getElementById('viewShowDetails').checked = settings.viewShowDetails;
                document.getElementById('viewSortRating').checked = settings.viewSortRating;
                document.getElementById('registerShowRatings').checked = settings.registerShowRatings;
                document.getElementById('registerShowDetails').checked = settings.registerShowDetails;
                document.getElementById('registerSortRating').checked = settings.registerSortRating;
            }
        });
    }

    function saveSettings() {
        chrome.storage.local.set({
            viewShowRatings: settings.viewShowRatings,
            viewShowDetails: settings.viewShowDetails,
            viewSortRating: settings.viewSortRating,
            registerShowRatings: settings.registerShowRatings,
            registerShowDetails: settings.registerShowDetails,
            registerSortRating: settings.registerSortRating
        }, () => {
            chrome.tabs.query({}, tabs => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: 'SETTINGS_CHANGED', settings: settings }).catch(() => {});
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

    function loadKeywords() {
        chrome.storage.local.get(['keywords', 'highlightColor', 'highlightEnabled'], result => {
            keywords = result.keywords || [];
            highlightColor = result.highlightColor || '#FFFF00';
            highlightEnabled = result.highlightEnabled !== undefined ? result.highlightEnabled : true;
            if (document.getElementById('highlightColorPicker')) {
                document.getElementById('highlightColorPicker').value = highlightColor;
            }
            if (document.getElementById('highlightToggle')) {
                document.getElementById('highlightToggle').checked = highlightEnabled;
            }
            renderKeywords();
        });
    }

    function addKeyword() {
        const input = document.getElementById('keywordInput');
        const keyword = input.value.trim();
        if (keyword && !keywords.includes(keyword)) {
            keywords.push(keyword);
            chrome.storage.local.set({ keywords }, () => {
                renderKeywords();
                chrome.tabs.query({}, tabs => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, { type: 'KEYWORDS_UPDATED', keywords, highlightColor, highlightEnabled }).catch(() => {});
                    });
                });
            });
            input.value = '';
        }
    }

    function removeKeyword(keyword) {
        keywords = keywords.filter(k => k !== keyword);
        chrome.storage.local.set({ keywords }, () => {
            renderKeywords();
            chrome.tabs.query({}, tabs => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { type: 'KEYWORDS_UPDATED', keywords, highlightColor, highlightEnabled }).catch(() => {});
                });
            });
        });
    }

    function renderKeywords() {
        const container = document.getElementById('keywordsContainer');
        if (!container) return;
        
        if (keywords.length === 0) {
            container.innerHTML = '<span style="color:#999;font-size:11px;">No keywords added yet</span>';
            return;
        }
        
        container.innerHTML = '';
        keywords.forEach((k, index) => {
            const tag = document.createElement('div');
            tag.className = 'keyword-tag';
            tag.innerHTML = `${k}<button class="keyword-remove">×</button>`;
            const removeBtn = tag.querySelector('.keyword-remove');
            removeBtn.addEventListener('click', () => removeKeyword(k));
            container.appendChild(tag);
        });
    }

    function importFile(file) {
        const reader = new FileReader();
        reader.onload = e => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data) && data.length > 0) {
                    facultyRatings = data;
                    chrome.storage.local.set({ facultyRatings: data }, () => {
                        updateStatus('Imported successfully!', '#28a745');
                        updateStats();
                        chrome.tabs.query({}, tabs => {
                            tabs.forEach(tab => {
                                chrome.tabs.sendMessage(tab.id, { type: 'RATINGS_UPDATED', data: data }).catch(() => {});
                            });
                        });
                    });
                } else {
                    updateStatus('Invalid JSON format', '#dc3545');
                }
            } catch (error) {
                updateStatus('Error: ' + error.message, '#dc3545');
            }
        };
        reader.readAsText(file);
    }

    function updateStatus(msg, color) {
        const statusEl = document.getElementById('statusMessage');
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.style.color = color;
            if (color !== '#666') {
                setTimeout(() => {
                    statusEl.textContent = 'Click to import ratings data';
                    statusEl.style.color = '#666';
                }, 3000);
            }
        }
    }

    function updateStats() {
        const statsBox = document.getElementById('statsBox');
        if (statsBox) {
            if (facultyRatings.length > 0) {
                const avg = (facultyRatings.reduce((sum, f) => sum + f.overall_rating, 0) / facultyRatings.length).toFixed(1);
                statsBox.innerHTML = `<strong>${facultyRatings.length}</strong> faculty loaded | Avg: <strong>${avg}</strong>`;
                statsBox.style.display = 'block';
            } else {
                statsBox.style.display = 'none';
            }
        }
    }

    chrome.runtime?.onMessage.addListener((req) => {
        if (req.type === 'RATINGS_UPDATED' || req.type === 'FACULTY_RATINGS_UPDATED') {
            facultyRatings = req.data || [];
            setTimeout(injectRatings, 200);
        }
        if (req.type === 'SETTINGS_CHANGED' || req.type === 'FFCS_SETTINGS_CHANGED') {
            settings = req.settings || settings;
            setTimeout(injectRatings, 200);
        }
        if (req.type === 'KEYWORDS_UPDATED') {
            keywords = req.keywords || [];
            highlightColor = req.highlightColor || '#FFFF00';
            highlightEnabled = req.highlightEnabled !== undefined ? req.highlightEnabled : true;
            applyKeywordHighlighting();
        }
    });

    if (typeof chrome !== 'undefined' && chrome.storage) {
        if (isFFCSPage()) {
            chrome.storage.local.get(['facultyRatings', 'keywords', 'highlightColor', 'highlightEnabled', 'viewShowRatings', 'viewShowDetails', 'viewSortRating', 'registerShowRatings', 'registerShowDetails', 'registerSortRating'], result => {
                facultyRatings = result.facultyRatings || [];
                keywords = result.keywords || [];
                highlightColor = result.highlightColor || '#FFFF00';
                highlightEnabled = result.highlightEnabled !== undefined ? result.highlightEnabled : true;
                settings.viewShowRatings = result.viewShowRatings !== false;
                settings.viewShowDetails = result.viewShowDetails === true;
                settings.viewSortRating = result.viewSortRating === true;
                settings.registerShowRatings = result.registerShowRatings !== false;
                settings.registerShowDetails = result.registerShowDetails === true;
                settings.registerSortRating = result.registerSortRating === true;

                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', () => setTimeout(observeAndInject, 500));
                } else {
                    setTimeout(observeAndInject, 500);
                }
            });
        } else if (document.getElementById('importBtn')) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', initSidebar);
            } else {
                initSidebar();
            }
        }
    }
})();