# Lazy VIT

Lazy VIT is a lightweight browser extension that solves VIT Chennai captchas and adds quick navigation buttons for faster use of VTOP.

## What it Does

### Auto Captcha
- Automatically reads and fills the captcha on VTOP (Chennai).
- Uses fixed and working model weights.
- No data is sent anywhere.
- Based on the original VtopCaptchaSolver3.0 but cleaned and simplified.

### Navigation Buttons
Adds easy shortcuts to commonly used VTOP pages:
- Attendance
- Marks
- Grade View
- Academic Calendar

### Cleaner View
Unnecessary elements from the webpage are removed to give a simpler and less cluttered VTOP interface.

## Captcha Supported Websites
Works only on VIT Chennai websites:
- `vtopcc.vit.ac.in`
- `vtopregcc.vit.ac.in` (captcha accuracy slightly lower)

## How to Install
1. Download or clone this repository.  
2. Open your browser’s extensions page:  
   - Chrome/Edge: `chrome://extensions`
3. Enable **Developer Mode**.  
4. Click **Load unpacked**.  
5. Select the folder of this extension.

The extension will:
- Auto-solve captchas  
- Add quick navigation buttons  
- Clean up the page view  

## Credits
- Original project: **VtopCaptchaSolver3.0** by *Pratyush*  
- Original repository: https://github.com/pratyush3124/VtopCaptchaSolver3.0  
- This version modifies the structure, fixes model issues, removes data-sending code, limits support to Chennai campus, and simplifies the overall UI.