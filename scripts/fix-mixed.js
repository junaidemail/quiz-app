const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(path.join(__dirname, '..', 'public', 'data', 'questions.json'), 'utf8');
let data = raw;
if (raw.charCodeAt(0) === 0xFEFF) data = raw.slice(1);
const questions = JSON.parse(data);

// Fix mixed formula+English options to only wrap the formula part
const fixMixed = {
  // Chapter 17
  "a1_q866": { A: "\\(lim_{T\u2192\u221e}\\) (Fourier series)" },
  "a1_q872": { A: "\\(F(\u03c9)\\) the Fourier transform" },
  "a1_q884": { A: "\\(F(s) = (1 - e^{-s\u03c4})/s\\), relates to sinc" },
  "a1_q889": { A: "\\(Re{s} = 0\\) (imaginary axis)" },
  "a1_q893": { A: "Lines become \\(\\delta\\)-function impulses" },
  "a1_q900": { A: "\\(F(\u03c9-\u03c90)\\) frequency translation" },
  "a1_q906": { A: "Phase shift is linear: \\(-\u03c9t0\\)" },
  "a1_q911": { A: "\\(F(\u03c9)*G(\u03c9)/(2\u03c0)\\) (convolution in frequency)" },
  "a1_q918": { A: "\\(V_{out}/V_{in}\\) = frequency response" },
  "a1_q919": { A: "\\(H(j\u03c9)\\) times input phasor" },
  "a1_q921": { A: "\\(H(j\u03c9) X(j\u03c9)\\) then inverse transform" },
  "a1_q925": { A: "\\(H(j\u03c9)\\) times input phasor" },
  "a1_q926": { A: "\\(H(j\u03c9)\\) changes with load" },
  "a1_q929": { A: "\\(\\int |H|^2 |Vi|^2\\) over the band" },
  "a1_q938": { A: "\\(V1/I1\\) with \\(I2 = 0\\) (open-circuit input impedance)" },
  "a1_q941": { A: "\\(I1/V1\\) with \\(V2 = 0\\) (short-circuit input admittance)" },
  "a1_q943": { A: "\\(V1/I1\\) with \\(V2 = 0\\) (short-circuit input impedance)" },
  "a1_q946": { A: "\\(V1/V2\\) with \\(I2 = 0\\) (open-circuit voltage ratio)" },
  "a1_q948": { A: "\\(10 \\Omega\\) (open-circuit, \\(I2 = 0\\))" },
  "a1_q953": { A: "\\(z11 = \\Delta y/y22\\), \\(z12 = -y12/\\Delta y\\), etc." },
  "a1_q960": { A: "\\(Z_{th} = z22 - (z12 z21)/(z11 + R_g)\\) with input shorted" },
  "a1_q966": { A: "\\(Z_L = Z_{th}^*\\) (conjugate match)" },
  "a1_q972": { A: "\\([A_{total}] = [A1][A2]\\) (matrix multiplication)" },
  "a1_q973": { A: "\\(a11 = A1 A2 + B1 C2\\) (from matrix product)" },
  "a1_q980": { A: "\\(z_{total} = z1 + z2\\) (series z-parameters)" },
  "a1_q988": { A: "Ports short-circuited (\\(V = 0\\))" },
  "a1_q992": { A: "Yes, Eq. 18.49 gives \\(Z_{in} = z11 - z12z21/(z22+ZL)\\)" },
  "a1_q1012": { A: "\\(Z_{ref} = (\u03c9M)^2 / (R2 + j\u03c9L2 + Z_L)\\)" },
  "a1_q1016": { A: "\\(V2/V1 = n2/n1 = a\\) (turns ratio)" },
  "a1_q1022": { A: "\\(P1 = P2\\) (ideal, no losses)" },
  "a1_q1027": { A: "The T-equivalent simplifies when \\(k = 1\\) or \\(M = \\sqrt(L1L2)\\)" },
  "a1_q1029": { A: "\\(k = \\sqrt(V2/V1)\\) measured ratio" },
  "a1_q1032": { A: "\\(Z_{ref} = (\u03c9M)^2 / (Z_{22})\\) reflected impedance" },
  "a1_q1033": { A: "Mutual term \\(\\pm M i1 i2\\) appears in stored energy" },
  "a1_q1040": { A: "\\(Z_{in} = Z_L / a^2\\) reflected to primary" },
  "a1_q1042": { A: "\\(M/L1 = V2/V1\\) with secondary open-circuit" },
  "a1_q1048": { A: "\\(P_{in} = P_{out}\\) (ideal transformer)" },
};

let fixed = 0;
questions.forEach(q => {
  if (fixMixed[q.id]) {
    const opts = fixMixed[q.id];
    for (const [k, v] of Object.entries(opts)) {
      q.options[k] = v;
      fixed++;
    }
  }
});

console.log(`Fixed ${fixed} mixed options`);

const output = JSON.stringify(questions);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'data', 'questions.json'), output, 'utf8');
console.log('Written questions.json');
