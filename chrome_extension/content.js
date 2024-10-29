(function () {
    console.log("Content script loaded");

    // Variables for managing email content, typing timer, and modal
    let emailContent = "";
    let typingTimer;
    let emailBodyElement;

    const doneTypingInterval = 3000; // Time in ms after typing stops to trigger action
    const emailBodySelector = 'div[aria-label="Message Body"][contenteditable="true"]';

    // Modal HTML for asking to formalize the email
    const modalHTML = `
   <div id="formalize-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background-color:white; padding:20px; border-radius:10px; box-shadow:0 0 15px rgba(0,0,0,0.3); z-index:1000; width: 300px; max-width: 90%; text-align: center;">
       <h3>Would you like to formalize your email?</h3>
       <select id="tone-selector" style="margin-bottom: 10px;">
           <option value="polite">Polite</option>
           <option value="formal">Formal</option>
           <option value="enthusiastic">Enthusiastic</option>
       </select>
       <button id="modal-yes" style="margin-right:10px; padding:5px 10px; background-color:#28a745; color:white; border:none; border-radius:5px;">Yes</button>
       <button id="modal-no" style="padding:5px 10px; background-color:#dc3545; color:white; border:none; border-radius:5px;">No</button>
   </div>
   <div id="modal-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.5); z-index:999;"></div>
`;

    // Append modal HTML to the document body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const modal = document.getElementById('formalize-modal');
    const overlay = document.getElementById('modal-overlay');
    const modalYesButton = document.getElementById('modal-yes');
    const modalNoButton = document.getElementById('modal-no');

    // Show and hide modal functions
    function showModal() {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        
    }
    function hideModal() {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }

    // Modal button event listeners
    modalYesButton.addEventListener('click', () => {
        const tone = document.getElementById('tone-selector').value;
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({ action: 'improveEmail', content: emailContent, tone });
            hideModal();
        } else {
            console.error("Extension context invalidated on modal confirmation.");
        }
    });

    modalNoButton.addEventListener('click', hideModal);

    // Process email body changes and trigger doneTyping after inactivity
    function handleEmailBodyChange(emailBody) {
        console.log("Email body found:", emailBody);
        emailContent = emailBody.innerText;
        console.log("Captured email content:", emailContent);
        clearTimeout(typingTimer);
        typingTimer = setTimeout(doneTyping, doneTypingInterval);
    }

    // Mutation observer to monitor for email body content and add listeners
    // Define emailBodyElement globally

// Mutation observer to monitor for email body content and add listeners
const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
            emailBodyElement = document.querySelector(emailBodySelector);
            if (emailBodyElement && !emailBodyElement.dataset.listenerAdded) {
                emailBodyElement.addEventListener('input', () => handleEmailBodyChange(emailBodyElement));
                emailBodyElement.dataset.listenerAdded = true;
                console.log("Input event listener added to email body.");
                observer.disconnect();
            }
        }
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// Fallback mechanism: Check email body element every second
const checkEmailBodyInterval = setInterval(() => {
    emailBodyElement = document.querySelector(emailBodySelector);
    if (emailBodyElement && !emailBodyElement.dataset.listenerAdded) {
        emailBodyElement.addEventListener('input', () => handleEmailBodyChange(emailBodyElement));
        emailBodyElement.dataset.listenerAdded = true;
        console.log("Input event listener added to email body.");
    }
}, 1000);

// Function to handle actions when user stops typing
function doneTyping() {
    console.log("doneTyping called");
    if (chrome.runtime && chrome.runtime.id) {
        console.log("User stopped typing. Email content:", emailContent);
        chrome.runtime.sendMessage({ 
            action: 'checkEmail', 
            content: emailContent 
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Runtime error:", chrome.runtime.lastError.message);
                return;
            }

            // Check if improvement is suggested and emailBodyElement exists
            if (response && response.shouldImprove && emailBodyElement) {
                // Check if the suggestion icon already exists to avoid duplicates
                if (!document.getElementById('suggestion-icon')) {
                    // Create the suggestion icon
                    const suggestionIcon = document.createElement('span');
                    suggestionIcon.id = 'suggestion-icon'; // Unique ID to check for duplicates
                    suggestionIcon.innerHTML = '📝';
                    suggestionIcon.title = 'Improve your email';
                    suggestionIcon.style.cursor = 'pointer';
                    suggestionIcon.onclick = showModal;
                    emailBodyElement.appendChild(suggestionIcon);
                }
            } else if (!emailBodyElement) {
                console.error("Email body element not found.");
            }
        });
    } else {
        console.error("Extension context invalidated.");
    }
}



    // Helper function to remove the subject line from email content
    function removeSubject(emailContent) {
        return emailContent.split('\n').filter(line => !line.startsWith('Subject:')).join('\n');
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        console.log("Received message:", message);
        if (message.action === 'replaceEmailContent' && message.body) {
            const emailBody = document.querySelector(emailBodySelector);
            if (emailBody) {
                const emailWithoutSubject = removeSubject(message.body);
                console.log("Replacing email body with:", emailWithoutSubject);
                emailBody.innerText = emailWithoutSubject;
                console.log("Email content has been improved and replaced without the subject.");
                sendResponse({ status: 'success' });
            } else {
                console.error("Email body element not found.");
            }
        }
    });
    

    // Clear intervals and timers on page unload
    window.addEventListener('beforeunload', () => {
        clearTimeout(typingTimer);
        clearInterval(checkEmailBodyInterval);
        console.log("Cleanup done.");
    });
})();
