/*
==============================================================================================
Help Center - Tips and Tricks JavaScript with Electron IPC
Handles registry data loading and UI management
==============================================================================================
*/

let data = {
    mainHeadings: []
};

let currentMainHeadingIndex = null;
let currentSubHeadingIndex = null;
let allSubHeadings = [];
let currentGlobalIndex = -1;
let expandedSections = new Set();
let currentLanguage = 'en';
let currentUser = 'default';
let currentDatabase = 'CDCCOMMON';
let queryMode = false;



// Dictionary of UI texts
const UI_TRANSLATIONS = {
    en: {
        nav_tips: "Tips & Tricks",
        nav_whatsnew: "What's New",
        nav_assistant: "Assistant",
        no_tips: "No tips available",
        welcome_title: "Welcome",
        welcome_msg: "Select a tip from the sidebar",
        whatsnew_header: "What's New",
        whatsnew_sub: "Latest updates and improvements",
        no_updates: "No updates found",
        chat_title: "BPAL Assistant",
        chat_sub: "Ask anything about the application",
        chat_placeholder: "Type your message...",
        chat_send: "Send",
        title: "BPAL Help Center",
        always_show_on_login: "Always show on login"
    },
    fr: {
        nav_tips: "Trucs & Astuces",
        nav_whatsnew: "Quoi de neuf",
        nav_assistant: "Assistant",
        no_tips: "Aucun conseil disponible",
        welcome_title: "Bienvenue",
        welcome_msg: "Sélectionnez un conseil dans la barre latérale",
        whatsnew_header: "Quoi de neuf",
        whatsnew_sub: "Dernières mises à jour et améliorations",
        no_updates: "Aucune mise à jour trouvée",
        chat_title: "Assistant BPAL",
        chat_sub: "Posez n'importe quelle question sur l'application",
        chat_placeholder: "Tapez votre message...",
        chat_send: "Envoyer",
        title: "Centre d'aide BPAL",
        always_show_on_login: "Toujours afficher lors de la connexion"
    }
};

// Function to apply translations
function updateStaticInterface(language) {
    const texts = UI_TRANSLATIONS[language] || UI_TRANSLATIONS['en'];

    // 1. Update text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (texts[key]) {
            el.innerText = texts[key];
        }
    });

    // 2. Update placeholders (for inputs/textareas)
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (texts[key]) {
            el.placeholder = texts[key];
        }
    });
}


// Mock data for testing (replace with registry data)
const mockData = {
    mainHeadings: [

    ]
};



/*
==============================================================================================
Help Center - Tips and Tricks JavaScript with Electron IPC
...
*/

document.addEventListener('DOMContentLoaded', function () {
    try {
       //  console.log('Initializing Help Center...');
        // alert("in here");
        // Request data from main process
        if (window.electron && window.electron.ipcRenderer) {
            // Electron environment
           //  console.log('Electron environment detected');

            window.electron.ipcRenderer.invoke('get-help-center-data').then((response) => {
    // Always set defaults safely
    currentLanguage = response?.language || 'en';
    currentUser = response?.userId || 'default';
    currentDatabase = response?.database || 'CDCCOMMON';
    queryMode = response?.queryMode || false;

    // Always update UI language
    updateStaticInterface(currentLanguage);

   
    const wn = response?.whatsNewData || [];
    console.log("WN length:", wn.length, "success:", response?.success);
    renderWhatsNew(wn);
    checkAndHandleMajorUpdates(wn);

    // Tips data is optional
    if (response?.jsonData) {
        try {
            data = JSON.parse(response.jsonData);
            console.log('[CLIENT] jsonData length:', response?.jsonData);
console.log('[CLIENT] mainHeadings count:', data?.mainHeadings?.length);
console.log('[CLIENT] first heading:', data?.mainHeadings?.[0]);
        } catch (e) {
            console.error('Error parsing JSON data:', e);
            data = JSON.parse(JSON.stringify(mockData));
        }
    } else {
        data = JSON.parse(JSON.stringify(mockData));
    }

    // Continue app regardless of tips being empty
    if (queryMode) {
        checkUserPreferenceAndProceed();
    } else {
        initializeApp();
    }

}).catch((err) => {
    console.error('Error getting data from main process:', err);

    // Still allow app to run
    updateStaticInterface(currentLanguage);
    renderWhatsNew([]);               // empty What's New fallback
    data = JSON.parse(JSON.stringify(mockData));
    initializeApp();
});
        } else {
            // Fallback to mock data
           //  console.log('Web environment, using mock data');
            data = JSON.parse(JSON.stringify(mockData));
            initializeApp();
        }

    } catch (error) {
        console.error('Error initializing:', error);
        showEmptyState('Error loading tips: ' + error.message);
    }
});

// Check user preference in query mode
function checkUserPreferenceAndProceed() {
    const prefKey = `${currentUser}_${currentDatabase}_showTips`;
    const savedPref = localStorage.getItem(prefKey);

   //  console.log(`Query mode: checking preference for ${prefKey}`);

    if (savedPref === 'false') {
        // User has disabled tips, close the window

        window.close();

        return;
    }

    // Either preference is null (new user) or true, show the window
    if (savedPref === null) {
        // New user - set default to true
        localStorage.setItem(prefKey, 'true');
       //  console.log('New user, set preference to true');
    }

    initializeApp();
}

// Initialize the app after data is loaded
function initializeApp() {
    initializeStartupSettings();
    buildSubHeadingsList();

    if (allSubHeadings.length > 0) {
        currentGlobalIndex = 0;
        currentMainHeadingIndex = allSubHeadings[0].mainIndex;
        currentSubHeadingIndex = allSubHeadings[0].subIndex;

        expandedSections.clear();
        expandedSections.add(currentMainHeadingIndex);
    } else {
       
        currentGlobalIndex = -1;
        currentMainHeadingIndex = null;
        currentSubHeadingIndex = null;
        expandedSections.clear();
    }

    // Always render tips layout (sidebar will show "No tips available")
    renderSidebar();
    renderContent();

    updateTitle();
    setupChatAPI();
}

// Setup chat API connection
function setupChatAPI() {
    // Initialize chat with server endpoint
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Setup preference checkbox if in Tips tab
    setupPreferenceCheckbox();
}

// Setup preference checkbox handler
function setupPreferenceCheckbox() {
    // Preference checkbox will be added to tips tab navigation footer
    // This allows users to control whether tips show on startup in query mode
    const prefKey = `${currentUser}_${currentDatabase}_showTips`;
    const savedPref = localStorage.getItem(prefKey);

    // Create a checkbox in a future update if needed
   //  console.log(`Preference loaded: ${prefKey} = ${savedPref}`);
}

// Build flat list of all subheadings for navigation
function buildSubHeadingsList() {
    allSubHeadings = [];
    data.mainHeadings.forEach((mainHeading, mainIndex) => {
        if (mainHeading.subHeadings && Array.isArray(mainHeading.subHeadings)) {
            mainHeading.subHeadings.forEach((subHeading, subIndex) => {
                allSubHeadings.push({
                    mainIndex: mainIndex,
                    subIndex: subIndex,
                    title: subHeading.title,
                    data: subHeading
                });
            });
        }
    });
   //  console.log('Built subheadings list with', allSubHeadings.length, 'items');
}

// Update window title based on language
function updateTitle() {
    const titleElement = document.getElementById("title-tips");
    if (titleElement) {
        titleElement.textContent = currentLanguage === 'fr' ? "Centre d'aide" : "Help Center";
    }
}

// Show empty state message
function showEmptyState(message) {
    const sidebar = document.getElementById('sidebar');
    const contentArea = document.getElementById('contentArea');

    if (sidebar) {
        sidebar.innerHTML = `<div class="empty-state"><p>${message}</p></div>`;
    }

    if (contentArea) {
        contentArea.innerHTML = `<div class="empty-state"><h2>No Content Available</h2><p>${message}</p></div>`;
    }
}

// Parse markdown-like content
function parseContent(text) {
    if (!text) return '';

    let html = text;
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
    html = html.replace(/`(.+?)`/g, '<code>$1</code>');
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/^---$/gim, '<hr>');
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');

    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }

    return html;
}

// Render sidebar with all categories and tips
function renderSidebar() {
    const sidebar = document.getElementById('sidebar');

    if (data.mainHeadings.length === 0) {
        sidebar.innerHTML = `<div class="empty-state"><p>No tips available</p></div>`;
        return;
    }

    if (expandedSections.size === 0 && data.mainHeadings.length > 0) {
        expandedSections.add(0);
    }

    sidebar.innerHTML = '';

    data.mainHeadings.forEach((mainHeading, mainIndex) => {
        const section = document.createElement('div');
        section.className = 'sidebar-section';

        const mainDiv = document.createElement('div');
        mainDiv.className = 'main-heading-container';

        const isExpanded = expandedSections.has(mainIndex);

        const titleDiv = document.createElement('div');
        titleDiv.className = 'main-heading-title';
        titleDiv.innerHTML = `
            <span class="expand-icon ${isExpanded ? 'expanded' : 'collapsed'}">${isExpanded ? '−' : '+'}</span>
            <span>${mainHeading.title}</span>
        `;
        titleDiv.onclick = () => toggleSection(mainIndex);

        mainDiv.appendChild(titleDiv);
        section.appendChild(mainDiv);

        const subList = document.createElement('div');
        subList.className = `sub-heading-list ${isExpanded ? '' : 'collapsed'}`;
        subList.id = `sublist-${mainIndex}`;

        if (mainHeading.subHeadings && Array.isArray(mainHeading.subHeadings)) {
            mainHeading.subHeadings.forEach((subHeading, subIndex) => {
                const subDiv = document.createElement('div');
                subDiv.className = 'sub-heading';

                const globalIndex = allSubHeadings.findIndex(
                    item => item.mainIndex === mainIndex && item.subIndex === subIndex
                );

                if (currentGlobalIndex === globalIndex) {
                    subDiv.classList.add('active');
                }

                subDiv.textContent = subHeading.title;
                subDiv.onclick = () => selectSubHeading(mainIndex, subIndex);
                subList.appendChild(subDiv);
            });
        }

        section.appendChild(subList);
        sidebar.appendChild(section);
    });
}

// Toggle sidebar section expand/collapse
function toggleSection(mainIndex) {
    const wasExpanded = expandedSections.has(mainIndex);

    if (wasExpanded) {
        expandedSections.delete(mainIndex);
        if (expandedSections.size === 0) {
            const nextIndex = (mainIndex + 1) % data.mainHeadings.length;
            expandedSections.add(nextIndex);
        }
    } else {
        expandedSections.clear();
        expandedSections.add(mainIndex);
    }

    renderSidebar();
}

// Select a specific subheading
function selectSubHeading(mainIndex, subIndex) {
    currentMainHeadingIndex = mainIndex;
    currentSubHeadingIndex = subIndex;

    expandedSections.clear();
    expandedSections.add(mainIndex);

    currentGlobalIndex = allSubHeadings.findIndex(
        item => item.mainIndex === mainIndex && item.subIndex === subIndex
    );

    renderContent();
    renderSidebar();
}

// Render the main content area
function renderContent() {
     const contentArea = document.getElementById('contentArea');
    if (!contentArea) return;

    
    if (currentMainHeadingIndex === null || currentSubHeadingIndex === null) {
        contentArea.innerHTML = `
            <div class="empty-state">
                <h2>${currentLanguage === 'fr' ? 'Bienvenue' : 'Welcome'}</h2>
                <p>${currentLanguage === 'fr'
                    ? 'Aucun conseil disponible. Consultez "Quoi de neuf" ou utilisez Assistant.'
                    : 'No tips available. Open "What’s New" or use Assistant.'}
                </p>
            </div>
        `;
        return;
    }

    if (!data.mainHeadings[currentMainHeadingIndex] ||
        !data.mainHeadings[currentMainHeadingIndex].subHeadings[currentSubHeadingIndex]) {
        console.log('DEBUG: No valid heading selected');
        contentArea.innerHTML = `<div class="empty-state"><h2>Content Not Found</h2></div>`;
        return;
    }

    const mainHeading = data.mainHeadings[currentMainHeadingIndex];
    const subHeading = mainHeading.subHeadings[currentSubHeadingIndex];
    
    console.log('DEBUG: subHeading:', subHeading);
    console.log('DEBUG: subHeading.steps:', subHeading.steps);
    console.log('DEBUG: has steps?', subHeading.steps && Array.isArray(subHeading.steps));
    console.log('DEBUG: steps count:', subHeading.steps ? subHeading.steps.length : 0);
    // Create main wrapper
    let html = `<div class="content-wrapper">
        <div class="content-header">
            <h1 class="content-title">${escapeHtml(subHeading.title)}</h1>
        </div>
        <div class="content-body" id="contentBody">
        </div>`;

    // Add preference checkbox and navigation buttons
    const prefKey = `${currentUser}_${currentDatabase}_showTips`;
    const savedPref = localStorage.getItem(prefKey);
    const isCheckedAttribute = savedPref !== 'false' ? 'checked' : '';

    html += `</div>
        <div class="navigation-footer">
        <div style="display: flex; align-items: center;">
            <label style="display: flex; align-items: center; cursor: pointer; user-select: none; gap: 8px;">
                <input type="checkbox" 
                       id="showOnStartup" 
                       ${isCheckedAttribute}
                       onchange="toggleStartupSetting(this)"
                       style="width: 15px; height: 15px; cursor: pointer; accent-color: #6b7280;">
                <span style="font-size: 13px; color: #374151; font-weight: 500;">Always show on login</span>
            </label>
        </div>
            <div style="display: flex; gap: 8px; margin-left: auto;">
              <button class="nav-button" onclick="navigateFirst()" title="First" style="display: flex; align-items: center; justify-content: center; padding: 6px 12px;">
                <img src="./images/first.bmp" alt="First" style="height: 16px; width: auto;">
            </button>
            
            <button class="nav-button" onclick="navigatePrevious()" title="Previous" style="display: flex; align-items: center; justify-content: center; padding: 6px 12px;">
                <img src="./images/previous.bmp" alt="Previous" style="height: 16px; width: auto;">
            </button>
            
            <button class="nav-button" onclick="navigateNext()" title="Next" style="display: flex; align-items: center; justify-content: center; padding: 6px 12px;">
                <img src="./images/next.bmp" alt="Next" style="height: 16px; width: auto;">
            </button>
            
            <button class="nav-button" onclick="navigateLast()" title="Last" style="display: flex; align-items: center; justify-content: center; padding: 6px 12px;">
                <img src="./images/last.bmp" alt="Last" style="height: 16px; width: auto;">
            </button>
            </div>
        </div>
    </div>`;

    // Insert HTML into page
    contentArea.innerHTML = html;

    // NOW: Initialize Quill editors after DOM is ready
    // This is where the magic happens for Tips & Tricks!
   setTimeout(() => {
        console.log('=== DEBUG: setTimeout running ===');
        const contentBody = document.getElementById('contentBody');
        console.log('DEBUG: contentBody found?', !!contentBody);
        
        if (subHeading.steps && Array.isArray(subHeading.steps)) {
            console.log('DEBUG: Processing', subHeading.steps.length, 'steps');
            
            if (contentBody) {
                subHeading.steps.forEach((step, stepIndex) => {
                    console.log('DEBUG: Calling displayTipsStepWithQuill for step', stepIndex);
                    displayTipsStepWithQuill(step, stepIndex);
                });
            }
        } else {
            console.log('DEBUG: No steps array found');
        }
    }, 50);
}

function displayTipsStepWithQuill(step, stepIndex) {
    if (typeof registerBpalReadOnlySpacing === 'function') registerBpalReadOnlySpacing();
    try {
        const contentBody = document.getElementById('contentBody');
        
        if (!contentBody) {
            console.error('DEBUG: contentBody not found');
            return;
        }

        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-section';
        stepDiv.id = `tips-step-${stepIndex}`;

        if (step.imagePath && step.imagePath.trim() !== '') {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'image-area';
            imageDiv.innerHTML = `
                <img src="${escapeHtml(step.imagePath)}" alt="Step ${stepIndex + 1}" onerror="this.src='./images/placeholder.png'">
            `;
            stepDiv.appendChild(imageDiv);
        }

        let quill = null;
        const editorId = `tips-quill-editor-${stepIndex}`;

        if (step.text && step.text.trim() !== '') {
            const editorDiv = document.createElement('div');
            editorDiv.id = editorId;
            editorDiv.className = 'text-area';
            stepDiv.appendChild(editorDiv);
        }

        // IMPORTANT: Append to DOM FIRST, then initialize Quill
        contentBody.appendChild(stepDiv);

        // Now the element is in the DOM, Quill can find it
        if (step.text && step.text.trim() !== '') {
            try {
                quill = new Quill(`#${editorId}`, {
                    theme: 'snow',
                    readOnly: true,
                    modules: {
                        toolbar: false
                    }
                });

                // Register formats and set content
                if (typeof Quill !== 'undefined') {
                    const FontStyle = Quill.import('attributors/style/font');
                    FontStyle.whitelist = [
                        'arial', 'courier', 'georgia', 'helvetica', 'lucida',
                        'tahoma', 'times', 'trebuchet', 'verdana'
                    ];
                    Quill.register(FontStyle, true);

                    const SizeStyle = Quill.import('attributors/style/size');
                    SizeStyle.whitelist = [
                        '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px',
                        '20px', '22px', '24px', '26px', '28px', '32px', '36px', '40px',
                        '48px', '56px', '64px', '72px'
                    ];
                    Quill.register(SizeStyle, true);
                }

                // Fix font family names
                const fontMap = {
                    'lucida': "'Lucida Console', monospace",
                    'times': "'Times New Roman', serif",
                    'courier': "'Courier New', monospace",
                    'helvetica': 'Helvetica, sans-serif',
                    'arial': 'Arial, sans-serif',
                    'verdana': 'Verdana, sans-serif',
                    'georgia': 'Georgia, serif',
                    'tahoma': 'Tahoma, sans-serif',
                    'trebuchet': "'Trebuchet MS', sans-serif"
                };

                let fixedHtml = step.text;
                Object.keys(fontMap).forEach(shortName => {
                    const regex = new RegExp(`font-family:\\s*${shortName}\\s*;?`, 'gi');
                    fixedHtml = fixedHtml.replace(regex, `font-family: ${fontMap[shortName]};`);
                });

                quill.root.innerHTML = fixedHtml;

            } catch (error) {
                console.error('Error initializing Quill for step', stepIndex, error);
                // Fallback
                const editorDiv = document.getElementById(editorId);
                if (editorDiv) {
                    editorDiv.innerHTML = step.text;
                }
            }
        }

        // Font check (only if quill was created)
        if (quill) {
            const firstStrong = quill.root.querySelector('strong[style*="font-family"]');
            if (firstStrong) {
                const computedFont = window.getComputedStyle(firstStrong).fontFamily;
                if (!computedFont.includes('Courier')) {
                    firstStrong.style.cssText = firstStrong.getAttribute('style');
                }
            }
        }

    } catch (error) {
        console.error('DEBUG: Error in displayTipsStepWithQuill:', error);
    }
}

/**
 * Display a single step with Quill
 */
function displayStep(step, stepIndex) {
    const contentBody = document.getElementById('contentBody');
    
    if (!contentBody) return;

    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-section';
    stepDiv.id = `step-${stepIndex}`;

    // Add image if present
    if (step.imagePath && step.imagePath.trim() !== '') {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'image-area';
        imageDiv.innerHTML = `<img src="${escapeHtml(step.imagePath)}" alt="Step ${stepIndex + 1}" onerror="this.src='./images/placeholder.png'">`;
        stepDiv.appendChild(imageDiv);
    }

    // Add Quill editor for text content (read-only)
    if (step.text && step.text.trim() !== '') {
        const editorDiv = document.createElement('div');
        const editorId = `quill-editor-${stepIndex}`;
        editorDiv.id = editorId;
        stepDiv.appendChild(editorDiv);

        // Initialize Quill with clean JSON content
        setTimeout(() => {
            try {
                const quill = new Quill(`#${editorId}`, {
                    theme: 'snow',
                    readOnly: true,  // ← Important: read-only mode
                    modules: {
                        toolbar: false  // No toolbar in read-only mode
                    }
                });

                // Load the HTML content from JSON
                quill.clipboard.dangerouslyPasteHTML(step.text);
            } catch (error) {
                console.error('Error initializing Quill for step', stepIndex, error);
                // Fallback: display as plain HTML
                editorDiv.innerHTML = step.text;
            }
        }, 10);
    }

    contentBody.appendChild(stepDiv);
}

function navigateFirst() {
    currentGlobalIndex = 0;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContent();  // Will now use Quill
    renderSidebar();
}

function navigatePrevious() {
    currentGlobalIndex = currentGlobalIndex <= 0 ? allSubHeadings.length - 1 : currentGlobalIndex - 1;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContent();
    renderSidebar();
}

function navigateNext() {
    currentGlobalIndex = currentGlobalIndex >= allSubHeadings.length - 1 ? 0 : currentGlobalIndex + 1;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContent();
    renderSidebar();
}

function navigateLast() {
    currentGlobalIndex = allSubHeadings.length - 1;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContent();
    renderSidebar();
}
// Tab switching
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
}

function checkAndHandleMajorUpdates(whatsNewEntries) {
    // Find major updates
    const majorUpdates = whatsNewEntries.filter(entry => entry.majorUpdate === true);

    if (majorUpdates.length === 0) {
        return; // No major updates
    }

    majorUpdates.forEach((majorUpdate) => {
        const trackingKey = `${currentUser}_${currentDatabase}_${majorUpdate.version}_${majorUpdate.date}_seen`;
        const hasUserSeenThisUpdate = localStorage.getItem(trackingKey);

        if (!hasUserSeenThisUpdate) {
            // This is a new major update for this user

            // Mark it as seen
            localStorage.setItem(trackingKey, 'true');

            // Force set the preference to show What's New on login
            const prefKey = `${currentUser}_${currentDatabase}_showTips`;
            localStorage.setItem(prefKey, 'true');


        }

    });
}

function getISODateOnlyToday() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`; // YYYY-MM-DD
}

function isISODate(s) {
    return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function getVisibleFromISO(item) {
    // new field
    if (isISODate(item?.visibleFrom)) return item.visibleFrom;

    // backward compatibility (if old files still have ISO in item.date)
    if (isISODate(item?.date)) return item.date;

    return null;
}

function getVisibleToISO(item) {
    if (isISODate(item?.visibleTo)) return item.visibleTo;
    return null;
}

function isVisibleNow(item) {
    const today = getISODateOnlyToday();

    const from = getVisibleFromISO(item); // can be null
    const to = getVisibleToISO(item);     // can be null

    // No visibility fields -> show (backward compatible)
    if (!from && !to) return true;

    // Only from -> visible from that date onward
    if (from && !to) return today >= from;

    // Only to -> visible until that date
    if (!from && to) return today <= to;

    // Both -> inclusive range
    return today >= from && today <= to;
}

function formatPrettyDateUpperMonth(isoDate) {
    if (!isoDate) return '';
    const dt = new Date(isoDate + 'T00:00:00');
    const day = String(dt.getDate()).padStart(2, '0');
    const month = dt.toLocaleString('en-US', { month: 'long' }).toUpperCase();
    const year = dt.getFullYear();
    return `${day} ${month} ${year}`;
}



function renderWhatsNew(updates) {
    if (typeof registerBpalReadOnlySpacing === 'function') registerBpalReadOnlySpacing();
    const listContainer = document.getElementById('whatsNewList');

    if (!listContainer) return;

    listContainer.innerHTML = '';

    const input = Array.isArray(updates) ? updates : [];

    // 1) Filter by visibility range
    const visibleUpdates = input.filter(isVisibleNow);

    // 2) Sort by visibleFrom desc
    visibleUpdates.sort((a, b) => {
        const da = getVisibleFromISO(a) || '';
        const db = getVisibleFromISO(b) || '';
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db.localeCompare(da);
    });

    if (visibleUpdates.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 20px; color: #666;">
                <p>No new updates found.</p>
            </div>`;
        return;
    }

    // Register Quill formats ONCE before rendering
    if (typeof Quill !== 'undefined') {
        const FontStyle = Quill.import('attributors/style/font');
        FontStyle.whitelist = [
            'arial', 'courier', 'georgia', 'helvetica', 'lucida',
            'tahoma', 'times', 'trebuchet', 'verdana'
        ];
        Quill.register(FontStyle, true);

        const SizeStyle = Quill.import('attributors/style/size');
        SizeStyle.whitelist = [
            '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px',
            '20px', '22px', '24px', '26px', '28px', '32px', '36px', '40px',
            '48px', '56px', '64px', '72px'
        ];
        Quill.register(SizeStyle, true);
    }

    const fontMap = {
        'lucida': "'Lucida Console', monospace",
        'times': "'Times New Roman', serif",
        'courier': "'Courier New', monospace",
        'helvetica': 'Helvetica, sans-serif',
        'arial': 'Arial, sans-serif',
        'verdana': 'Verdana, sans-serif',
        'georgia': 'Georgia, serif',
        'tahoma': 'Tahoma, sans-serif',
        'trebuchet': "'Trebuchet MS', sans-serif"
    };

    visibleUpdates.forEach((item, itemIndex) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = item.majorUpdate ? 'update-item update-major' : 'update-item';

        const fromISO = getVisibleFromISO(item);
        const dateLabel = formatPrettyDateUpperMonth(fromISO);

        itemDiv.innerHTML = `
            <div class="update-version">Version ${escapeHtml(String(item.version || 'N/A'))}</div>
            ${item.majorUpdate ? `<span class="update-major-badge">${currentLanguage === 'fr' ? 'Mise à jour majeure' : 'Major update'}</span>` : ''}
            <div class="update-date">${escapeHtml(dateLabel)}</div>
            <div class="update-title">${escapeHtml(item.title || 'Update')}</div>
        `;

        if (item.changes && Array.isArray(item.changes)) {
            const changesContainer = document.createElement('div');
            changesContainer.style.marginTop = '8px';

            item.changes.forEach((change, changeIndex) => {
                const changeText = typeof change === 'string'
                    ? change
                    : (change.text || change.description || '');

                if (changeText && changeText.trim() !== '') {
                    const changeDiv = document.createElement('div');
                    const quillId = `whatsnew-quill-${itemIndex}-${changeIndex}`;
                    changeDiv.id = quillId;
                    changeDiv.style.marginBottom = '8px';
                    changeDiv.style.padding = '8px';
                    changeDiv.style.backgroundColor = '#f9fafb';
                    changeDiv.style.borderRadius = '6px';

                    changesContainer.appendChild(changeDiv);
                }
            });

            itemDiv.appendChild(changesContainer);
        }

        // IMPORTANT: Append to DOM FIRST
        listContainer.appendChild(itemDiv);

        // THEN initialize Quill editors (element is now in DOM)
        if (item.changes && Array.isArray(item.changes)) {
            item.changes.forEach((change, changeIndex) => {
                const changeText = typeof change === 'string'
                    ? change
                    : (change.text || change.description || '');

                if (changeText && changeText.trim() !== '') {
                    const quillId = `whatsnew-quill-${itemIndex}-${changeIndex}`;

                    try {
                        // Fix font family names
                        let fixedHtml = changeText;
                        Object.keys(fontMap).forEach(shortName => {
                            const regex = new RegExp(`font-family:\\s*${shortName}\\s*;?`, 'gi');
                            fixedHtml = fixedHtml.replace(regex, `font-family: ${fontMap[shortName]};`);
                        });

                        const quill = new Quill(`#${quillId}`, {
                            theme: 'snow',
                            readOnly: true,
                            modules: { toolbar: false }
                        });

                        // innerHTML preserves ALL styles: line-height, font-size, color, etc.
                        quill.root.innerHTML = fixedHtml;

                    } catch (error) {
                        console.error('Error with What\'s New Quill:', error);
                        const changeDiv = document.getElementById(quillId);
                        if (changeDiv) {
                            changeDiv.innerHTML = changeText;
                        }
                    }
                }
            });
        }
    });
}
// Initialize the checkbox state on page load
function initializeStartupSettings() {
    const prefKey = `${currentUser}_${currentDatabase}_showTips`;
    const savedPref = localStorage.getItem(prefKey);
    const isChecked = savedPref !== 'false';

    // Update checkbox in Tips tab
    const tipsCheckbox = document.getElementById('showOnStartup');
    if (tipsCheckbox) {
        tipsCheckbox.checked = isChecked;
    }

    // Update checkbox in What's New tab
    const whatsNewCheckbox = document.getElementById('showOnStartupWhatsNew');
    if (whatsNewCheckbox) {
        whatsNewCheckbox.checked = isChecked;
    }
}


// Modified toggleStartupSetting function
function toggleStartupSetting(checkbox) {
    const prefKey = `${currentUser}_${currentDatabase}_showTips`;
    localStorage.setItem(prefKey, checkbox.checked);

    // Sync both checkboxes
    const tipsCheckbox = document.getElementById('showOnStartup');
    const whatsNewCheckbox = document.getElementById('showOnStartupWhatsNew');

    if (checkbox.id === 'showOnStartup' && whatsNewCheckbox) {
        whatsNewCheckbox.checked = checkbox.checked;
    } else if (checkbox.id === 'showOnStartupWhatsNew' && tipsCheckbox) {
        tipsCheckbox.checked = checkbox.checked;
    }

   //  console.log(`Preference saved for ${currentUser}: ${checkbox.checked}`);
}



// Chat functionality
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (message === '') return;

    const chatMessages = document.getElementById('chatMessages');

    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user-message';
    userMsg.innerHTML = `
        <div class="message-content">
            <div class="message-text">${escapeHtml(message)}</div>
            <div class="message-time">Just now</div>
        </div>
        <div class="message-avatar">You</div>
    `;
    chatMessages.appendChild(userMsg);

    input.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Try to use AI API if available
        if (window.electron && window.electron.ipcRenderer) {
            const response = await window.electron.ipcRenderer.invoke('chat-message', {
                question: message,
                user: currentUser,
                database: currentDatabase
            });

            if (response && response.success) {
                const aiMsg = document.createElement('div');
                aiMsg.className = 'message assistant-message';
                aiMsg.innerHTML = `
                    <div class="message-avatar">AI</div>
                    <div class="message-content">
                        <div class="message-text">${escapeHtml(response.answer)}</div>
                        <div class="message-time">Just now</div>
                    </div>
                `;
                chatMessages.appendChild(aiMsg);
            } else {
                throw new Error(response?.error || 'Failed to get response');
            }
        } else {
            throw new Error('Electron IPC not available');
        }
    } catch (error) {
        console.error('Chat error:', error);
        // Fallback: simulate response
        setTimeout(() => {
            const aiMsg = document.createElement('div');
            aiMsg.className = 'message assistant-message';
            aiMsg.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <div class="message-text">I'm here to help! Please check the Tips and Tricks tab for detailed guides.</div>
                    <div class="message-time">Just now</div>
                </div>
            `;
            chatMessages.appendChild(aiMsg);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 500);
    }

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}