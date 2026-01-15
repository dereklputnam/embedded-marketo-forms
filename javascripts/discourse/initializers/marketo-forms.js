import { withPluginApi } from "discourse/lib/plugin-api";

function initializeMarketoForms(api) {
  const MARKETO_BASE_URL = "//lp.netwrix.com";
  const MARKETO_MUNCHKIN_ID = "130-MAN-089";

  api.decorateCooked(
    ($elem) => {
      if (!$elem || !$elem[0]) return;

      // Find all marketo-form elements
      const marketoFormElements = $elem[0].querySelectorAll('.marketo-form');

      if (marketoFormElements.length === 0) return;

      // Wait for MktoForms2 to be available
      const initForms = (attempts = 0) => {
        if (typeof window.MktoForms2 !== 'undefined') {
          marketoFormElements.forEach(element => {
            const formId = parseInt(element.dataset.formId);
            const isLightbox = element.dataset.lightbox === 'true';
            const containerId = element.id;

            if (!formId || element.dataset.marketoLoaded === 'true') return;

            // Create form container if it doesn't exist
            if (!element.querySelector('form')) {
              const formElement = document.createElement('form');
              formElement.id = `mktoForm_${formId}`;
              element.appendChild(formElement);
            }

            // Load the form
            if (isLightbox) {
              window.MktoForms2.loadForm(
                MARKETO_BASE_URL,
                MARKETO_MUNCHKIN_ID,
                formId,
                function(form) {
                  // Create a button to trigger the lightbox
                  const button = document.createElement('button');
                  button.textContent = element.dataset.buttonText || 'Open Form';
                  button.className = 'btn btn-primary marketo-lightbox-trigger';
                  button.onclick = function(e) {
                    e.preventDefault();
                    window.MktoForms2.lightbox(form).show();
                  };

                  // Clear the container and add the button
                  element.innerHTML = '';
                  element.appendChild(button);
                  element.dataset.marketoLoaded = 'true';
                }
              );
            } else {
              window.MktoForms2.loadForm(
                MARKETO_BASE_URL,
                MARKETO_MUNCHKIN_ID,
                formId
              );
              element.dataset.marketoLoaded = 'true';
            }
          });
        } else if (attempts < 50) {
          // Retry up to 50 times (5 seconds total)
          setTimeout(() => initForms(attempts + 1), 100);
        } else {
          console.error('Marketo Forms 2.0 library failed to load');
          marketoFormElements.forEach(element => {
            element.innerHTML = '<p class="error">Error: Marketo Forms library failed to load</p>';
          });
        }
      };

      initForms();
    },
    { id: "marketo-forms-init" }
  );

  // Add BBCode-style tag support [marketo-form id=1309]
  api.addTagDecorateCallback(($elem) => {
    if (!$elem || !$elem[0]) return;

    const text = $elem[0].textContent || '';

    // Match [marketo-form id=1309] or [marketo-form id=1309 lightbox=true button="Click Here"]
    const regex = /\[marketo-form\s+id=(\d+)(?:\s+lightbox=(true|false))?(?:\s+button="([^"]*)")?\]/g;

    let match;
    while ((match = regex.exec(text)) !== null) {
      const formId = match[1];
      const lightbox = match[2] === 'true';
      const buttonText = match[3] || 'Open Form';

      // Create container div
      const container = document.createElement('div');
      container.className = 'marketo-form';
      container.dataset.formId = formId;
      container.dataset.lightbox = lightbox;
      container.dataset.buttonText = buttonText;
      container.id = `marketo-form-container-${formId}-${Date.now()}`;

      // Replace the text with the container
      const textNode = document.createTextNode(text.substring(0, match.index));
      const parent = $elem[0].parentNode;
      parent.insertBefore(textNode, $elem[0]);
      parent.insertBefore(container, $elem[0]);

      // Update text for remaining matches
      const remainingText = text.substring(match.index + match[0].length);
      $elem[0].textContent = remainingText;
    }
  });
}

export default {
  name: "embedded-marketo-forms",
  initialize() {
    withPluginApi("0.8.31", initializeMarketoForms);
  }
};
