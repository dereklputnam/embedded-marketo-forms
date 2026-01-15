import { withPluginApi } from "discourse/lib/plugin-api";

function initializeMarketoForms(api) {
  const MARKETO_BASE_URL = "//lp.netwrix.com";
  const MARKETO_MUNCHKIN_ID = "130-MAN-089";

  api.decorateCooked(
    ($elem) => {
      if (!$elem || !$elem[0]) return;

      const element = $elem[0];

      // First, parse BBCode-style tags [marketo-form id=1309]
      const paragraphs = element.querySelectorAll('p');
      paragraphs.forEach(p => {
        const text = p.textContent || '';
        const regex = /\[marketo-form\s+id=(\d+)(?:\s+lightbox=(true|false))?(?:\s+button="([^"]*)")?\]/g;

        let match = regex.exec(text);
        if (match) {
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

          // Replace the paragraph with the container
          p.replaceWith(container);
        }
      });

      // Now find and initialize all marketo-form elements
      const marketoFormElements = element.querySelectorAll('.marketo-form');

      if (marketoFormElements.length === 0) return;

      // Wait for MktoForms2 to be available
      const initForms = (attempts = 0) => {
        if (typeof window.MktoForms2 !== 'undefined') {
          marketoFormElements.forEach(formContainer => {
            const formId = parseInt(formContainer.dataset.formId);
            const isLightbox = formContainer.dataset.lightbox === 'true';

            if (!formId || formContainer.dataset.marketoLoaded === 'true') return;

            // Create form container if it doesn't exist
            if (!formContainer.querySelector('form')) {
              const formElement = document.createElement('form');
              formElement.id = `mktoForm_${formId}`;
              formContainer.appendChild(formElement);
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
                  button.textContent = formContainer.dataset.buttonText || 'Open Form';
                  button.className = 'btn btn-primary marketo-lightbox-trigger';
                  button.onclick = function(e) {
                    e.preventDefault();
                    window.MktoForms2.lightbox(form).show();
                  };

                  // Clear the container and add the button
                  formContainer.innerHTML = '';
                  formContainer.appendChild(button);
                  formContainer.dataset.marketoLoaded = 'true';
                }
              );
            } else {
              window.MktoForms2.loadForm(
                MARKETO_BASE_URL,
                MARKETO_MUNCHKIN_ID,
                formId
              );
              formContainer.dataset.marketoLoaded = 'true';
            }
          });
        } else if (attempts < 50) {
          // Retry up to 50 times (5 seconds total)
          setTimeout(() => initForms(attempts + 1), 100);
        } else {
          console.error('Marketo Forms 2.0 library failed to load');
          marketoFormElements.forEach(formContainer => {
            formContainer.innerHTML = '<p class="error">Error: Marketo Forms library failed to load</p>';
          });
        }
      };

      initForms();
    },
    { id: "marketo-forms-init" }
  );
}

export default {
  name: "embedded-marketo-forms",
  initialize() {
    withPluginApi("0.8.31", initializeMarketoForms);
  }
};
