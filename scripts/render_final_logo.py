import subprocess
import os
from PIL import Image

# Read Final Logo.svg
with open('Final Logo.svg', 'r', encoding='utf-8') as f:
    svg_raw = f.read()

# Clean SVG tailored to exact viewBox
# The squircle bounding box in Final Logo is (209.522, 209.522, 580.955, 580.955)
# When viewBox is '209.522 209.522 580.955 580.955', the logo fills the entire frame edge-to-edge.
clean_svg = '''<svg width="100%" height="100%" viewBox="209.522 209.522 580.955 580.955" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" style="fill-rule:evenodd;clip-rule:evenodd;">
  <defs>
    <linearGradient id="_Linear2" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(562.800409,562.800409,-562.800409,562.800409,218.599796,218.599796)">
      <stop offset="0" style="stop-color:#404040;stop-opacity:1"/>
      <stop offset="1" style="stop-color:#242424;stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="_Linear3" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(295.016343,45.38713,-45.38713,295.016343,352.491828,329.798264)">
      <stop offset="0" style="stop-color:#fff;stop-opacity:1"/>
      <stop offset="1" style="stop-color:#ccc;stop-opacity:1"/>
    </linearGradient>
  </defs>
  <g>
    <path d="M658.855,218.6c67.635,0 122.545,54.911 122.545,122.545l0,317.71c0,67.635 -54.911,122.545 -122.545,122.545l-317.71,0c-67.635,0 -122.545,-54.911 -122.545,-122.545l0,-317.71c0,-67.635 54.911,-122.545 122.545,-122.545l317.71,0Z" style="fill:url(#_Linear2);stroke:#555;stroke-width:15.89px;"/>
    <g>
      <path d="M627.084,420.573c17.535,0 31.771,14.236 31.771,31.771l0,152.047c0,17.535 -14.236,31.771 -31.771,31.771l-254.168,0c-17.535,0 -31.771,-14.236 -31.771,-31.771l0,-152.047c0,-17.535 14.236,-31.771 31.771,-31.771l254.168,0Z" style="fill:#fff;"/>
      <path d="M352.492,375.185l68.081,-45.387l226.936,0l-68.081,45.387l-226.936,0Z" style="fill:url(#_Linear3);fill-rule:nonzero;"/>
      <rect x="375.185" y="375.185" width="249.629" height="22.694" style="fill:#fff;fill-rule:nonzero;"/>
      <path d="M425.111,329.798l-22.694,45.387" style="fill:none;fill-rule:nonzero;stroke:#242424;stroke-width:9.08px;stroke-linecap:round;"/>
      <path d="M493.192,329.798l-22.694,45.387" style="fill:none;fill-rule:nonzero;stroke:#242424;stroke-width:9.08px;stroke-linecap:round;"/>
      <path d="M561.273,329.798l-22.694,45.387" style="fill:none;fill-rule:nonzero;stroke:#242424;stroke-width:9.08px;stroke-linecap:round;"/>
      <circle cx="500" cy="528.367" r="49.926" style="fill:#242424;"/>
      <path d="M488.653,505.673l36.31,22.694l-36.31,22.694l0,-45.387Z" style="fill:#fff;fill-rule:nonzero;"/>
    </g>
  </g>
</svg>
'''

# Save perfect-fit SVG to public/favicon.svg and public/icon.svg
with open('public/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(clean_svg)
with open('public/icon.svg', 'w', encoding='utf-8') as f:
    f.write(clean_svg)

# Create an HTML file for headless Chrome rendering
html_file = 'public/temp_render.html'
with open(html_file, 'w', encoding='utf-8') as f:
    f.write(f'''<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  html, body {{ width: 512px; height: 512px; background: transparent; overflow: hidden; }}
  svg {{ width: 512px; height: 512px; display: block; }}
</style>
</head>
<body>
{clean_svg}
</body>
</html>''')

# Render 512x512 with Chrome
chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
temp_png = os.path.abspath('public/temp_512.png')
html_abs = os.path.abspath(html_file)

cmd = [
    chrome_path,
    '--headless=new',
    f'--screenshot={temp_png}',
    '--window-size=512,512',
    '--default-background-color=00000000',
    f'file:///{html_abs.replace(os.sep, "/")}'
]

subprocess.run(cmd, check=True)
print('Chrome rendered 512x512 successfully!')

# Load rendered 512x512
im = Image.open(temp_png)

# Verify bounding box
bbox = im.getbbox()
print('Bounding box in 512x512:', bbox)

# Save app_logo_icon and icon-512
im.save('public/app_logo_icon.png', 'PNG')
im.save('public/icon-512.png', 'PNG')

# Resize with high-quality Lanczos resampling
im.resize((192, 192), Image.Resampling.LANCZOS).save('public/icon-192.png', 'PNG')
im.resize((192, 192), Image.Resampling.LANCZOS).save('public/favicon.png', 'PNG')
im.resize((96, 96), Image.Resampling.LANCZOS).save('public/favicon-96x96.png', 'PNG')
im.resize((48, 48), Image.Resampling.LANCZOS).save('public/favicon-48x48.png', 'PNG')
im.resize((32, 32), Image.Resampling.LANCZOS).save('public/favicon-32x32.png', 'PNG')
im.resize((16, 16), Image.Resampling.LANCZOS).save('public/favicon-16x16.png', 'PNG')
im.resize((180, 180), Image.Resampling.LANCZOS).save('public/apple-touch-icon.png', 'PNG')

# Save multi-res binary ICO
im.save('public/favicon.ico', format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

# Clean up temp files
if os.path.exists(html_file): os.remove(html_file)
if os.path.exists(temp_png): os.remove(temp_png)
print('All icons generated from Final Logo.svg successfully!')
