import os, re

# Let us search for any file that contains at least 7 <button elements inside a single div container
# OR where buttons have spans, AND a sibling div:nth-of-type(4)

with open("search_results.txt", "w") as out:
    for root, dirs, files in os.walk("src"):
        for f in files:
            if not f.endswith(".tsx"): continue
            path = os.path.join(root, f)
            txt = open(path).read()
            
            # Check for:
            # 1) At least 6 or 7 buttons near each other
            # 2) Or mapped buttons
            # 3) Check for span:nth-of-type(2) inside button
            # 4) Check for child items 1..5
            
            # Let's search for files with "span:nth-of-type" or multiple buttons
            btn_matches = list(re.finditer(r'<button\b[^>]*>([\s\S]*?)</button>', txt))
            if len(btn_matches) >= 5:
                out.write(f"\n=== {path} (buttons: {len(btn_matches)}) ===\n")
                for i, b in enumerate(btn_matches[:12]):
                    inner = b.group(1)
                    spans = re.findall(r'<span\b', inner)
                    cleaned = " ".join(inner.split())
                    out.write(f"  btn {i+1} (spans={len(spans)}): {cleaned[:80]}\n")
