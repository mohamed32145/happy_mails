(function() {
    console.log("Content script loaded");

    let emailContent = "";
    let typingTimer;
    const doneTypingInterval = 5000; // 5 seconds after the user stops typing
    const emailBodySelector = 'div[aria-label="Message Body"][contenteditable="true"]'; // Selector for the email body

    // Modal HTML to ask for formalization
    const modalHTML = `
        <div id="formalize-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background-color:white; padding:20px; border-radius:10px; box-shadow:0 0 15px rgba(0,0,0,0.3); z-index:1000;">
            <h3>Would you like to formalize your email?</h3>
            <button id="modal-yes" style="margin-right:10px; padding:5px 10px; background-color:#28a745; color:white; border:none; border-radius:5px;">Yes</button>
            <button id="modal-no" style="padding:5px 10px; background-color:#dc3545; color:white; border:none; border-radius:5px;">No</button>
        </div>
        <div id="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:999;"></div>
    `;

    // Insert the modal into the document body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const modal = document.getElementById('formalize-modal');
    const overlay = document.getElementById('modal-overlay');
    const modalYesButton = document.getElementById('modal-yes');
    const modalNoButton = document.getElementById('modal-no');

    // Function to show the modal
    function showModal() {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    }

    // Function to hide the modal
    function hideModal() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    // Event listeners for modal buttons
    modalYesButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({ 
            action: 'improveEmail', 
            content: emailContent 
        });
        hideModal();
    });

    modalNoButton.addEventListener('click', () => {
        hideModal();
    });

    // Function to handle email body change
    function handleEmailBodyChange(emailBody) {
        console.log("Email body found:", emailBody);
        
        // Capture email content when user types
        emailContent = emailBody.innerText; // Capture email content
        console.log("Captured email content:", emailContent);
        
        // Clear the typing timer and reset it
        clearTimeout(typingTimer);
        typingTimer = setTimeout(doneTyping, doneTypingInterval); // Trigger after user stops typing
    }

    // Mutation observer setup
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                const emailBodyElement = document.querySelector(emailBodySelector);
                if (emailBodyElement) {
                    // Check if the event listener is already added
                    if (!emailBodyElement.dataset.listenerAdded) {
                        emailBodyElement.addEventListener('input', (event) => {
                            console.log("Input event detected");
                            handleEmailBodyChange(emailBodyElement); // Handle email body change
                        });
                        emailBodyElement.dataset.listenerAdded = true; // Mark that the listener was added
                        console.log("Input event listener added to email body.");
                    }
                    // Stop observing once emailBody is found
                    observer.disconnect();
                }
            }
        }
    });

    // Start observing the document for changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback mechanism: Check for the email body element every second
    const checkEmailBodyInterval = setInterval(() => {
        const emailBodyElement = document.querySelector(emailBodySelector);
        if (emailBodyElement) {
            if (!emailBodyElement.dataset.listenerAdded) {
                emailBodyElement.addEventListener('input', (event) => {
                    console.log("Input event detected");
                    handleEmailBodyChange(emailBodyElement); // Handle email body change
                });
                emailBodyElement.dataset.listenerAdded = true; // Mark that the listener was added
                console.log("Input event listener added to email body.");
            }
        }
    }, 1000);

    function doneTyping() {
        console.log("User stopped typing. Email content:", emailContent);
        // Send email content to the background script for checking
        chrome.runtime.sendMessage({ 
            action: 'checkEmail', 
            content: emailContent 
        }, (response) => {
            if (response.shouldImprove) {
                // If email needs improvement, show modal instead of confirm dialog
                showModal();
            }
        });
    }




// Helper function to remove the subject from the email content
function removeSubject(emailContent) {
    // Split the email content into lines
    const lines = emailContent.split('\n');
    
    // Find the line starting with 'Subject:' and remove it
    const filteredLines = lines.filter(line => !line.startsWith('Subject:'));

    // Join the remaining lines back into the email
    const emailWithoutSubject = filteredLines.join('\n');

    return emailWithoutSubject;
}


  
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (chrome.runtime?.id) {  // Check if the extension context is still valid
        if (message.action === 'replaceEmailContent' && message.body) {
            const emailBody = document.querySelector(emailBodySelector);
            if (emailBody) {
                const emailWithoutSubject = removeSubject(message.body);
                emailBody.innerText = emailWithoutSubject;
                console.log("Email content has been improved and replaced without the subject.");
                sendResponse({ status: 'success' });
            }
        }
    } else {
        console.error("Extension context is invalidated.");
    }
});


    // Clear the typing timer when the page is about to unload
    window.addEventListener('beforeunload', () => {
        clearTimeout(typingTimer);
        clearInterval(checkEmailBodyInterval); // Clear the interval
    });
})();
