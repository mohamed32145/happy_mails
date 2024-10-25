chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (message.action === 'checkEmail') {
      fetch('https://happy-mails.onrender.com/process_email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_text: message.content }),
      })
      .then(response => response.json())
      .then(data => {
        sendResponse({ shouldImprove: data.improve });
      })
      .catch(error => {
        console.error('Error checking email content:', error);
        sendResponse({ shouldImprove: false });
      });

      return true; // Keep the channel open for async response
    } 
    else if (message.action === 'improveEmail') {
      // Improve the email content using your FastAPI backend
      fetch('https://happy-mails.onrender.com/improve_email/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email_text: message.content }),
      })
      .then(response => response.json())
      .then(data => {
        chrome.tabs.sendMessage(sender.tab.id, {
          action: 'replaceEmailContent',
          body: data.improved_content,
        });
        sendResponse({ success: true });
      })
      .catch(error => {
        console.error('Error improving email content:', error);
        sendResponse({ success: false, error });
      });

      return true; // Keep the channel open for async response
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ success: false, error });
  }
});
