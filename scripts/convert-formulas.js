const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'public', 'data', 'questions.json');
let raw = fs.readFileSync(filePath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);

const questions = JSON.parse(raw);

// Step 1: Strip all \( and \) from parsed strings
questions.forEach(q => {
  q.question = q.question.replace(/\\\(/g, '').replace(/\\\)/g, '');
  ['A', 'B', 'C', 'D'].forEach(k => {
    q.options[k] = q.options[k].replace(/\\\(/g, '').replace(/\\\)/g, '');
  });
  if (q.explanation) {
    q.explanation = q.explanation.replace(/\\\(/g, '').replace(/\\\)/g, '');
  }
});

// Step 2: Re-wrap formulas more intelligently
function isFormula(s) {
  const t = s.trim();
  if (!t || t.length < 2) return false;
  // Skip known English-only options
  // Quick English-only filter
  if (/^[A-Za-z][A-Za-z\s.\-′/:,\d()]*$/i.test(t) && !/[=+<>&|{}∫∑∏√∞πωΩθλφµΔαβγδε]/.test(t)) return false;
  const labels = new Set([
    'power','voltage','current','energy','common ground','passive sign',
    'series t →∞','discrete','continuous','freq content','time amp',
    'phase only','periodic only','aperiodic','digital','direct integ',
    'series','rms','rect','const','exp','tri','gauss','impulse',
    'zero','infinite','all','no','yes','both valid','none',
    'amp/t-line model','filter only','power','dc',
    'analysis simplify','measure','design',
    'cascade/modular','single','meas','sim','open','short','load','term',
    'transistor amp','z mult','y add','node analysis','mesh analysis',
    'y1+y2','z1+z2','port2 → port1','port1 → 2','bidirect',
    'convert sets','calc','matrix mult','add','prod','sum',
    'mult a-matrices','mult matrices easy','complex','meas only','from deltas',
    'from wye','a casc','h hybrid','char unknown',
    'known','modular p.678','max pwr formula','zth conj',
    'yes z-params','no','amplifier','active','lossless','lossy',
    'delay','adv','scale','rev','conj','shift','diff','int',
    'all aper','y-admit','h-hybrid','a-trans','z-imped','short port',
    'admit','curr gain','output','ratio v','reverse a',
  ]);
  if (labels.has(t.toLowerCase().replace(/\s+/g, ' ').trim())) return false;
  if (t.toLowerCase().startsWith('none') || t.toLowerCase().startsWith('num ')) return false;

  let score = 0;
  if (/[=+×·±→⇒≤≥≠≈]/.test(t)) score += 2;
  if (/[∫∑∏√∞∝⊥∠]/.test(t)) score += 3;
  if (/[πωΩθλφµΔαβγδε]/.test(t)) score += 2;
  if (/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/.test(t)) score += 2;
  if (/[₀₁₂₃₄₅₆₇₈₉]/.test(t)) score += 2;
  if (/[A-Za-z]\d+\s*[=+\-]/.test(t)) score += 1;
  if (t.includes('=') && t.length < 60) score += 1;
  if (t.length <= 3 && /\d/.test(t)) score += 1;
  if (/[|]/.test(t) && /[A-Za-z]/.test(t)) score += 1; // absolute values like |Vth|^2
  // Detect function notation like f(t), F(ω)
  if (/[A-Za-z]\([^)]*\)/.test(t) && t.length < 30) score += 1;

  return score >= 2;
}

let fixed = 0;
questions.forEach(q => {
  ['A', 'B', 'C', 'D'].forEach(k => {
    const v = q.options[k];
    if (isFormula(v)) {
      q.options[k] = `\\(${v}\\)`;
      fixed++;
    }
  });
});

console.log(`Wrapped ${fixed} options as formulas`);

const output = JSON.stringify(questions);
fs.writeFileSync(filePath, output, 'utf8');
console.log('Written questions.json');
