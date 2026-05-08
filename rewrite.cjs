const fs = require('fs');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = require('path').join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

walkDir('src', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove dark: classes
    content = content.replace(/dark:[a-zA-Z0-9_/[\]-]+/g, '');
    
    // Replace text-white and text-black with text-[var(--color-v3-text)] etc
    content = content.replace(/text-white text-black|text-black text-white|text-black|text-white/g, 'text-[var(--color-v3-text)]');
    
    // Replace bg-black and bg-white with bg-[var(--color-v3-surface)] etc
    content = content.replace(/bg-black bg-white|bg-white bg-black|bg-black|bg-white/g, 'bg-[var(--color-v3-surface)]');

    // Remove text-zinc-500 text-sm -> keep them or replace with var? 
    content = content.replace(/text-zinc-500/g, 'text-[var(--color-v3-text-var)]');
    content = content.replace(/text-zinc-400/g, 'text-[var(--color-v3-text-var)]');
    content = content.replace(/text-zinc-300/g, 'text-[var(--color-v3-text-var)]');

    content = content.replace(/border-black\/10/g, 'border-[var(--color-v3-outline)]');
    content = content.replace(/border-white\/10/g, 'border-[var(--color-v3-outline)]');
    content = content.replace(/border-black\/20/g, 'border-[var(--color-v3-outline)]');
    content = content.replace(/border-white\/20/g, 'border-[var(--color-v3-outline)]');

    content = content.replace(/bg-black\/5/g, 'bg-[var(--color-v3-surface-container)]');
    content = content.replace(/bg-white\/5/g, 'bg-[var(--color-v3-surface-container)]');
    content = content.replace(/bg-zinc-100/g, 'bg-[var(--color-v3-surface-container)]');
    content = content.replace(/bg-zinc-900/g, 'bg-[var(--color-v3-surface-container)]');

    content = content.replace(/hover:bg-black\/5/g, 'hover:bg-[var(--color-v3-hover)]');
    content = content.replace(/hover:bg-white\/5/g, 'hover:bg-[var(--color-v3-hover)]');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});
console.log("Done mapping colors!");
