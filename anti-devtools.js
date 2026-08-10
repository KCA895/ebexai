// Anti-DevTools Script
// WARNING: Ini hanya mempersulit, TIDAK 100% mencegah!

(function() {
    'use strict';

    // 1. Detect F12 & Right Click
    document.addEventListener('keydown', function(e) {
        // F12
        if (e.key === 'F12' || e.keyCode === 123) {
            e.preventDefault();
            showWarning();
            return false;
        }

        // Ctrl+Shift+I (Chrome DevTools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
            e.preventDefault();
            showWarning();
            return false;
        }

        // Ctrl+Shift+J (Chrome Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
            e.preventDefault();
            showWarning();
            return false;
        }

        // Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'u') {
            e.preventDefault();
            showWarning();
            return false;
        }

        // Cmd+Option+I (Mac DevTools)
        if (e.metaKey && e.altKey && e.key === 'i') {
            e.preventDefault();
            showWarning();
            return false;
        }
    });

    // 2. Disable Right Click
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        showWarning();
        return false;
    });

    // 3. Detect DevTools Open (Size Detection)
    const threshold = 160;
    let devtoolsOpen = false;

    setInterval(function() {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;

        if (widthThreshold || heightThreshold) {
            if (!devtoolsOpen) {
                devtoolsOpen = true;
                handleDevToolsOpen();
            }
        } else {
            devtoolsOpen = false;
        }
    }, 1000);

    // 4. Detect Console Debug
    const element = new Image();
    Object.defineProperty(element, 'id', {
        get: function() {
            handleDevToolsOpen();
            throw new Error('DevTools detected');
        }
    });

    setInterval(function() {
        console.log('%c', element);
    }, 1000);

    // 5. Clear Console
    setInterval(function() {
        console.clear();
    }, 100);

    // 6. Disable Select Text
    document.addEventListener('selectstart', function(e) {
        e.preventDefault();
        return false;
    });

    // Warning Message
    function showWarning() {
        alert('⚠️ Developer tools are disabled for security reasons.');
    }

    // DevTools Open Handler
    function handleDevToolsOpen() {
        // Option 1: Just warning
        console.log('%c⚠️ STOP!', 'color: red; font-size: 50px; font-weight: bold;');
        console.log('%cThis is a browser feature intended for developers.', 'font-size: 20px;');
        console.log('%cIf someone told you to copy/paste something here, it is a scam.', 'font-size: 16px;');

        // Option 2: Redirect (uncomment if needed)
        // window.location.href = 'about:blank';

        // Option 3: Blur page (uncomment if needed)
        // document.body.style.filter = 'blur(10px)';
    }

    // Protect against tampering
    Object.freeze(console);
})();
