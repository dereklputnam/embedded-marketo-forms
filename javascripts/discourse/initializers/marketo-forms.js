import { withPluginApi } from "discourse/lib/plugin-api";

function initializeMarketoForms(api) {
  const MARKETO_BASE_URL = "//lp.netwrix.com";
  const MARKETO_MUNCHKIN_ID = "130-MAN-089";

  // Helper function to resolve Discourse upload:// URLs to full public URLs
  function resolveUploadUrl(url) {
    if (!url) return url;

    // If it's already a full URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url;
    }

    // If it's a Discourse upload:// short URL, convert to full URL
    if (url.startsWith('upload://')) {
      const hash = url.replace('upload://', '');
      // Discourse stores uploads in /uploads/short-url/{hash}
      return `/uploads/short-url/${hash}`;
    }

    // If it's already a relative path, return as-is
    if (url.startsWith('/')) {
      return url;
    }

    // Otherwise, assume it's a relative path and prepend /
    return `/${url}`;
  }

  // Helper function to show PDF download link after form submission
  function showPdfDownload(container, pdfUrl) {
    container.innerHTML = '';

    const successDiv = document.createElement('div');
    successDiv.className = 'marketo-form-success';

    const successMessage = document.createElement('p');
    successMessage.className = 'marketo-success-message';
    successMessage.textContent = 'Thank you! Your download is ready.';

    const downloadButton = document.createElement('a');
    downloadButton.href = resolveUploadUrl(pdfUrl);
    downloadButton.className = 'btn btn-primary marketo-download-button';
    downloadButton.textContent = 'Download PDF';
    downloadButton.target = '_blank';
    downloadButton.rel = 'noopener noreferrer';
    downloadButton.download = '';

    successDiv.appendChild(successMessage);
    successDiv.appendChild(downloadButton);
    container.appendChild(successDiv);
  }

  console.log('[Marketo Forms] decorateCooked registered');

  api.decorateCooked(
    ($elem) => {
      console.log('[Marketo Forms] decorateCooked called', $elem);

      if (!$elem || !$elem[0]) {
        console.log('[Marketo Forms] No element found, returning');
        return;
      }

      const element = $elem[0];
      console.log('[Marketo Forms] Processing element:', element.innerHTML);

      // First, parse BBCode-style tags [marketo-form id=1309]
      // Support both regular quotes and HTML-encoded quotes, and optional quotes around values
      const regex = /\[marketo-form\s+id=(\d+)(?:\s+lightbox=(true|false))?(?:\s+button=(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?(?:\s+pdf=(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?\]/gi;

      // Search for the pattern in all text nodes
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );

      const textNodesToProcess = [];
      let node;
      while (node = walker.nextNode()) {
        if (regex.test(node.textContent)) {
          textNodesToProcess.push(node);
        }
        regex.lastIndex = 0; // Reset regex
      }

      console.log('[Marketo Forms] Found text nodes to process:', textNodesToProcess.length);

      textNodesToProcess.forEach(textNode => {
        const text = textNode.textContent;
        regex.lastIndex = 0; // Reset regex

        let match;
        const fragments = [];
        let lastIndex = 0;

        while ((match = regex.exec(text)) !== null) {
          console.log('[Marketo Forms] Found match:', match);

          const formId = match[1];
          const lightbox = match[2] === 'true';
          // Button text can be in match[3] (double quotes), match[4] (single quotes), or match[5] (no quotes)
          const buttonText = match[3] || match[4] || match[5] || 'Open Form';
          // PDF URL can be in match[6] (double quotes), match[7] (single quotes), or match[8] (no quotes)
          const pdfUrl = match[6] || match[7] || match[8] || '';

          // Add text before the match
          if (match.index > lastIndex) {
            fragments.push(document.createTextNode(text.substring(lastIndex, match.index)));
          }

          // Create container div
          const container = document.createElement('div');
          container.className = 'marketo-form';
          container.dataset.formId = formId;
          container.dataset.lightbox = lightbox;
          container.dataset.buttonText = buttonText;
          container.dataset.pdfUrl = pdfUrl;
          container.id = `marketo-form-container-${formId}-${Date.now()}`;

          console.log('[Marketo Forms] Created container for form:', formId, 'with PDF:', pdfUrl);

          fragments.push(container);
          lastIndex = regex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < text.length) {
          fragments.push(document.createTextNode(text.substring(lastIndex)));
        }

        // Replace the text node with fragments
        if (fragments.length > 0) {
          const parent = textNode.parentNode;
          fragments.forEach(fragment => {
            parent.insertBefore(fragment, textNode);
          });
          parent.removeChild(textNode);
        }
      });

      // Now find and initialize all marketo-form elements
      const marketoFormElements = element.querySelectorAll('.marketo-form');

      console.log('[Marketo Forms] Found form elements:', marketoFormElements.length);

      if (marketoFormElements.length === 0) return;

      // Wait for MktoForms2 to be available
      const initForms = (attempts = 0) => {
        if (typeof window.MktoForms2 !== 'undefined') {
          console.log('[Marketo Forms] MktoForms2 library loaded, initializing forms');
          marketoFormElements.forEach(formContainer => {
            const formId = parseInt(formContainer.dataset.formId);
            const isLightbox = formContainer.dataset.lightbox === 'true';
            const pdfUrl = formContainer.dataset.pdfUrl;

            console.log('[Marketo Forms] Processing form:', formId, 'lightbox:', isLightbox, 'pdf:', pdfUrl);

            if (!formId || formContainer.dataset.marketoLoaded === 'true') {
              console.log('[Marketo Forms] Skipping form (no ID or already loaded)');
              return;
            }

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
                  console.log('[Marketo Forms] Lightbox form loaded, applying spacing fixes');

                  // Apply spacing fixes directly to the form elements
                  setTimeout(() => {
                    const formEl = form.getFormElem()[0];
                    const buttonRow = formEl.querySelector('.mktoButtonRow');
                    const lastRow = formEl.querySelector('.mktoFormRow:last-of-type');

                    if (buttonRow) {
                      console.log('[Marketo Forms] Found lightbox button row, applying styles');
                      buttonRow.style.marginTop = '0';
                      buttonRow.style.paddingTop = '0';
                    }

                    if (lastRow) {
                      console.log('[Marketo Forms] Found lightbox last form row, applying styles');
                      lastRow.style.marginBottom = '0';
                      lastRow.style.paddingBottom = '0';
                    }
                  }, 100);

                  // Add PDF download handler if PDF URL is provided
                  const pdfUrl = formContainer.dataset.pdfUrl;
                  if (pdfUrl) {
                    form.onSuccess(function(values, followUpUrl) {
                      // Hide the lightbox
                      window.MktoForms2.lightbox(form).hide();

                      // Show success message with download link
                      showPdfDownload(formContainer, pdfUrl);

                      // Prevent default redirect
                      return false;
                    });
                  }

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
                formId,
                function(form) {
                  console.log('[Marketo Forms] Form loaded, applying spacing fixes');

                  // Apply spacing fixes directly to the form elements
                  setTimeout(() => {
                    const formEl = form.getFormElem()[0];
                    const buttonRow = formEl.querySelector('.mktoButtonRow');
                    const lastRow = formEl.querySelector('.mktoFormRow:last-of-type');

                    if (buttonRow) {
                      console.log('[Marketo Forms] Found button row, applying styles');
                      buttonRow.style.marginTop = '0';
                      buttonRow.style.paddingTop = '0';
                    }

                    if (lastRow) {
                      console.log('[Marketo Forms] Found last form row, applying styles');
                      lastRow.style.marginBottom = '0';
                      lastRow.style.paddingBottom = '0';
                    }
                  }, 100);

                  // Add PDF download handler if PDF URL is provided
                  const pdfUrl = formContainer.dataset.pdfUrl;
                  if (pdfUrl) {
                    form.onSuccess(function(values, followUpUrl) {
                      // Show success message with download link
                      showPdfDownload(formContainer, pdfUrl);

                      // Prevent default redirect
                      return false;
                    });
                  }
                }
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
    console.log('[Marketo Forms] Initializer starting');
    withPluginApi("0.8", initializeMarketoForms);
  }
};
