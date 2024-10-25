
// Automatically trigger when the popup is opened
window.addEventListener('load', async () => {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            // Inject content.js if not already injected
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['chrome_extension/content.js']
            });

            // No need to send messages here, as content.js handles everything in real-time
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').innerText = 'An error occurred.';
    }
});