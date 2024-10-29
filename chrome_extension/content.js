(function () {
    console.log("Content script loaded");

    let emailContent = "";
    let typingTimer;
    let emailBodyElement;

    const doneTypingInterval = 3000; // Time in ms after typing stops to trigger action
    const emailBodySelector = 'div[aria-label="Message Body"][contenteditable="true"]';

    const modalHTML = `
    <div id="formalize-modal" style="display:none; position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background-color:#ffffff; padding:30px; border-radius:20px; box-shadow:0 8px 30px rgba(0,0,0,0.2); z-index:1000; width: 360px; max-width: 90%; text-align: center; font-family: 'Segoe UI', sans-serif;">
        <h3 style="color: #333; font-weight:700; font-size:1.3em; margin-bottom: 10px;"> Elevate Your Email!🌟</h3>
        <p style="font-size: 1em; color: #555; margin-bottom: 20px; line-height: 1.5;">This email might be too casual. Improve it?</p>
        <p style="font-size: 0.9em; color: #777; margin-bottom: 18px;">Choose a tone to formalize your message:</p>
        <select id="tone-selector" style="margin-bottom: 15px; padding: 12px 18px; border: 1px solid #d3d3d3; border-radius: 10px; width: 100%; max-width: 220px; font-size: 1em; background-color: #f9f9f9;">
            <option value="polite">Polite</option>
            <option value="formal">Formal</option>
            <option value="enthusiastic">Enthusiastic</option>
        </select>
        <div style="margin-top: 25px;">
            <button id="modal-yes" style="margin-right:10px; padding:10px 20px; background-color:#00aaff; color:white; border:none; border-radius:12px; font-weight:bold; cursor: pointer; transition: all 0.3s ease;">Enhance Now</button>
            <button id="modal-no" style="padding:10px 20px; background-color:#ff5252; color:white; border:none; border-radius:12px; font-weight:bold; cursor: pointer; transition: all 0.3s ease;">Maybe Later</button>
        </div>
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
        clearTimeout(typingTimer);
        typingTimer = setTimeout(doneTyping, doneTypingInterval);
    }

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
        if (chrome.runtime && chrome.runtime.id) {
            chrome.runtime.sendMessage({ 
                action: 'checkEmail', 
                content: emailContent 
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Runtime error:", chrome.runtime.lastError.message);
                    return;
                }

                if (response && response.shouldImprove && emailBodyElement) {
                    if (!document.getElementById('suggestion-icon')) {
                        const suggestionIcon = document.createElement('span');
                        suggestionIcon.id = 'suggestion-icon'; 
                        suggestionIcon.innerHTML = '✍️'; 
                        suggestionIcon.title = 'Click to enhance your email';
                        suggestionIcon.style.cursor = 'pointer';
                        suggestionIcon.style.fontSize = '1.8em'; 
                        suggestionIcon.style.marginLeft = '10px';
                        suggestionIcon.style.color = '#ff8c00'; 
                        suggestionIcon.style.textShadow = '2px 2px 5px rgba(0, 0, 0, 0.3)'; 
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
        if (message.action === 'replaceEmailContent' && message.body) {
            const emailBody = document.querySelector(emailBodySelector);
            if (emailBody) {
                const emailWithoutSubject = removeSubject(message.body);
                emailBody.innerText = emailWithoutSubject;
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
