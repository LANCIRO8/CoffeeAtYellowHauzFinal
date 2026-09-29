const ts = require('typescript');
const fs = require('fs');

function inspectFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  function walk(node) {
    if (ts.isJsxElement(node)) {
      const opening = node.openingElement;
      const tag = opening.tagName.getText(sourceFile);
      const attrs = opening.attributes.getText(sourceFile);
      if (tag === 'div' && attrs.includes('space-y-12')) {
        console.log('FOUND ROOT space-y-12 in', filePath);
        let divIdx = 0;
        let allIdx = 0;
        node.children.forEach(child => {
          if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child)) {
            allIdx++;
            const cTag = (child.openingElement || child).tagName.getText(sourceFile);
            const cAttrs = (child.openingElement || child).attributes.getText(sourceFile);
            const line = sourceFile.getLineAndCharacterOfPosition(child.getStart(sourceFile)).line + 1;
            if (cTag === 'div') {
              divIdx++;
              console.log(`DIV #${divIdx} (all #${allIdx}) at line ${line}:`, cAttrs.slice(0, 100));
            } else {
              console.log(`Other tag <${cTag}> (all #${allIdx}) at line ${line}`);
            }
          }
        });
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
}

inspectFile('src/components/customer/CustomerHome.tsx');
