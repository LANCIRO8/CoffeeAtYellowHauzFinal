import os, re

for root, dirs, files in os.walk("src"):
    for f in files:
        if not f.endswith(".tsx"): continue
        path = os.path.join(root, f)
        txt = open(path).read()
        
        # Look for .map( ... => ( ... <button
        matches = re.finditer(r'(\w+)\.map\s*\([^=]*=>\s*(?:\([^<]*)?<button[^>]*>([\s\S]*?)</button>', txt)
        for m in matches:
            arr_name = m.group(1)
            btn_body = m.group(2)
            spans = re.findall(r'<span\b', btn_body)
            if len(spans) >= 2:
                print(f"{path}: mapped array '{arr_name}' renders button with {len(spans)} spans")
