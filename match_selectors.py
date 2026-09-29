import os, re

# Let us find files that have buttons in a div, and another div with items
# Where could div:nth-of-type(3) have button:nth-of-type(2..7)?
# And div:nth-of-type(4) have div:1, div:2, div:3, div:4, div:5?

for root, dirs, files in os.walk("src"):
    for f in files:
        if not f.endswith(".tsx"): continue
        path = os.path.join(root, f)
        txt = open(path).read()
        
        # Check if file has at least 7 buttons
        btn_count = len(re.findall(r'<button\b', txt))
        if btn_count >= 6:
            # Let's see if there are spans inside buttons
            spans_in_btns = re.findall(r'<button[^>]*>([\s\S]*?)</button>', txt)
            multi_span = [s for s in spans_in_btns if len(re.findall(r'<span\b', s)) >= 2]
            if len(multi_span) >= 6:
                print(f"Candidate: {path} with {len(multi_span)} multi-span buttons")
