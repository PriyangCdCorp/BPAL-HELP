/**
 * CLIENT-SIDE QUILL INTEGRATION
 * Display admin-created JSON content using Quill in read-only mode
 * This ensures the client sees exactly what the admin created
 */

// Store Quill instances for each step
const clientQuillInstances = {};


/**
 * Register Quill inline formats to match admin configuration
 * Must be called before creating any Quill instances
 */
function registerClientFormats() {
    if (typeof Quill === 'undefined') return false;

    // Register Font Family with INLINE STYLES (match admin)
    const FontStyle = Quill.import('attributors/style/font');
    FontStyle.whitelist = [
        'arial', 'courier', 'georgia', 'helvetica', 'lucida', 
        'tahoma', 'times', 'trebuchet', 'verdana'
    ];
    Quill.register(FontStyle, true);

    // Register Font Size with INLINE STYLES
    const SizeStyle = Quill.import('attributors/style/size');
    SizeStyle.whitelist = [
        '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', 
        '20px', '22px', '24px', '26px', '28px', '32px', '36px', '40px', 
        '48px', '56px', '64px', '72px'
    ];
    Quill.register(SizeStyle, true);

    console.log('Client Quill inline formats registered');
    return true;
}

/**
 * DEBUG VERSION - Initialize Quill for displaying step content
 */
function registerBpalReadOnlySpacing() {
    if (typeof Quill === 'undefined') return;
    const Parchment = Quill.import('parchment');
    for (const [format, cssProperty] of [
        ['lineheight', 'line-height'],
        ['spacebefore', 'margin-top'],
        ['spaceafter', 'margin-bottom']
    ]) {
        Quill.register(new Parchment.Attributor.Style(format, cssProperty, {
            scope: Parchment.Scope.BLOCK
        }), true);
    }
}

function initializeReadOnlyQuill(containerId, htmlContent, stepIndex = 0) {
    registerBpalReadOnlySpacing();
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('DEBUG: Container not found:', containerId);
        return null;
    }

    console.log('=== DEBUG: initializeReadOnlyQuill ===');
    console.log('Container ID:', containerId);
    console.log('Original HTML:', htmlContent);
    console.log('Quill loaded?', typeof Quill !== 'undefined');

    // Register formats first
    if (typeof Quill !== 'undefined') {
        console.log('DEBUG: Registering inline formats...');
        
        const FontStyle = Quill.import('attributors/style/font');
        console.log('DEBUG: FontStyle whitelist BEFORE:', FontStyle.whitelist);
        
        FontStyle.whitelist = [
            'arial', 'courier', 'georgia', 'helvetica', 'lucida', 
            'tahoma', 'times', 'trebuchet', 'verdana'
        ];
        Quill.register(FontStyle, true);
        console.log('DEBUG: FontStyle whitelist AFTER:', FontStyle.whitelist);

        const SizeStyle = Quill.import('attributors/style/size');
        SizeStyle.whitelist = [
            '8px', '9px', '10px', '11px', '12px', '14px', '16px', '18px', 
            '20px', '22px', '24px', '26px', '28px', '32px', '36px', '40px', 
            '48px', '56px', '64px', '72px'
        ];
        Quill.register(SizeStyle, true);
        console.log('DEBUG: SizeStyle registered');
    }

    // Fix font family names
    const fixedHtml = fixFontFamilyNames(htmlContent);
    console.log('DEBUG: Fixed HTML:', fixedHtml);

    try {
        console.log('DEBUG: Creating Quill instance...');
        const quill = new Quill(`#${containerId}`, {
            theme: 'snow',
            readOnly: true,
            modules: {
                toolbar: false
            }
        });
        console.log('DEBUG: Quill created successfully');

        // Load the fixed HTML content
        if (fixedHtml && fixedHtml.trim() !== '') {
            console.log('DEBUG: Pasting HTML...');
            quill.clipboard.dangerouslyPasteHTML(fixedHtml);
            console.log('DEBUG: HTML pasted');
            
            // Check what Quill actually rendered
            console.log('DEBUG: Quill root innerHTML after paste:', quill.root.innerHTML);
            
            // Check computed styles
            const firstSpan = quill.root.querySelector('span');
            if (firstSpan) {
                const computedStyle = window.getComputedStyle(firstSpan);
                console.log('DEBUG: First span computed font-family:', computedStyle.fontFamily);
                console.log('DEBUG: First span style attribute:', firstSpan.getAttribute('style'));
            }
        }

        if (stepIndex >= 0) {
            clientQuillInstances[stepIndex] = quill;
        }

        return quill;

    } catch (error) {
        console.error('DEBUG: Error initializing Quill:', error);
        container.innerHTML = fixedHtml;
        return null;
    }
}

/**
 * Fix font family names to valid CSS values
 */
function fixFontFamilyNames(html) {
    if (!html) return '';
    
    console.log('=== DEBUG: fixFontFamilyNames ===');
    console.log('Input HTML:', html);
    
    const fontMap = {
        'lucida': '"Lucida Console", monospace',
        'times': '"Times New Roman", serif',
        'courier': '"Courier New", monospace',
        'helvetica': 'Helvetica, sans-serif',
        'arial': 'Arial, sans-serif',
        'verdana': 'Verdana, sans-serif',
        'georgia': 'Georgia, serif',
        'tahoma': 'Tahoma, sans-serif',
        'trebuchet': '"Trebuchet MS", sans-serif'
    };
    
    let fixed = html;
    Object.keys(fontMap).forEach(shortName => {
        const regex = new RegExp(`font-family:\\s*${shortName}\\s*;?`, 'gi');
        const matches = fixed.match(regex);
        if (matches) {
            console.log(`DEBUG: Found "${shortName}" matches:`, matches);
        }
        fixed = fixed.replace(regex, `font-family: ${fontMap[shortName]};`);
    });
    
    console.log('DEBUG: Output HTML:', fixed);
    return fixed;
}

/**
 * Display a single step with image and Quill content
 * @param {Object} step - The step object from JSON { text, imagePath }
 * @param {number} stepIndex - The step number
 * @param {string} containerSelector - CSS selector for content area
 */
function displayStep(step, stepIndex, containerSelector = '.content-body') {
    const container = document.querySelector(containerSelector);
    
    if (!container) {
        console.error('Content container not found');
        return;
    }

    // Create step wrapper
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

    // Add Quill editor for text content
    if (step.text && step.text.trim() !== '') {
        const editorDiv = document.createElement('div');
        const editorId = `quill-editor-${stepIndex}`;
        editorDiv.id = editorId;
        editorDiv.className = 'text-area';
        stepDiv.appendChild(editorDiv);

        // Initialize Quill after DOM insertion
        setTimeout(() => {
            initializeReadOnlyQuill(editorId, step.text, stepIndex);
        }, 0);
    }

    container.appendChild(stepDiv);
}

/**
 * Display all steps from a subheading
 * @param {Object} subHeading - The subheading with steps array
 * @param {string} containerSelector - CSS selector for content area
 */
function displayAllSteps(subHeading, containerSelector = '.content-body') {
    const container = document.querySelector(containerSelector);
    
    if (!container) {
        console.error('Content container not found');
        return;
    }

    // Clear existing content
    container.innerHTML = '';

    // Add title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'content-header';
    titleDiv.innerHTML = `<h1 class="content-title">${escapeHtml(subHeading.title || 'Untitled')}</h1>`;
    container.parentElement.insertBefore(titleDiv, container);

    // Display each step with Quill
    if (subHeading.steps && Array.isArray(subHeading.steps)) {
        subHeading.steps.forEach((step, index) => {
            displayStep(step, index, containerSelector);
        });
    } else {
        container.innerHTML = '<div class="empty-state"><p>No steps available</p></div>';
    }
}

/**
 * Update the renderContent function to use Quill
 * REPLACE your existing renderContent() function with this
 */
function renderContentWithQuill() {
    const contentArea = document.getElementById('contentArea');

    if (!data.mainHeadings[currentMainHeadingIndex] ||
        !data.mainHeadings[currentMainHeadingIndex].subHeadings[currentSubHeadingIndex]) {
        contentArea.innerHTML = `<div class="empty-state"><h2>Content Not Found</h2></div>`;
        return;
    }

    const mainHeading = data.mainHeadings[currentMainHeadingIndex];
    const subHeading = mainHeading.subHeadings[currentSubHeadingIndex];

    // Clear previous Quill instances
    Object.keys(clientQuillInstances).forEach(key => {
        delete clientQuillInstances[key];
    });

    // Use Quill-based display
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'content-header';
    header.innerHTML = `<h1 class="content-title">${escapeHtml(subHeading.title)}</h1>`;
    contentWrapper.appendChild(header);

    // Create body
    const body = document.createElement('div');
    body.className = 'content-body';
    contentWrapper.appendChild(body);

    // Add footer with controls
    const footer = document.createElement('div');
    footer.className = 'navigation-footer';
    
    const prefKey = `${currentUser}_${currentDatabase}_showTips`;
    const savedPref = localStorage.getItem(prefKey);
    const isCheckedAttribute = savedPref !== 'false' ? 'checked' : '';

    footer.innerHTML = `
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
    `;
    contentWrapper.appendChild(footer);

    contentArea.innerHTML = '';
    contentArea.appendChild(contentWrapper);

    // Initialize Quill editors after DOM insertion
    setTimeout(() => {
        if (subHeading.steps && Array.isArray(subHeading.steps)) {
            subHeading.steps.forEach((step, stepIndex) => {
                displayStep(step, stepIndex, '.content-body');
            });
        } else {
            body.innerHTML = '<div class="empty-state"><h2>No steps available</h2></div>';
        }
    }, 0);
}

/**
 * Display What's New using Quill for rich text
 * @param {Array} updates - Array of update objects from JSON
 */
function renderWhatsNewWithQuill(updates) {
    const listContainer = document.getElementById('whatsNewList');

    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (!updates || updates.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: 20px; color: #666;">
                <p>No new updates found.</p>
            </div>`;
        return;
    }

    updates.forEach((item, itemIndex) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'update-item';

        // Version badge
        const versionBadge = document.createElement('div');
        versionBadge.className = 'update-version';
        versionBadge.textContent = `Version ${item.version || 'N/A'}`;
        itemDiv.appendChild(versionBadge);

        // Date
        const dateDiv = document.createElement('div');
        dateDiv.className = 'update-date';
        dateDiv.textContent = item.date || '';
        itemDiv.appendChild(dateDiv);

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'update-title';
        titleDiv.textContent = item.title || 'Update';
        itemDiv.appendChild(titleDiv);

        // Changes with Quill
        if (item.changes && Array.isArray(item.changes)) {
            item.changes.forEach((change, changeIndex) => {
                const changeText = typeof change === 'string' ? change : (change.text || change.description || JSON.stringify(change));
                
                if (changeText && changeText.trim() !== '') {
                    const changeDiv = document.createElement('div');
                    const quillId = `whatsnew-quill-${itemIndex}-${changeIndex}`;
                    changeDiv.id = quillId;
                    changeDiv.className = 'update-change-content';
                    changeDiv.style.marginBottom = '12px';
                    changeDiv.style.padding = '8px';
                    changeDiv.style.backgroundColor = '#f9fafb';
                    changeDiv.style.borderRadius = '6px';
                    
                    itemDiv.appendChild(changeDiv);

                    // Initialize Quill for this change after DOM insertion
                    setTimeout(() => {
                        initializeReadOnlyQuill(quillId, changeText, `whatsnew-${itemIndex}-${changeIndex}`);
                    }, 0);
                }
            });
        }

        listContainer.appendChild(itemDiv);
    });
}

/**
 * Cleanup: Destroy all Quill instances when switching views
 */
function destroyAllClientQuills() {
    Object.keys(clientQuillInstances).forEach(key => {
        const quill = clientQuillInstances[key];
        if (quill) {
            try {
                quill.off('text-change');
                quill.off('selection-change');
            } catch (e) {
                // Instance may already be destroyed
            }
        }
    });
    clientQuillInstances = {};
}

/**
 * Modified switchTab to clean up Quill instances
 * REPLACE your existing switchTab() function with this
 */
function switchTabWithQuillCleanup(tabId) {
    // Cleanup old instances
    destroyAllClientQuills();

    // Switch tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    const targetTab = document.getElementById(tabId);
    const targetButton = document.querySelector(`[data-tab="${tabId}"]`);

    if (targetTab) targetTab.classList.add('active');
    if (targetButton) targetButton.classList.add('active');

    // Re-render with Quill if it's the tips tab
    if (tabId === 'tipsTab') {
        renderContentWithQuill();
    } else if (tabId === 'whatsnewTab') {
        // What's New Quill rendering already handled in renderWhatsNewWithQuill
    }
}

/**
 * Modified selectSubHeading to use Quill
 * REPLACE your existing selectSubHeading() function with this
 */
function selectSubHeadingWithQuill(mainIndex, subIndex) {
    // Cleanup old instances
    destroyAllClientQuills();

    currentMainHeadingIndex = mainIndex;
    currentSubHeadingIndex = subIndex;

    expandedSections.clear();
    expandedSections.add(mainIndex);

    currentGlobalIndex = allSubHeadings.findIndex(
        item => item.mainIndex === mainIndex && item.subIndex === subIndex
    );

    renderContentWithQuill();
    renderSidebar();
}

/**
 * Modified navigation functions to use Quill
 * Replace your navigation functions with these
 */
function navigateFirstWithQuill() {
    destroyAllClientQuills();
    currentGlobalIndex = 0;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContentWithQuill();
    renderSidebar();
}

function navigatePreviousWithQuill() {
    destroyAllClientQuills();
    currentGlobalIndex = currentGlobalIndex <= 0 ? allSubHeadings.length - 1 : currentGlobalIndex - 1;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContentWithQuill();
    renderSidebar();
}

function navigateNextWithQuill() {
    destroyAllClientQuills();
    currentGlobalIndex = currentGlobalIndex >= allSubHeadings.length - 1 ? 0 : currentGlobalIndex + 1;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContentWithQuill();
    renderSidebar();
}

function navigateLastWithQuill() {
    destroyAllClientQuills();
    currentGlobalIndex = allSubHeadings.length - 1;
    const item = allSubHeadings[currentGlobalIndex];
    currentMainHeadingIndex = item.mainIndex;
    currentSubHeadingIndex = item.subIndex;
    expandedSections.clear();
    expandedSections.add(item.mainIndex);
    renderContentWithQuill();
    renderSidebar();
}

/**
 * Add Quill CSS to page (if not already included)
 */
function loadQuillStyles() {
    // Check if Quill styles already loaded
    if (document.querySelector('link[href*="quill"]')) {
        return;
    }

    // Load Quill styles
    const quillLink = document.createElement('link');
    quillLink.href = '../CSS/quill.css';
    quillLink.rel = 'stylesheet';
    document.head.appendChild(quillLink);
}

/**
 * Load Quill library (if not already loaded)
 */
function loadQuillLibrary() {
    return new Promise((resolve) => {
        if (typeof Quill !== 'undefined') {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = './quill-main.js';
        script.onload = resolve;
        script.onerror = () => {
            console.error('Failed to load Quill library');
            resolve();
        };
        document.head.appendChild(script);
    });
}

/**
 * Initialize Quill on document load
 */
async function initializeClientQuill() {
    // Load CSS
    loadQuillStyles();

    // Load JS
    await loadQuillLibrary();

    
}

// Add custom CSS for read-only Quill editors
const quillReadOnlyStyles = `
/* Read-only Quill styles */
.ql-container.ql-disabled {
    background-color: transparent;
}

.ql-snow.ql-disabled .ql-toolbar {
    display: none;
}

.ql-editor {
    font-size: 14px;
    line-height: 1.6;
    padding: 0px;
}

.ql-editor.ql-blank::before {
    color: transparent;
    font-style: normal;
}

/* Ensure lists render properly */
.ql-editor ul,
.ql-editor ol {
    padding-left: 20px;
    margin: 8px 0;
}

.ql-editor li {
    margin-bottom: 4px;
}

/* Ensure code blocks are visible */
.ql-editor code {
    background: #f3f4f6;
    padding: 2px 6px;
    border-radius: 3px;
}

.ql-editor pre {
    background: #1f2937;
    color: #e5e7eb;
    padding: 10px;
    border-radius: 6px;
    margin: 8px 0;
    overflow-x: auto;
}

.ql-editor pre code {
    background: none;
    color: inherit;
    padding: 0;
}

/* Images */
.ql-editor img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
}
    

`;

// Inject custom styles
function injectQuillStyles() {
    const style = document.createElement('style');
    style.textContent = quillReadOnlyStyles;
    document.head.appendChild(style);
}

/**
 * Main initialization - call this when page loads
 */
function setupClientQuill() {
    loadQuillStyles();
    injectQuillStyles();
    loadQuillLibrary().then(() => {
        console.log('Client-side Quill ready');
    });
}

// Auto-initialize on script load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupClientQuill);
} else {
    setupClientQuill();
}