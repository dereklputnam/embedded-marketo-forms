import { withPluginApi } from "discourse/lib/plugin-api";

function initializeMarketoForms(api) {
  const MARKETO_BASE_URL = settings.marketo_base_url || "//lp.netwrix.com";
  const MARKETO_MUNCHKIN_ID = settings.marketo_munchkin_id || "130-MAN-089";

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

  api.decorateCooked(
    ($elem) => {
      if (!$elem || !$elem[0]) {
        return;
      }

      const element = $elem[0];

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

      textNodesToProcess.forEach(textNode => {
        const text = textNode.textContent;
        regex.lastIndex = 0; // Reset regex

        let match;
        const fragments = [];
        let lastIndex = 0;

        while ((match = regex.exec(text)) !== null) {
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

      if (marketoFormElements.length === 0) return;

      // Wait for MktoForms2 to be available
      const initForms = (attempts = 0) => {
        if (typeof window.MktoForms2 !== 'undefined') {
          marketoFormElements.forEach(formContainer => {
            const formId = parseInt(formContainer.dataset.formId);
            const isLightbox = formContainer.dataset.lightbox === 'true';
            const pdfUrl = formContainer.dataset.pdfUrl;

            if (!formId || formContainer.dataset.marketoLoaded === 'true') {
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
                  // Apply text fixes to remove line breaks in subtext
                  setTimeout(() => {
                    const formEl = form.getFormElem()[0];

                    // Find all paragraph elements in the form
                    const paragraphs = formEl.querySelectorAll('p');
                    paragraphs.forEach(p => {
                      // Extract text and links
                      const links = Array.from(p.querySelectorAll('a'));
                      const textContent = p.textContent.trim();

                      // Hide the original paragraph
                      p.style.display = 'none';

                      // Create a new clean paragraph
                      const newP = document.createElement('p');
                      newP.style.cssText = p.style.cssText;
                      newP.style.display = '';

                      // Add text before the link
                      const linkMatch = textContent.match(/^(.+?)(Privacy Policy\.?)$/);
                      if (linkMatch && links.length > 0) {
                        // Add the text before the link
                        newP.appendChild(document.createTextNode(linkMatch[1]));
                        // Clone and add the link
                        const linkClone = links[0].cloneNode(true);
                        newP.appendChild(linkClone);
                        // Add period if it's not there
                        if (!linkMatch[2].endsWith('.')) {
                          newP.appendChild(document.createTextNode('.'));
                        }
                      } else {
                        // No link found, just add the text
                        newP.textContent = textContent;
                      }

                      // Insert the new paragraph after the original
                      p.parentNode.insertBefore(newP, p.nextSibling);
                    });
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
                  // Apply text fixes to remove line breaks in subtext
                  setTimeout(() => {
                    const formEl = form.getFormElem()[0];

                    // Find the privacy div specifically (not a paragraph!)
                    const privacyDiv = formEl.querySelector('#privacy');

                    if (!privacyDiv) {
                      return;
                    }

                    const elements = [privacyDiv];
                    elements.forEach((p) => {
                      // Extract text and links
                      const links = Array.from(p.querySelectorAll('a'));
                      const textContent = p.textContent.trim();

                      // Create a new clean div
                      const newP = document.createElement('div');
                      newP.id = 'privacy';
                      newP.style.cssText = p.style.cssText;
                      // Force single line display and ensure visibility
                      newP.style.display = 'block';
                      newP.style.visibility = 'visible';
                      newP.style.whiteSpace = 'nowrap';
                      newP.style.width = 'auto';
                      newP.style.minWidth = '100%';

                      // Add text before the link
                      const linkMatch = textContent.match(/^(.+?)(Privacy Policy\.?)$/);

                      if (linkMatch && links.length > 0) {
                        // Add the text before the link
                        newP.appendChild(document.createTextNode(linkMatch[1]));
                        // Clone and add the link
                        const linkClone = links[0].cloneNode(true);
                        newP.appendChild(linkClone);
                        // Add period if it's not there
                        if (!linkMatch[2].endsWith('.')) {
                          newP.appendChild(document.createTextNode('.'));
                        }
                      } else {
                        // No link found, just add the text
                        newP.textContent = textContent;
                      }

                      // Replace the original div with the new one
                      p.parentNode.replaceChild(newP, p);
                    });
                  }, 500);

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
    withPluginApi("0.8", initializeMarketoForms);
  }
};
