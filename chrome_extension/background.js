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
      if (message.action === 'improveEmail') {
        fetch('https://happy-mails.onrender.com/improve_email/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email_text: message.content }),
        })
        .then(response => response.json())
        .then(data => {
            if (data.improved_content) {
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: 'replaceEmailContent',
                    body: data.improved_content,
                });
                sendResponse({ success: true });
            } else {
                sendResponse({ success: false, error: 'Failed to improve email content' });
            }
        })
        .catch(error => {
            console.error('Error improving email content:', error);
            sendResponse({ success: false, error: 'Failed to improve email content' });
        });
    
        return true; // Required to use sendResponse asynchronously
    }
    
  } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error });
  }
});
