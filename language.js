// language.js
function toggleLanguage() {
    let currentLang = localStorage.getItem('site_lang') || 'en';
    let newLang = currentLang === 'en' ? 'hi' : 'en';
    applyLanguage(newLang);
}

function applyLanguage(lang) {
    function translateNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.nodeValue.trim();
            if (text.length > 0) {
                // Initialize original text if not saved
                if (typeof node.originalText === 'undefined') {
                    node.originalText = node.nodeValue;
                    node.originalNormalized = text.replace(/\s+/g, ' ');
                }
                
                if (lang === 'hi' && translations[node.originalNormalized]) {
                    // Extract leading and trailing whitespace to preserve formatting
                    let leadingSpaceMatch = node.originalText.match(/^\s*/);
                    let trailingSpaceMatch = node.originalText.match(/\s*$/);
                    let leadingSpace = leadingSpaceMatch ? leadingSpaceMatch[0] : '';
                    let trailingSpace = trailingSpaceMatch ? trailingSpaceMatch[0] : '';
                    
                    node.nodeValue = leadingSpace + translations[node.originalNormalized] + trailingSpace;
                } else if (lang === 'en' && typeof node.originalText !== 'undefined') {
                    node.nodeValue = node.originalText;
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
            node.childNodes.forEach(child => translateNode(child));
        }
    }

    // Traverse the body
    translateNode(document.body);

    // Update switcher buttons
    document.querySelectorAll('.lang-switcher-btn').forEach(btn => {
        btn.textContent = lang === 'en' ? 'HI' : 'EN';
    });
    
    // Switch the font-family on body if Hindi to ensure perfect rendering
    if (lang === 'hi') {
        document.body.style.fontFamily = "'Outfit', 'Noto Sans Devanagari', sans-serif";
    } else {
        document.body.style.fontFamily = "'Outfit', sans-serif";
    }

    localStorage.setItem('site_lang', lang);
    document.documentElement.lang = lang;
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', () => {
    let savedLang = localStorage.getItem('site_lang');
    if (!savedLang) {
        let userLang = navigator.language || navigator.userLanguage;
        savedLang = userLang.startsWith('hi') ? 'hi' : 'en';
    }
    applyLanguage(savedLang);
});
