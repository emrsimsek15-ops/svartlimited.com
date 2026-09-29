"""Copies NEAR's privacy policy, verbatim, from the NEAR repo into the site.

The source of truth is Travel AI/docs/PRIVACY.md, rendered by the NEAR backend into
backend/src/config/privacyPage.ts. The only changes made here: the publisher line with
our registered address, and the internal note addressed to the founder is dropped.
Run: python3 _build/sync_privacy.py && python3 _build/build.py
"""
import json, os, re

NEAR = os.path.expanduser('~/Downloads/Travel AI/backend/src/config/privacyPage.ts')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pages', 'near', 'privacy.html')

src = open(NEAR).read()
page = json.loads(re.search(r'export const PRIVACY_HTML = (".*?");\n', src, re.S).group(1))
body = page[page.index('<h1>'):page.index('</main>')]
body = re.sub(r'<hr>\s*<p><em>This policy describes.*?</em></p>\s*$', '', body, flags=re.S)
marker = '<p>Questions about this policy: <strong>'
assert marker in body, 'contact paragraph changed; update this script'
body = body.replace(marker, '<p>NEAR is published by <strong>Svart Limited</strong>, {{ADDRESS}}.</p>\n' + marker, 1)
head = ('<!--title: NEAR Privacy Policy | Svart Limited-->\n'
        '<!--desc: How NEAR, the audio walking guide by Svart Limited, handles location, microphone and your data.-->\n')
open(OUT, 'w').write(head + '<div class="doc"><div class="wrap narrow">\n' + body.strip() + '\n</div></div>\n')
print('synced from', NEAR)
