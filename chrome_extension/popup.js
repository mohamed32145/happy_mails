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
            
            // Display a brief message in the popup to inform the user
            document.getElementById('status').innerText = 'Email Assistant is active. Check your email for suggestions.';
        }
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('status').innerText = 'An error occurred. Please try again.';
    }
});