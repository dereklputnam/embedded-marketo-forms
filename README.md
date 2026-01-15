# Embedded Marketo Forms for Discourse

A Discourse theme component that allows you to embed Marketo forms anywhere in your community using a simple BBCode-style syntax.

## Features

- Embed multiple Marketo forms with different IDs
- Support for both inline embedded forms and lightbox popup forms
- PDF gating: Exchange form submission for PDF downloads
- Automatic Marketo tracking and cookie management
- Simple BBCode-style syntax
- Automatic Marketo Forms 2.0 library loading
- Configurable Marketo instance settings

## Installation

1. Go to your Discourse Admin Panel
2. Navigate to Customize > Themes
3. Click "Install" and choose "From a git repository"
4. Enter the repository URL: `https://github.com/dereklputnam/embedded-marketo-forms`
5. Click "Install"
6. Add the component to your active theme

## Configuration

After installation, you can configure the component settings:

1. Go to Customize > Themes
2. Click on your theme
3. Find the "embedded-marketo-forms" component
4. Click "Edit CSS/HTML" and then "Settings"

**Available Settings:**
- **marketo_base_url**: Your Marketo instance base URL (default: `//lp.netwrix.com`)
- **marketo_munchkin_id**: Your Marketo Munchkin ID (default: `130-MAN-089`)

## Usage

### Embedded Form (Inline)

To embed a form directly in a post or topic:

```
[marketo-form id=1309]
```

This will render the form with ID 1309 directly in the content.

### Lightbox Form (Popup)

To create a button that opens a form in a lightbox popup:

```
[marketo-form id=1309 lightbox=true]
```

This will create a button that, when clicked, opens the form in a modal popup.

### Custom Button Text for Lightbox

You can customize the button text:

```
[marketo-form id=1309 lightbox=true button="Download Whitepaper"]
```

### PDF Gating (Exchange Form for Download)

To gate a PDF behind a form submission, add the `pdf` parameter with the URL to your PDF:

```
[marketo-form id=1309 pdf="https://example.com/whitepaper.pdf"]
```

When the user submits the form:
1. Marketo tracks the submission and adds tracking cookies
2. The form is replaced with a success message and download button
3. The user can download the PDF

This works with both embedded and lightbox forms:

```
[marketo-form id=1309 lightbox=true button="Get the Guide" pdf="https://example.com/guide.pdf"]
```

## Examples

### Example 1: Simple Embedded Form

```
Check out our newsletter signup form below:

[marketo-form id=1309]
```

### Example 2: Multiple Forms in One Post

```
Here are our different resources:

Newsletter signup:
[marketo-form id=1309]

Whitepaper download:
[marketo-form id=1310 lightbox=true button="Get the Whitepaper"]

Contact us:
[marketo-form id=1311]
```

### Example 3: Lightbox with Custom Text

```
Want to learn more?

[marketo-form id=1309 lightbox=true button="Request a Demo"]
```

### Example 4: PDF Gating

```
Download our comprehensive security guide:

[marketo-form id=1309 pdf="https://cdn.example.com/security-guide-2024.pdf"]
```

### Example 5: Lightbox with PDF Gate

```
Get instant access to our whitepaper:

[marketo-form id=1310 lightbox=true button="Download Now" pdf="https://cdn.example.com/whitepaper.pdf"]
```

## How It Works

1. The component loads the Marketo Forms 2.0 library in the page header
2. When a post is rendered, it searches for `[marketo-form]` tags
3. Each tag is replaced with a form container
4. The Marketo form is initialized with the specified form ID
5. For lightbox forms, a button is created that triggers the popup
6. When a form with a PDF parameter is submitted:
   - Marketo processes the submission and adds tracking cookies
   - The `onSuccess` callback intercepts the default redirect
   - The form is replaced with a success message and download button
   - The user can click to download the PDF

## Troubleshooting

### Forms not loading

1. Check that the Marketo Forms 2.0 library is loading correctly (check browser console)
2. Verify your Marketo base URL and Munchkin ID in the theme settings
3. Ensure the form ID exists in your Marketo instance
4. Check that your Marketo instance allows embedding on your Discourse domain

### Forms appearing multiple times

This can happen if the post is re-rendered. The component includes protection against duplicate loading, but if you see this issue, try refreshing the page.

### Styling issues

The forms will inherit your theme's styling. You can add custom CSS in the theme component's "Common" CSS section to style the forms:

```css
.marketo-form {
  margin: 20px 0;
}

.marketo-lightbox-trigger {
  /* Custom button styles */
}

#mktoForm_1309 {
  /* Styles for specific form ID */
}
```

## Support

If you encounter any issues, please open an issue on the [GitHub repository](https://github.com/dereklputnam/embedded-marketo-forms/issues).

## License

MIT License
